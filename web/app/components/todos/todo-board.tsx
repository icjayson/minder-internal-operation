"use client";

// The Kanban view: two columns, TO-DO and DONE. Dragging a card across sets
// its status — that is the only thing a column move means here, so there is no
// separate "column" concept to store.

import { useState } from "react";

import { Badge } from "@/design-system/components/badge";
import { cn } from "@/design-system/lib/utils";
import { compareTodos, type TodoGroup } from "@/lib/todo-query";
import type { Todo, TodoStatus } from "@/lib/todo-types";
import { useTodos } from "@/lib/todos-store";
import { TodoCard } from "./todo-card";

export function TodoBoard({
  open,
  doneGroups,
  today,
  showProject = true,
  onOpen,
}: {
  open: Todo[];
  /** Completed work, bucketed by age — rendered as headings in the column. */
  doneGroups: TodoGroup[];
  today: string;
  showProject?: boolean;
  onOpen: (todo: Todo) => void;
}) {
  const { setStatus } = useTodos();
  const [dragging, setDragging] = useState<Todo | null>(null);
  const [over, setOver] = useState<TodoStatus | null>(null);

  const doneCount = doneGroups.reduce((total, group) => total + group.todos.length, 0);

  const columns: {
    key: TodoStatus;
    title: string;
    count: number;
    /** One unlabelled group for TO-DO; the age buckets for DONE. */
    groups: TodoGroup[];
    rail: string;
    empty: string;
  }[] = [
    {
      key: "open",
      title: "To-do",
      count: open.length,
      groups: [{ key: "open", label: "", todos: [...open].sort(compareTodos) }],
      rail: "bg-primary",
      empty: "Nothing to do here",
    },
    {
      key: "done",
      title: "Done",
      count: doneCount,
      groups: doneGroups,
      rail: "bg-success",
      empty: "Nothing completed yet",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {columns.map((column) => (
        <section
          key={column.key}
          onDragOver={(event) => {
            // Without preventDefault the browser refuses the drop outright.
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setOver(column.key);
          }}
          onDragLeave={() => setOver((current) => (current === column.key ? null : current))}
          onDrop={(event) => {
            event.preventDefault();
            setOver(null);
            if (dragging) void setStatus(dragging, column.key);
            setDragging(null);
          }}
          className={cn(
            "flex min-h-[12rem] flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 transition-colors",
            over === column.key && dragging?.status !== column.key && "border-primary/50 bg-primary-tint",
          )}
        >
          <header className="flex items-center gap-2">
            <span className={cn("h-3 w-[3px] rounded-full", column.rail)} />
            <h2 className="text-[11px] font-medium tracking-[0.12em] text-foreground uppercase">
              {column.title}
            </h2>
            <Badge variant="outline" className="text-[10.5px] tabular-nums text-muted-foreground">
              {column.count}
            </Badge>
          </header>

          <div className="flex flex-col gap-3">
            {column.count === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[12px] text-muted-foreground">
                {column.empty}
              </p>
            ) : (
              column.groups.map((group) => (
                <div key={group.key} className="flex flex-col gap-1.5">
                  {group.label && (
                    <h3 className="flex items-center gap-2 px-0.5 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                      {group.label}
                      <span className="tabular-nums opacity-70">{group.todos.length}</span>
                    </h3>
                  )}
                  {group.todos.map((todo) => (
                    <TodoCard
                      key={todo.id}
                      todo={todo}
                      today={today}
                      showProject={showProject}
                      draggable
                      onOpen={() => onOpen(todo)}
                      onDragStart={() => setDragging(todo)}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
