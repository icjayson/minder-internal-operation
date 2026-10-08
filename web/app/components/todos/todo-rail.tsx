"use client";

// The rail inside /todos: the four views on top, the project list below.
// Counts come from the same predicate the views use, so a badge can never
// disagree with what the view actually shows.

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/design-system/components/alert-dialog";
import { Button } from "@/design-system/components/button";
import { Input } from "@/design-system/components/input";
import { Separator } from "@/design-system/components/separator";
import { cn } from "@/design-system/lib/utils";
import { matchesSmartView } from "@/lib/todo-query";
import { SMART_VIEWS, colorMeta, isActive, type SmartView } from "@/lib/todo-types";
import { useTodos } from "@/lib/todos-store";

export function TodoRail({
  view,
  projectId,
  onSelectView,
  onSelectProject,
}: {
  view: SmartView | null;
  projectId: string | null;
  onSelectView: (view: SmartView) => void;
  onSelectProject: (id: string) => void;
}) {
  const { todos, projects, today, createProject, deleteProject } = useTodos();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const all = todos ?? [];

  async function submitProject() {
    const name = draft.trim();
    setDraft("");
    setAdding(false);
    if (!name) return;
    const created = await createProject(name);
    if (created) onSelectProject(created.id);
  }

  const doomed = (projects ?? []).find((p) => p.id === pendingDelete);

  // The count renders even at zero. Hiding it made the tabs look countless on
  // an empty tracker, and "Overdue 0" is useful information in its own right.
  const countPill = (count: number, active: boolean) => (
    <span
      className={cn(
        "min-w-5 rounded-full px-1.5 py-px text-center text-[10.5px] tabular-nums",
        active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {count}
    </span>
  );

  const rowClass = (active: boolean) =>
    cn(
      "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors",
      active ? "bg-primary-tint font-medium text-primary" : "text-foreground/80 hover:bg-accent",
    );

  return (
    <>
      <nav className="w-full shrink-0 space-y-4 lg:w-52">
        <ul className="space-y-0.5">
          {SMART_VIEWS.map((item) => {
            const count = all.filter((t) => matchesSmartView(t, item.key, today)).length;
            const active = view === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  title={item.hint}
                  onClick={() => onSelectView(item.key)}
                  className={rowClass(active)}
                >
                  <span className="flex-1 truncate">{item.label}</span>
                  {countPill(count, active)}
                </button>
              </li>
            );
          })}
        </ul>

        <Separator />

        <div className="space-y-1">
          <div className="flex items-center justify-between px-2.5">
            <span className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Projects
            </span>
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="New project"
              onClick={() => setAdding(true)}
            >
              <PlusIcon />
            </Button>
          </div>

          <ul className="space-y-0.5">
            {(projects ?? []).map((project) => {
              const count = all.filter(
                (t) => t.project_id === project.id && isActive(t.status),
              ).length;
              const active = projectId === project.id;
              return (
                <li key={project.id} className="group/row relative">
                  <button
                    type="button"
                    onClick={() => onSelectProject(project.id)}
                    className={rowClass(active)}
                  >
                    <span
                      className={cn("size-2 shrink-0 rounded-full", colorMeta(project.color).dot)}
                    />
                    <span className="flex-1 truncate">{project.name}</span>
                    <span className="group-hover/row:opacity-0">{countPill(count, active)}</span>
                  </button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Delete ${project.name}`}
                    onClick={() => setPendingDelete(project.id)}
                    className="absolute top-1/2 right-1 -translate-y-1/2 opacity-0 transition-opacity group-hover/row:opacity-100"
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              );
            })}

            {adding && (
              <li className="px-1 pt-1">
                <Input
                  autoFocus
                  value={draft}
                  placeholder="Project name"
                  className="h-8"
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => void submitProject()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submitProject();
                    if (e.key === "Escape") {
                      setDraft("");
                      setAdding(false);
                    }
                  }}
                />
              </li>
            )}

            {!adding && (projects ?? []).length === 0 && (
              <li className="px-2.5 text-[11.5px] text-muted-foreground">
                None yet — add one with <b>+</b>.
              </li>
            )}
          </ul>
        </div>
      </nav>

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{doomed?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Every task in this project is deleted with it, along with any attached
              files. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) void deleteProject(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
