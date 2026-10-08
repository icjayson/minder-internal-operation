"use client";

import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KanbanIcon, ListIcon, PlusIcon } from "lucide-react";

import { PageHeader } from "@/app/components/page-header";
import { SearchInput } from "@/app/components/controls";
import { TodoBoard } from "@/app/components/todos/todo-board";
import { TodoCommand } from "@/app/components/todos/todo-command";
import {
  EMPTY_DRAFT,
  TodoDetailSheet,
  type TodoDraft,
} from "@/app/components/todos/todo-detail-sheet";
import { TodoList } from "@/app/components/todos/todo-list";
import { TodoRail } from "@/app/components/todos/todo-rail";
import { Alert, AlertDescription, AlertTitle } from "@/design-system/components/alert";
import { Button } from "@/design-system/components/button";
import { Skeleton } from "@/design-system/components/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/design-system/components/toggle-group";
import {
  compareTodos,
  doneBuckets,
  groupForView,
  matchesSearch,
  matchesSmartView,
} from "@/lib/todo-query";
import {
  SMART_VIEWS,
  isActive,
  isFinished,
  isLayout,
  isSmartView,
  type SmartView,
  type Todo,
  type TodoLayout,
} from "@/lib/todo-types";
import { useTodos } from "@/lib/todos-store";

function TodosInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { todos, projects, today, error } = useTodos();

  const [search, setSearch] = useState("");
  const [openTodo, setOpenTodo] = useState<Todo | null>(null);
  /** Non-null while the setup panel is open for a task that does not exist yet. */
  const [newDraft, setNewDraft] = useState<TodoDraft | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // The URL owns which lens and layout are showing, so a view survives a
  // reload and is linkable.
  const projectId = params.get("project");
  const viewParam = params.get("view");
  const view: SmartView | null = projectId
    ? null
    : isSmartView(viewParam)
      ? viewParam
      : "today";
  const layoutParam = params.get("layout");
  const layout: TodoLayout = isLayout(layoutParam) ? layoutParam : "list";

  const go = useCallback(
    (next: Record<string, string>) => {
      const query = new URLSearchParams({ layout, ...next });
      router.replace(`/todos?${query}`, { scroll: false });
    },
    [router, layout],
  );
  const selectView = useCallback((next: SmartView) => go({ view: next }), [go]);
  const selectProject = useCallback((id: string) => go({ project: id }), [go]);
  const selectLayout = useCallback(
    (next: TodoLayout) => {
      const query = new URLSearchParams({ layout: next });
      if (projectId) query.set("project", projectId);
      else if (view) query.set("view", view);
      router.replace(`/todos?${query}`, { scroll: false });
    },
    [router, projectId, view],
  );

  const project = (projects ?? []).find((p) => p.id === projectId) ?? null;

  /**
   * Open the setup panel for a brand-new task. In a project view it is filed
   * there by default, which is the only thing the current lens implies.
   */
  const openSetup = useCallback(() => {
    setOpenTodo(null);
    setNewDraft({ ...EMPTY_DRAFT, project_id: projectId });
  }, [projectId]);

  /** Everything in scope for the current lens, before the status split. */
  const inScope = useMemo(() => {
    if (!todos) return [];
    const searched = todos.filter((t) => matchesSearch(t, search));
    if (projectId) return searched.filter((t) => t.project_id === projectId);
    return searched;
  }, [todos, search, projectId]);

  // Open and pending together: both are unfinished, so both answer the lens.
  // They split only for display — their own board column and list section.
  const activeTasks = useMemo(
    () =>
      projectId
        ? inScope.filter((t) => isActive(t.status)).sort(compareTodos)
        : inScope.filter((t) => matchesSmartView(t, view!, today)),
    [inScope, projectId, view, today],
  );
  const openTasks = useMemo(
    () => activeTasks.filter((t) => t.status === "open"),
    [activeTasks],
  );
  const pendingTasks = useMemo(
    () => activeTasks.filter((t) => t.status === "pending"),
    [activeTasks],
  );

  // Every completed task in scope — nothing is hidden by age. `doneBuckets`
  // groups them into this week / earlier weeks / months / years.
  const doneTasks = useMemo(
    () => inScope.filter((t) => isFinished(t.status)),
    [inScope],
  );

  const groups = useMemo(
    () => groupForView(openTasks, view, today),
    [openTasks, view, today],
  );

  // Shared by both views, so the list and the board can never disagree about
  // how finished work is grouped.
  const doneSections = useMemo(() => doneBuckets(doneTasks, today), [doneTasks, today]);

  const meta = SMART_VIEWS.find((v) => v.key === view);
  const title = project ? project.name : (meta?.label ?? "Today");
  const subtitle = project ? "Everything filed under this project" : meta?.hint;

  // Manual drag order only means something where the order is not derived from
  // a date, so Upcoming is not reorderable.
  const reorderable = projectId != null || view === "today" || view === "all";

  const [emptyTitle, emptyDescription] = search.trim()
    ? (["No matches", "Nothing here matches that search."] as const)
    : project
      ? (["No tasks yet", "“Add task…” creates one in this project."] as const)
      : view === "upcoming"
        ? (["Nothing scheduled", "Tasks due in the next two weeks show up here."] as const)
        : view === "overdue"
          ? (["Nothing overdue", "Everything with a due date is still on time."] as const)
          : (["Nothing to do", "Use “Add task…” to create one."] as const);

  return (
    <>
      {/* No metric tiles: the rail already carries a live count per view, and
          repeating them above the fold was four cards saying the same thing. */}
      <PageHeader
        eyebrow="To-dos · live"
        title={title}
        subtitle={subtitle}
        bordered={false}
        right={
          <>
            <span>{todos ? activeTasks.length : "—"}</span>
            <span className="opacity-50">open</span>
          </>
        }
      />

      <div className="px-4 py-5 sm:px-6 lg:px-8">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Could not reach the database</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-6 lg:flex-row">
          <TodoRail
            view={view}
            projectId={projectId}
            onSelectView={selectView}
            onSelectProject={selectProject}
          />

          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-48 flex-1 sm:max-w-sm">
                <SearchInput
                  ref={searchRef}
                  value={search}
                  onChange={setSearch}
                  placeholder="Search tasks and descriptions…"
                />
              </div>
              <ToggleGroup
                className="ml-auto"
                type="single"
                value={layout}
                onValueChange={(value) => isLayout(value) && selectLayout(value)}
                variant="outline"
              >
                <ToggleGroupItem value="list" aria-label="List view">
                  <ListIcon />
                  List
                </ToggleGroupItem>
                <ToggleGroupItem value="board" aria-label="Kanban view">
                  <KanbanIcon />
                  Kanban
                </ToggleGroupItem>
              </ToggleGroup>
              {/* The ellipsis is the convention that says this opens a panel
                  rather than committing straight away. */}
              <Button onClick={openSetup}>
                <PlusIcon />
                Add task…
              </Button>
            </div>

            {todos === null ? (
              <div className="space-y-1.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded-md" />
                ))}
              </div>
            ) : layout === "board" ? (
              <TodoBoard
                open={openTasks}
                pending={pendingTasks}
                doneGroups={doneSections}
                today={today}
                showProject={projectId == null}
                onOpen={setOpenTodo}
              />
            ) : (
              <TodoList
                groups={groups}
                pending={pendingTasks}
                doneGroups={doneSections}
                today={today}
                showProject={projectId == null}
                reorderable={reorderable}
                emptyTitle={emptyTitle}
                emptyDescription={emptyDescription}
                focusedId={focusedId}
                onFocusChange={setFocusedId}
                onOpen={setOpenTodo}
              />
            )}
          </div>
        </div>
      </div>

      {/* The open task is re-read from the store so the panel follows realtime
          edits rather than rendering a snapshot taken when it opened. */}
      <TodoDetailSheet
        todo={openTodo ? ((todos ?? []).find((t) => t.id === openTodo.id) ?? null) : null}
        draft={newDraft}
        onClose={() => {
          setOpenTodo(null);
          setNewDraft(null);
        }}
      />

      <TodoCommand
        onSelectView={selectView}
        onSelectProject={selectProject}
        onOpenTodo={setOpenTodo}
        onNewTask={openSetup}
        onFocusSearch={() => searchRef.current?.focus()}
      />
    </>
  );
}

export default function TodosPage() {
  return (
    <Suspense fallback={null}>
      <TodosInner />
    </Suspense>
  );
}
