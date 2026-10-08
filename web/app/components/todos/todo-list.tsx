"use client";

// The list view, plus the keyboard model. Every shortcut lives in one listener
// here, guarded so typing into a field never triggers navigation.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/design-system/components/empty";
import { cn } from "@/design-system/lib/utils";
import { orderForIndex } from "@/lib/todo-order";
import { compareTodos, type TodoGroup } from "@/lib/todo-query";
import { addDays, isFinished, type Todo, type TodoPriority } from "@/lib/todo-types";
import { useTodos } from "@/lib/todos-store";
import { TodoCard } from "./todo-card";

export function TodoList({
  groups,
  pending = [],
  doneGroups = [],
  today,
  showProject = true,
  reorderable = false,
  emptyTitle,
  emptyDescription,
  onOpen,
  focusedId,
  onFocusChange,
}: {
  groups: TodoGroup[];
  /** Live work waiting on someone, shown as its own section below the open groups. */
  pending?: Todo[];
  /** Completed work, bucketed by age and pinned below the open groups. */
  doneGroups?: TodoGroup[];
  today: string;
  showProject?: boolean;
  /** Drag-to-reorder only means something where the order is manual. */
  reorderable?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  onOpen: (todo: Todo) => void;
  focusedId: string | null;
  onFocusChange: (id: string | null) => void;
}) {
  const { toggleComplete, setStatus, updateTodo, moveTodo } = useTodos();
  const [dragging, setDragging] = useState<string | null>(null);

  const pendingGroups = useMemo<TodoGroup[]>(
    () =>
      pending.length
        ? [{ key: "pending", label: "Pending", todos: [...pending].sort(compareTodos) }]
        : [],
    [pending],
  );

  const flat = useMemo(
    () => [...groups, ...pendingGroups, ...doneGroups].flatMap((group) => group.todos),
    [groups, pendingGroups, doneGroups],
  );

  // Keep the handler reading current values without re-binding every render.
  const stateRef = useRef({ flat, focusedId });
  useEffect(() => {
    stateRef.current = { flat, focusedId };
  });

  const move = useCallback(
    (delta: number) => {
      const { flat: rows, focusedId: current } = stateRef.current;
      if (!rows.length) return;
      const index = rows.findIndex((t) => t.id === current);
      const next = index < 0 ? (delta > 0 ? 0 : rows.length - 1) : index + delta;
      const clamped = Math.max(0, Math.min(next, rows.length - 1));
      onFocusChange(rows[clamped].id);
      document
        .querySelector(`[data-todo-id="${rows[clamped].id}"]`)
        ?.scrollIntoView({ block: "nearest" });
    },
    [onFocusChange],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const { flat: rows, focusedId: current } = stateRef.current;
      const todo = rows.find((t) => t.id === current) ?? null;

      switch (event.key) {
        case "j":
        case "ArrowDown":
          event.preventDefault();
          move(1);
          return;
        case "k":
        case "ArrowUp":
          event.preventDefault();
          move(-1);
          return;
        case "Escape":
          onFocusChange(null);
          return;
      }

      if (!todo) return;

      switch (event.key) {
        case "Enter":
          event.preventDefault();
          onOpen(todo);
          break;
        case " ":
          event.preventDefault();
          void toggleComplete(todo);
          break;
        case "p":
          // The list has no columns to drag between, so this is how a task
          // moves in and out of Pending here.
          if (isFinished(todo.status)) break;
          event.preventDefault();
          void setStatus(todo, todo.status === "pending" ? "open" : "pending");
          break;
        case "1":
        case "2":
        case "3":
        case "4":
          event.preventDefault();
          void updateTodo(todo.id, { priority: Number(event.key) as TodoPriority });
          break;
        case "t":
          event.preventDefault();
          void updateTodo(todo.id, { due_on: today });
          break;
        case "T":
          event.preventDefault();
          void updateTodo(todo.id, { due_on: addDays(today, 1) });
          break;
        case "w":
          event.preventDefault();
          void updateTodo(todo.id, { due_on: addDays(today, 7) });
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [move, onFocusChange, onOpen, toggleComplete, setStatus, updateTodo, today]);

  /**
   * Drop `dragging` where `targetId` sits.
   *
   * The destination orders exclude the dragged row — otherwise it is its own
   * neighbour and the midpoint is its current position, i.e. a no-op.
   */
  function drop(group: TodoGroup, targetId: string) {
    if (!dragging || dragging === targetId) {
      setDragging(null);
      return;
    }
    const without = group.todos.filter((t) => t.id !== dragging);
    const index = without.findIndex((t) => t.id === targetId);
    if (index < 0) {
      setDragging(null);
      return;
    }
    void moveTodo(dragging, orderForIndex(without.map((t) => t.sort_order), index));
    setDragging(null);
  }

  return (
    <div className="space-y-6">
      {/* The empty state still shows when nothing is open, even if the Done
          section below has entries — "nothing left to do" is the useful thing
          to say there, and a bare list of finished work does not say it. */}
      {groups.length === 0 && (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {[...groups, ...pendingGroups].map((group) => (
        <section
          key={group.key}
          className={cn("space-y-2", group.key === "pending" && "border-t border-border pt-5")}
        >
          {group.label && (
            <h2 className="flex items-center gap-2 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              {group.label}
              <span className="tabular-nums opacity-70">{group.todos.length}</span>
            </h2>
          )}
          <div
            className="space-y-1.5"
            onDragOver={(event) => reorderable && event.preventDefault()}
          >
            {group.todos.map((todo) => (
              <div
                key={todo.id}
                onDragOver={(event) => reorderable && event.preventDefault()}
                onDrop={() => reorderable && drop(group, todo.id)}
              >
                <TodoCard
                  todo={todo}
                  today={today}
                  showProject={showProject}
                  focused={focusedId === todo.id}
                  draggable={reorderable}
                  onOpen={() => {
                    onFocusChange(todo.id);
                    onOpen(todo);
                  }}
                  onDragStart={() => setDragging(todo.id)}
                  onDragEnd={() => setDragging(null)}
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      {doneGroups.map((group, index) => (
        <section
          key={group.key}
          // Only the first Done bucket carries the rule that separates finished
          // work from open work; the rest read as one continuous history.
          className={cn("space-y-2", index === 0 && "border-t border-border pt-5")}
        >
          <h2 className="flex items-center gap-2 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {group.label}
            <span className="tabular-nums opacity-70">{group.todos.length}</span>
          </h2>
          <div className="space-y-1.5">
            {group.todos.map((todo) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                today={today}
                showProject={showProject}
                focused={focusedId === todo.id}
                onOpen={() => {
                  onFocusChange(todo.id);
                  onOpen(todo);
                }}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
