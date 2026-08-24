"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FundraisingTrack, FundraisingWorkItem, WorkStatus } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { Button } from "@/design-system/components/button";
import { Input } from "@/design-system/components/input";
import { Textarea } from "@/design-system/components/textarea";
import { NativeSelect, NativeSelectOption } from "@/design-system/components/native-select";
import { DateField } from "./date-field";

const COLUMNS: { key: WorkStatus; label: string; tone: string }[] = [
  { key: "not_started", label: "Not started", tone: "bg-muted-foreground/40" },
  { key: "doing", label: "Doing", tone: "bg-primary" },
  { key: "done", label: "Done", tone: "bg-[color:var(--color-info)]" },
];

type WorkItemPatch = {
  title: string;
  body: string | null;
  status: WorkStatus;
  trigger_on: string | null;
};

// A completed card is never flagged overdue or due-soon: it just shows its date.
function describeTrigger(triggerOn: string | null, status?: WorkStatus): {
  label: string;
  tone: "overdue" | "today" | "soon" | "later";
} | null {
  if (!triggerOn) return null;
  const due = new Date(`${triggerOn}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  const date = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (status === "done") return { label: date, tone: "later" };
  if (days < 0) return { label: `${date} · ${Math.abs(days)}d overdue`, tone: "overdue" };
  if (days === 0) return { label: `${date} · today`, tone: "today" };
  if (days === 1) return { label: `${date} · tomorrow`, tone: "soon" };
  return { label: date, tone: "later" };
}

const TRIGGER_TONES: Record<string, string> = {
  overdue: "border-[color:var(--color-danger)]/35 tint-danger text-[color:var(--color-danger)]",
  today: "border-primary/40 bg-primary/10 text-primary",
  soon: "border-[color:var(--color-warn)]/40 text-[color:var(--color-warn)]",
  later: "border-border text-foreground/80",
};

// The earliest trigger date among open (not-done) work items — the lead's
// next_touch syncs to this.
export function nextTriggeredWorkItem(items: FundraisingWorkItem[]): FundraisingWorkItem | null {
  return items.reduce<FundraisingWorkItem | null>((nearest, item) => {
    if (item.status === "done" || !item.trigger_on) return nearest;
    if (!nearest || !nearest.trigger_on || item.trigger_on < nearest.trigger_on) return item;
    return nearest;
  }, null);
}

export function FundraisingWorkInventory({
  track,
  leadId,
  onNearestTriggerChange,
}: {
  track: FundraisingTrack;
  leadId: string;
  onNearestTriggerChange?: (date: string | null) => void;
}) {
  const column = track === "investor" ? "investor_id" : "competition_id";
  const [items, setItems] = useState<FundraisingWorkItem[] | null>(null);
  const [selected, setSelected] = useState<FundraisingWorkItem | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onNearestTriggerChangeRef = useRef(onNearestTriggerChange);
  useEffect(() => {
    onNearestTriggerChangeRef.current = onNearestTriggerChange;
  });

  useEffect(() => {
    if (items === null) return;
    const nextItem = nextTriggeredWorkItem(items);
    onNearestTriggerChangeRef.current?.(nextItem?.trigger_on ?? null);
  }, [items]);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase()
      .from("fundraising_work_items")
      .select("*")
      .eq(column, leadId)
      .order("updated_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
      setItems([]);
      return;
    }
    setError(null);
    setItems((data ?? []) as FundraisingWorkItem[]);
  }, [column, leadId]);

  useEffect(() => {
    load();
    const sb = supabase();
    const channel = sb
      .channel(`fundraising-work-${leadId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fundraising_work_items", filter: `${column}=eq.${leadId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as FundraisingWorkItem;
          setItems((current) => {
            if (!current) return current;
            if (payload.eventType === "INSERT")
              return current.some((item) => item.id === row.id) ? current : [row, ...current];
            if (payload.eventType === "UPDATE")
              return current.map((item) => (item.id === row.id ? { ...item, ...row } : item));
            if (payload.eventType === "DELETE")
              return current.filter((item) => item.id !== row.id);
            return current;
          });
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [column, leadId, load]);

  async function saveItem(id: string | null, patch: WorkItemPatch) {
    setError(null);
    if (id) {
      setItems((current) => current?.map((item) => (item.id === id ? { ...item, ...patch } : item)) ?? current);
      const { data, error: saveError } = await supabase()
        .from("fundraising_work_items")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (saveError) {
        setError(saveError.message);
        await load();
        return false;
      }
      if (data) {
        const saved = data as FundraisingWorkItem;
        setItems((current) => current?.map((item) => (item.id === id ? { ...item, ...saved } : item)) ?? current);
      }
      return true;
    }

    const { data, error: saveError } = await supabase()
      .from("fundraising_work_items")
      .insert({ [column]: leadId, ...patch })
      .select("*")
      .single();
    if (saveError) {
      setError(saveError.message);
      return false;
    }
    if (data) {
      const created = data as FundraisingWorkItem;
      setItems((current) => (current?.some((item) => item.id === created.id) ? current : [created, ...(current ?? [])]));
    }
    return true;
  }

  async function moveItem(id: string, status: WorkStatus) {
    const item = items?.find((candidate) => candidate.id === id);
    if (!item || item.status === status) return;
    await saveItem(id, { title: item.title, body: item.body, status, trigger_on: item.trigger_on ?? null });
  }

  async function deleteItem(id: string) {
    setItems((current) => current?.filter((item) => item.id !== id) ?? current);
    const { error: deleteError } = await supabase().from("fundraising_work_items").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      await load();
      return false;
    }
    return true;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[10px] tabular-nums uppercase tracking-[0.14em] text-muted-foreground font-medium">
            Work inventory {items ? `· ${items.length}` : ""}
          </h3>
          <p className="text-[11.5px] text-muted-foreground mt-0.5">Drag cards between stages to update progress.</p>
        </div>
        <Button size="sm" onClick={() => setSelected("new")} className="h-7 px-3 text-[11.5px]">
          + Work
        </Button>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-[color:var(--color-danger)]/30 tint-danger px-3 py-2 text-[11.5px] text-[color:var(--color-danger)]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {COLUMNS.map((col) => {
          const columnItems = (items ?? []).filter((item) => item.status === col.key);
          return (
            <div
              key={col.key}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/work-item");
                if (id) moveItem(id, col.key);
              }}
              className="min-h-44 rounded-lg border border-border bg-muted/45 p-2.5"
            >
              <div className="flex items-center gap-2 px-0.5 mb-2.5">
                <span className={`w-1.5 h-1.5 rounded-full ${col.tone}`} />
                <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-foreground/80">{col.label}</span>
                <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">{columnItems.length}</span>
              </div>
              <div className="space-y-2">
                {columnItems.map((item) => {
                  const trigger = describeTrigger(item.trigger_on, item.status);
                  return (
                    <article
                      key={item.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/work-item", item.id);
                      }}
                      onClick={() => setSelected(item)}
                      className="rounded-md border border-border bg-card px-3 py-2.5 hover:border-border-strong hover:bg-accent/35 cursor-pointer shadow-sm"
                    >
                      <h4 className="text-[12.5px] font-medium text-foreground leading-snug">{item.title}</h4>
                      {item.body && (
                        <p className="mt-1 text-[11.5px] leading-relaxed text-foreground/80 whitespace-pre-wrap line-clamp-2">
                          {item.body}
                        </p>
                      )}
                      {trigger && (
                        <div
                          className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] tabular-nums font-medium ${TRIGGER_TONES[trigger.tone]}`}
                          title={`Next-step trigger · ${item.trigger_on}`}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="shrink-0">
                            <rect x="3" y="4.5" width="18" height="17" rx="2" strokeWidth="1.8" />
                            <path d="M3 9h18M8 2.5v4M16 2.5v4" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                          <span>{trigger.label}</span>
                        </div>
                      )}
                    </article>
                  );
                })}
                {items !== null && columnItems.length === 0 && (
                  <div className="rounded-md border border-dashed border-border px-2 py-5 text-center text-[10.5px] text-muted-foreground">
                    No work
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <WorkItemModal
          item={selected === "new" ? null : selected}
          onClose={() => setSelected(null)}
          onSave={async (patch) => {
            const saved = await saveItem(selected === "new" ? null : selected.id, patch);
            if (saved) setSelected(null);
          }}
          onDelete={selected === "new" ? undefined : async () => {
            if (!confirm(`Delete “${selected.title}”?`)) return;
            const deleted = await deleteItem(selected.id);
            if (deleted) setSelected(null);
          }}
        />
      )}
    </section>
  );
}

function WorkItemModal({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: FundraisingWorkItem | null;
  onClose: () => void;
  onSave: (patch: WorkItemPatch) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [status, setStatus] = useState<WorkStatus>(item?.status ?? "not_started");
  const [triggerOn, setTriggerOn] = useState(item?.trigger_on ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      body: body.trim() || null,
      status,
      trigger_on: triggerOn || null,
    });
    setSaving(false);
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto p-4">
      <button onClick={onClose} aria-label="Close work item" className="absolute inset-0 bg-background/75 backdrop-blur-sm" />
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-xl rounded-xl border border-border-strong bg-card shadow-mo-soft"
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <div className="text-[9px] tabular-nums uppercase tracking-[0.14em] text-primary">
              {item ? "Work item" : "New work item"}
            </div>
            <h3 className="text-lg font-display text-foreground mt-0.5">{item ? "Details" : "Add to inventory"}</h3>
          </div>
          <Button variant="ghost" size="icon-sm" type="button" onClick={onClose} className="w-7 h-7" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m6 6 12 12M18 6 6 18" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </Button>
        </header>

        <div className="p-5 space-y-4">
          <label className="block">
            <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground block mb-1">Title</span>
            <Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs to be done?" className="w-full h-10 px-3 text-[13px]" />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block [&_[data-slot=native-select-wrapper]]:w-full">
              <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground block mb-1">Status</span>
              <NativeSelect value={status} onChange={(event) => setStatus(event.target.value as WorkStatus)} className="w-full h-10 px-3 text-[13px]">
                {COLUMNS.map((col) => <NativeSelectOption key={col.key} value={col.key}>{col.label}</NativeSelectOption>)}
              </NativeSelect>
            </label>
            <label className="block">
              <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground block mb-1">Next-step trigger</span>
              <DateField value={triggerOn} onChange={setTriggerOn} className="h-10 text-[13px]" />
              <span className="mt-1 block text-[10.5px] text-muted-foreground">When this step should be triggered (syncs to next touch).</span>
            </label>
          </div>
          <label className="block">
            <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground block mb-1">Body</span>
            <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={9} placeholder="Add the detailed work item context…" className="w-full px-3 py-2 text-[13px] leading-relaxed resize-y" />
          </label>
        </div>

        <footer className="flex items-center gap-2 px-5 py-3 border-t border-border bg-muted/40 rounded-b-xl">
          {onDelete && (
            <Button variant="outline" type="button" onClick={onDelete}
              className="h-9 rounded-full border-error/35 px-4 text-[12px] text-error hover:bg-error-light hover:text-error-dark">
              Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" size="sm" type="button" onClick={onClose} className="h-9 px-4 rounded-full text-[12px] text-foreground/80 hover:text-foreground">
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !title.trim()} className="px-5 text-[12px]">
            {saving ? "Saving…" : "Save"}
          </Button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
