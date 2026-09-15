"use client";

// The setup panel: title, description, due date, priority, project, link.
//
// It is a real form rather than a set of autosaving controls — every field is
// local state and nothing reaches the database until Save. That is what makes
// the create flow work ("Add" opens an empty panel; the task appears in the
// list or board only once you save), and it keeps editing predictable: one
// button commits, closing discards.
//
// A Sheet rather than a hand-rolled `fixed right-0`, so it gets a real focus
// trap, scroll lock, Esc handling and aria for free.

import { useEffect, useMemo, useState } from "react";
import { ExternalLinkIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

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
import { Checkbox } from "@/design-system/components/checkbox";
import { Input } from "@/design-system/components/input";
import { Label } from "@/design-system/components/label";
import { Separator } from "@/design-system/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/design-system/components/sheet";
import { Textarea } from "@/design-system/components/textarea";
import { cn } from "@/design-system/lib/utils";
import { DateField } from "@/app/components/date-field";
import { SelectField } from "@/app/components/select-field";
import { PRIORITIES, safeLink, type Todo, type TodoPriority } from "@/lib/todo-types";
import { useTodos } from "@/lib/todos-store";
import { TodoAttachments } from "./todo-attachments";

/** What the panel is editing, independent of whether the row exists yet. */
export type TodoDraft = {
  title: string;
  notes: string;
  due_on: string | null;
  priority: TodoPriority;
  project_id: string | null;
  link: string;
};

export const EMPTY_DRAFT: TodoDraft = {
  title: "",
  notes: "",
  due_on: null,
  priority: 4,
  project_id: null,
  link: "",
};

function draftOf(todo: Todo): TodoDraft {
  return {
    title: todo.title,
    notes: todo.notes ?? "",
    due_on: todo.due_on,
    priority: todo.priority,
    project_id: todo.project_id,
    link: todo.link ?? "",
  };
}

export function TodoDetailSheet({
  todo,
  draft: initialDraft,
  onClose,
  onCreated,
}: {
  /** The row being edited, or null when creating. */
  todo: Todo | null;
  /** Seed values for a new task; non-null means the panel is in create mode. */
  draft: TodoDraft | null;
  onClose: () => void;
  onCreated?: (todo: Todo) => void;
}) {
  const { updateTodo, createTodo, deleteTodo, toggleComplete, projects } = useTodos();

  const isNew = todo == null;
  const [form, setForm] = useState<TodoDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Re-seed when a different task opens. Keyed on the id rather than the object
  // so a realtime echo of the same row cannot wipe an edit in progress.
  useEffect(() => {
    if (todo) setForm(draftOf(todo));
    else if (initialDraft) setForm(initialDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todo?.id, initialDraft]);

  const baseline = useMemo(
    () => (todo ? draftOf(todo) : (initialDraft ?? EMPTY_DRAFT)),
    [todo, initialDraft],
  );

  const dirty = useMemo(
    () => (Object.keys(form) as (keyof TodoDraft)[]).some((key) => form[key] !== baseline[key]),
    [form, baseline],
  );

  if (!todo && !initialDraft) return null;

  const done = todo != null && todo.status !== "open";
  const href = safeLink(form.link);
  // Only flag a bad link once something has actually been typed.
  const linkInvalid = form.link.trim().length > 0 && href == null;
  const canSave = form.title.trim().length > 0 && dirty && !saving;

  function set<K extends keyof TodoDraft>(key: K, value: TodoDraft[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    const title = form.title.trim();
    if (!title) return;

    // Store the normalised href so "docs.co/x" and "https://docs.co/x" are the
    // same value, and the card's button always has a scheme to open.
    const rawLink = form.link.trim();
    const link = rawLink ? (safeLink(rawLink) ?? rawLink) : null;
    const notes = form.notes.trim() || null;

    setSaving(true);
    try {
      if (isNew) {
        const created = await createTodo({
          title,
          notes,
          due_on: form.due_on,
          priority: form.priority,
          link,
          project_id: form.project_id,
        });
        if (!created) return;
        toast.success(`Added “${title}”`);
        onCreated?.(created);
        onClose();
        return;
      }

      await updateTodo(todo!.id, {
        title,
        notes,
        due_on: form.due_on,
        priority: form.priority,
        link,
        project_id: form.project_id,
      });
      toast.success("Saved");
      onClose();
    } finally {
      setSaving(false);
    }
  }

  /** Closing with unsaved edits asks first — silently dropping them is worse. */
  function requestClose() {
    if (dirty) setConfirmDiscard(true);
    else onClose();
  }

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && requestClose()}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
          <SheetHeader className="gap-2">
            <div className="flex items-start gap-2.5">
              {todo && (
                <Checkbox
                  checked={done}
                  aria-label={done ? "Reopen task" : "Complete task"}
                  onCheckedChange={() => void toggleComplete(todo)}
                  className="mt-1 size-[18px] rounded-full"
                />
              )}
              <SheetTitle className="sr-only">
                {isNew ? "New task" : "Task detail"}
              </SheetTitle>
              <Textarea
                autoFocus={isNew}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                aria-label="Title"
                placeholder="What needs doing?"
                rows={2}
                className={cn(
                  "min-h-0 resize-none border-0 px-0 py-0 text-[15px] leading-snug shadow-none focus-visible:ring-0 dark:bg-transparent",
                  done && "line-through opacity-60",
                )}
              />
            </div>
            <SheetDescription className="sr-only">
              Set this task's description, due date, priority, project and link,
              then save.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 px-4 pb-6">
            <Separator />

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Description</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={4}
                placeholder="Anything worth remembering when you pick this up"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Due date</Label>
                <DateField
                  value={form.due_on}
                  onChange={(value) => set("due_on", value || null)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Priority</Label>
                <SelectField
                  value={String(form.priority)}
                  onChange={(value) => set("priority", Number(value) as TodoPriority)}
                  options={PRIORITIES.map((p) => ({ value: String(p.value), label: p.label }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Project</Label>
              <SelectField
                value={form.project_id}
                onChange={(value) => set("project_id", value || null)}
                options={(projects ?? []).map((p) => ({ value: p.id, label: p.name }))}
                emptyLabel="No project"
                placeholder="No project"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Link</Label>
              <div className="flex gap-2">
                <Input
                  value={form.link}
                  onChange={(e) => set("link", e.target.value)}
                  placeholder="https://…"
                  aria-invalid={linkInvalid}
                />
                <Button
                  asChild={!!href}
                  variant="outline"
                  size="icon"
                  disabled={!href}
                  aria-label="Open link"
                >
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      <ExternalLinkIcon />
                    </a>
                  ) : (
                    <ExternalLinkIcon />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {linkInvalid
                  ? "That is not a usable web address."
                  : "When set, the card shows a button that opens this."}
              </p>
            </div>

            <Separator />

            {/* Attachments need a row to hang off, so they wait for the first
                save rather than being staged in the browser. */}
            {todo ? (
              <TodoAttachments todoId={todo.id} />
            ) : (
              <p className="text-[12px] text-muted-foreground">
                Save the task first to attach files to it.
              </p>
            )}
          </div>

          <SheetFooter className="gap-2 sm:flex-row sm:items-center">
            <Button onClick={() => void save()} disabled={!canSave} className="sm:flex-1">
              {saving ? "Saving…" : isNew ? "Save task" : "Save changes"}
            </Button>
            <Button variant="outline" onClick={requestClose}>
              Cancel
            </Button>
            {todo && (
              <Button
                variant="outline"
                size="icon"
                aria-label="Delete task"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2Icon />
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              {isNew
                ? "This task has not been saved, so it will not appear in your list."
                : "Your edits to this task have not been saved."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                onClose();
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{todo?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Any attached files are deleted too. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (todo) void deleteTodo(todo);
                setConfirmDelete(false);
                onClose();
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
