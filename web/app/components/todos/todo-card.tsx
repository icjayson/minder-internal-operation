"use client";

// One task, used by both the list and the board. Composed from the design
// system's Item primitive rather than hand-rolled markup.

import { ExternalLinkIcon, GripVerticalIcon, TextIcon } from "lucide-react";

import { Badge } from "@/design-system/components/badge";
import { Button } from "@/design-system/components/button";
import { Checkbox } from "@/design-system/components/checkbox";
import { Item, ItemContent, ItemMedia } from "@/design-system/components/item";
import { cn } from "@/design-system/lib/utils";
import { DUE_TONES, describeDue } from "@/lib/todo-query";
import {
  colorMeta,
  isFinished,
  linkLabel,
  priorityMeta,
  safeLink,
  type Todo,
} from "@/lib/todo-types";
import { useTodos } from "@/lib/todos-store";

export function TodoCard({
  todo,
  today,
  focused = false,
  showProject = true,
  draggable = false,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  todo: Todo;
  today: string;
  focused?: boolean;
  showProject?: boolean;
  draggable?: boolean;
  onOpen: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const { toggleComplete, projects } = useTodos();

  const done = isFinished(todo.status);
  const due = describeDue(todo, today);
  const priority = priorityMeta(todo.priority);
  const project = (projects ?? []).find((p) => p.id === todo.project_id);
  const href = safeLink(todo.link);
  const host = linkLabel(todo.link);

  return (
    <Item
      data-todo-id={todo.id}
      variant="outline"
      size="sm"
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        // Firefox refuses to start a drag without payload on the transfer.
        event.dataTransfer.setData("text/plain", todo.id);
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      onClick={(event) => {
        // The checkbox, drag handle and link button own their own clicks.
        if ((event.target as HTMLElement).closest("[data-no-open]")) return;
        onOpen();
      }}
      className={cn(
        "group cursor-pointer items-start gap-2.5 transition-colors",
        focused && "border-primary/50 bg-primary-tint",
        done && "opacity-60",
      )}
    >
      {draggable && (
        <ItemMedia
          data-no-open
          className="-ml-1 cursor-grab self-start pt-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          aria-hidden
        >
          <GripVerticalIcon className="size-4" />
        </ItemMedia>
      )}

      <ItemMedia data-no-open className="self-start pt-0.5">
        <Checkbox
          checked={done}
          aria-label={done ? `Reopen ${todo.title}` : `Complete ${todo.title}`}
          onCheckedChange={() => void toggleComplete(todo)}
          className={cn("size-[18px] rounded-full", priority.check)}
        />
      </ItemMedia>

      <ItemContent className="gap-1">
        {/* The title is not its own control: the whole card opens the setup
            panel, which is the one place a task is edited. An inline editor
            here would save on blur while the panel saves on Save — two edit
            paths with different semantics for the same field. */}
        <span className={cn("text-[13px] leading-snug", done && "line-through")}>
          {todo.title}
        </span>

        {todo.notes && (
          <p className="line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">
            {todo.notes}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {due && (
            <Badge
              variant="outline"
              className={cn("text-[10.5px] tabular-nums", DUE_TONES[due.tone])}
            >
              {due.label}
            </Badge>
          )}
          {todo.priority !== 4 && (
            <Badge variant="outline" className={cn("text-[10.5px]", priority.text)}>
              {priority.short}
            </Badge>
          )}
          {showProject && project && (
            <Badge variant="outline" className="gap-1 text-[10.5px] text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", colorMeta(project.color).dot)} />
              {project.name}
            </Badge>
          )}
          {todo.notes && (
            <TextIcon className="size-3 text-muted-foreground" aria-label="Has a description" />
          )}

          {href && (
            <Button
              data-no-open
              asChild
              size="xs"
              variant="outline"
              className="ml-auto h-6 max-w-[11rem]"
            >
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={href}
                onClick={(event) => event.stopPropagation()}
              >
                <ExternalLinkIcon />
                <span className="truncate">{host ?? "Open link"}</span>
              </a>
            </Button>
          )}
        </div>
      </ItemContent>
    </Item>
  );
}
