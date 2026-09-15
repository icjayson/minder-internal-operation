"use client";

// ⌘K palette and the `?` cheatsheet. Both are portalled dialogs, so they
// inherit the design system's tokens the same way every other overlay does.

import { useEffect, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/design-system/components/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/design-system/components/dialog";
import { Kbd, KbdGroup } from "@/design-system/components/kbd";
import { SMART_VIEWS, colorMeta, type SmartView, type Todo } from "@/lib/todo-types";
import { useTodos } from "@/lib/todos-store";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["N"], label: "New task" },
  { keys: ["⌘", "K"], label: "Command palette" },
  { keys: ["/"], label: "Focus search" },
  { keys: ["G", "A"], label: "Go to All" },
  { keys: ["G", "T"], label: "Go to Today" },
  { keys: ["G", "U"], label: "Go to Upcoming" },
  { keys: ["G", "O"], label: "Go to Overdue" },
  { keys: ["J", "K"], label: "Move focus down / up" },
  { keys: ["↵"], label: "Open the focused task" },
  { keys: ["Space"], label: "Complete the focused task" },
  { keys: ["1", "–", "4"], label: "Set priority" },
  { keys: ["T"], label: "Due today" },
  { keys: ["⇧", "T"], label: "Due tomorrow" },
  { keys: ["W"], label: "Due next week" },
  { keys: ["?"], label: "This cheatsheet" },
  { keys: ["Esc"], label: "Clear focus / close" },
];

export function TodoCommand({
  onSelectView,
  onSelectProject,
  onOpenTodo,
  onNewTask,
  onFocusSearch,
}: {
  onSelectView: (view: SmartView) => void;
  onSelectProject: (id: string) => void;
  onOpenTodo: (todo: Todo) => void;
  onNewTask: () => void;
  onFocusSearch: () => void;
}) {
  const { todos, projects } = useTodos();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    // `g`-prefixed navigation needs to remember the `g`. A short window keeps
    // a stray `g` from hijacking the next unrelated keystroke.
    let pendingGo = false;
    let goTimer: number | undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }

      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

      if (pendingGo) {
        const destination: Record<string, SmartView> = {
          a: "all",
          t: "today",
          u: "upcoming",
          o: "overdue",
        };
        const view = destination[event.key.toLowerCase()];
        pendingGo = false;
        window.clearTimeout(goTimer);
        if (view) {
          event.preventDefault();
          onSelectView(view);
        }
        return;
      }

      if (event.key === "g") {
        pendingGo = true;
        goTimer = window.setTimeout(() => {
          pendingGo = false;
        }, 1200);
        return;
      }

      if (event.key === "n") {
        event.preventDefault();
        onNewTask();
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        onFocusSearch();
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        setHelpOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(goTimer);
    };
  }, [onSelectView, onFocusSearch, onNewTask]);

  // Only open tasks are worth jumping to, and the list is capped so the
  // palette stays fast on a large backlog.
  const openTodos = (todos ?? []).filter((t) => t.status === "open").slice(0, 80);

  return (
    <>
      <CommandDialog
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        title="To-do commands"
        description="Jump to a view, a project, or a task."
      >
        <CommandInput placeholder="Jump to a view, project or task…" />
        <CommandList>
          <CommandEmpty>Nothing matches.</CommandEmpty>

          <CommandGroup heading="Views">
            {SMART_VIEWS.map((item) => (
              <CommandItem
                key={item.key}
                value={`view ${item.label} ${item.hint}`}
                onSelect={() => {
                  onSelectView(item.key);
                  setPaletteOpen(false);
                }}
              >
                {item.label}
                <CommandShortcut>G {item.label[0].toUpperCase()}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>

          {(projects ?? []).length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Projects">
                {(projects ?? []).map((project) => (
                  <CommandItem
                    key={project.id}
                    value={`project ${project.name}`}
                    onSelect={() => {
                      onSelectProject(project.id);
                      setPaletteOpen(false);
                    }}
                  >
                    <span className={`size-2 rounded-full ${colorMeta(project.color).dot}`} />
                    {project.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {openTodos.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Tasks">
                {openTodos.map((todo) => (
                  <CommandItem
                    key={todo.id}
                    value={`task ${todo.title}`}
                    onSelect={() => {
                      onOpenTodo(todo);
                      setPaletteOpen(false);
                    }}
                  >
                    {todo.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem
              value="new task add create"
              onSelect={() => {
                setPaletteOpen(false);
                onNewTask();
              }}
            >
              New task
              <CommandShortcut>N</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Help">
            <CommandItem
              value="keyboard shortcuts cheatsheet"
              onSelect={() => {
                setPaletteOpen(false);
                setHelpOpen(true);
              }}
            >
              Keyboard shortcuts
              <CommandShortcut>?</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              They work anywhere on this page except while you are typing in a field.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-1.5">
            {SHORTCUTS.map((shortcut) => (
              <li
                key={shortcut.label}
                className="flex items-center justify-between gap-4 text-[13px]"
              >
                <span className="text-foreground/80">{shortcut.label}</span>
                <KbdGroup>
                  {shortcut.keys.map((key, index) => (
                    <Kbd key={`${shortcut.label}-${index}`}>{key}</Kbd>
                  ))}
                </KbdGroup>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
