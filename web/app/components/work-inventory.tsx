"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Contact, FactoryWorkItem, WorkStatus } from "@/lib/types";
import { supabase } from "@/lib/supabase";

const COLUMNS: { key: WorkStatus; label: string; tone: string }[] = [
  { key: "not_started", label: "Not started", tone: "bg-muted" },
  { key: "doing", label: "Doing", tone: "bg-accent" },
  { key: "done", label: "Done", tone: "bg-[color:var(--color-info)]" },
];

type WorkItemPatch = {
  title: string;
  body: string | null;
  status: WorkStatus;
  pic_contact_id: string | null;
  trigger_on: string | null;
};

// Describes a work item's trigger date relative to today — used to label and
// colour the card's deadline pill (overdue / due today / upcoming).
function describeTrigger(triggerOn: string | null): {
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
  if (days < 0) return { label: `${date} · ${Math.abs(days)}d overdue`, tone: "overdue" };
  if (days === 0) return { label: `${date} · today`, tone: "today" };
  if (days === 1) return { label: `${date} · tomorrow`, tone: "soon" };
  if (days <= 3) return { label: `${date} · in ${days}d`, tone: "soon" };
  return { label: date, tone: "later" };
}

const TRIGGER_TONES: Record<string, string> = {
  overdue:
    "border-[color:var(--color-danger)]/35 tint-danger text-[color:var(--color-danger)]",
  today:
    "border-accent/40 bg-accent/10 text-accent",
  soon:
    "border-[color:var(--color-warn)]/40 text-[color:var(--color-warn)]",
  later:
    "border-line text-ink-soft",
};

// The nearest (earliest) trigger date among open (not-done) work items — this
// is the date the factory's "next action due" syncs to. ISO date strings sort
// lexicographically, so the min string is the soonest date.
function nearestTrigger(items: FactoryWorkItem[]): string | null {
  const dates = items
    .filter((item) => item.status !== "done" && item.trigger_on)
    .map((item) => item.trigger_on as string);
  if (dates.length === 0) return null;
  return dates.reduce((min, date) => (date < min ? date : min));
}

export function WorkInventory({
  factoryId,
  contacts,
  onNearestTriggerChange,
}: {
  factoryId: string;
  contacts: Contact[];
  onNearestTriggerChange?: (date: string | null) => void;
}) {
  const [items, setItems] = useState<FactoryWorkItem[] | null>(null);
  const [selected, setSelected] = useState<FactoryWorkItem | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest callback in a ref so the sync effect below depends only on
  // `items` (not on the callback identity, which changes every parent render).
  const onNearestTriggerChangeRef = useRef(onNearestTriggerChange);
  useEffect(() => {
    onNearestTriggerChangeRef.current = onNearestTriggerChange;
  });

  // Whenever the work items change, report the nearest open trigger date up so
  // the factory's "next action due" can sync to it.
  useEffect(() => {
    if (items === null) return;
    onNearestTriggerChangeRef.current?.(nearestTrigger(items));
  }, [items]);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase()
      .from("factory_work_items")
      .select("*")
      .eq("factory_id", factoryId)
      .order("updated_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
      setItems([]);
      return;
    }
    setError(null);
    setItems((data ?? []) as FactoryWorkItem[]);
  }, [factoryId]);

  useEffect(() => {
    load();
    const sb = supabase();
    const channel = sb
      .channel(`factory-work-${factoryId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "factory_work_items",
          filter: `factory_id=eq.${factoryId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as FactoryWorkItem;
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
  }, [factoryId, load]);

  async function saveItem(
    id: string | null,
    patch: WorkItemPatch,
  ) {
    setError(null);
    if (id) {
      setItems((current) =>
        current?.map((item) => (item.id === id ? { ...item, ...patch } : item)) ?? current,
      );
      const { data, error: saveError } = await supabase()
        .from("factory_work_items")
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
        const saved = data as FactoryWorkItem;
        setItems((current) =>
          current?.map((item) => (item.id === id ? { ...item, ...saved } : item)) ?? current,
        );
      }
      return true;
    }

    const { data, error: saveError } = await supabase()
      .from("factory_work_items")
      .insert({ factory_id: factoryId, ...patch })
      .select("*")
      .single();
    if (saveError) {
      setError(saveError.message);
      return false;
    }
    if (data) {
      const created = data as FactoryWorkItem;
      setItems((current) =>
        current?.some((item) => item.id === created.id)
          ? current
          : [created, ...(current ?? [])],
      );
    }
    return true;
  }

  async function moveItem(id: string, status: WorkStatus) {
    const item = items?.find((candidate) => candidate.id === id);
    if (!item || item.status === status) return;
    await saveItem(id, {
      title: item.title,
      body: item.body,
      status,
      pic_contact_id: item.pic_contact_id ?? null,
      trigger_on: item.trigger_on ?? null,
    });
  }

  async function deleteItem(id: string) {
    setItems((current) => current?.filter((item) => item.id !== id) ?? current);
    const { error: deleteError } = await supabase()
      .from("factory_work_items")
      .delete()
      .eq("id", id);
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
          <h3 className="text-[10px] mono uppercase tracking-[0.14em] text-muted font-medium">
            Work inventory {items ? `· ${items.length}` : ""}
          </h3>
          <p className="text-[11.5px] text-muted mt-0.5">Drag cards between stages to update progress.</p>
        </div>
        <button
          onClick={() => setSelected("new")}
          className="h-7 px-3 rounded-full bg-accent hover:bg-[#3a51ff] text-white text-[11.5px] font-medium cursor-pointer"
        >
          + Work
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-[color:var(--color-danger)]/30 tint-danger px-3 py-2 text-[11.5px] text-[color:var(--color-danger)]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {COLUMNS.map((column) => {
          const columnItems = (items ?? []).filter((item) => item.status === column.key);
          return (
            <div
              key={column.key}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/work-item");
                if (id) moveItem(id, column.key);
              }}
              className="min-h-44 rounded-lg border border-line bg-surface-2/45 p-2.5"
            >
              <div className="flex items-center gap-2 px-0.5 mb-2.5">
                <span className={`w-1.5 h-1.5 rounded-full ${column.tone}`} />
                <span className="text-[10px] mono uppercase tracking-[0.12em] text-ink-soft">
                  {column.label}
                </span>
                <span className="ml-auto text-[10px] mono text-muted">{columnItems.length}</span>
              </div>
              <div className="space-y-2">
                {columnItems.map((item) => (
                  (() => {
                    const pic = contacts.find((contact) => contact.id === item.pic_contact_id);
                    const trigger = describeTrigger(item.trigger_on);
                    return (
                      <article
                        key={item.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/work-item", item.id);
                        }}
                        onClick={() => setSelected(item)}
                        className="rounded-md border border-line bg-surface px-3 py-2.5 hover:border-line-strong hover:bg-surface-3/35 cursor-pointer shadow-sm"
                      >
                        <h4 className="text-[12.5px] font-medium text-ink leading-snug">{item.title}</h4>
                        {item.body && (
                          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft whitespace-pre-wrap line-clamp-2">
                            {item.body}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-muted min-w-0">
                          <span className="mono uppercase tracking-[0.1em] shrink-0">TO:</span>
                          <span className="truncate text-ink-soft">
                            {pic
                              ? `${pic.full_name}${pic.role_title ? ` — ${pic.role_title}` : ""}`
                              : "None"}
                          </span>
                        </div>
                        {trigger && (
                          <div
                            className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] mono font-medium ${TRIGGER_TONES[trigger.tone]}`}
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
                  })()
                ))}
                {items !== null && columnItems.length === 0 && (
                  <div className="rounded-md border border-dashed border-line px-2 py-5 text-center text-[10.5px] text-muted">
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
          contacts={contacts}
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
  contacts,
  onClose,
  onSave,
  onDelete,
}: {
  item: FactoryWorkItem | null;
  contacts: Contact[];
  onClose: () => void;
  onSave: (patch: WorkItemPatch) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [status, setStatus] = useState<WorkStatus>(item?.status ?? "not_started");
  const [picContactId, setPicContactId] = useState(item?.pic_contact_id ?? "");
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
      pic_contact_id: picContactId || null,
      trigger_on: triggerOn || null,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <button onClick={onClose} aria-label="Close work item" className="absolute inset-0 bg-canvas/75 backdrop-blur-sm" />
      <form onSubmit={submit} className="relative z-10 w-full max-w-xl rounded-xl border border-line-strong bg-surface shadow-soft">
        <header className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div>
            <div className="text-[9px] mono uppercase tracking-[0.14em] text-accent">
              {item ? "Work item" : "New work item"}
            </div>
            <h3 className="text-lg font-display text-ink mt-0.5">
              {item ? "Details" : "Add to inventory"}
            </h3>
          </div>
          <button type="button" onClick={onClose}
            className="w-7 h-7 rounded-md grid place-items-center text-muted hover:bg-surface-3 hover:text-ink cursor-pointer"
            aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="m6 6 12 12M18 6 6 18" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="p-5 space-y-4">
          <label className="block">
            <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted block mb-1">Title</span>
            <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to be done?"
              className="w-full h-10 rounded-md border border-line bg-canvas px-3 text-[13px] text-ink focus:border-accent focus:outline-none" />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted block mb-1">Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as WorkStatus)}
                className="w-full h-10 rounded-md border border-line bg-canvas px-3 text-[13px] text-ink cursor-pointer focus:border-accent focus:outline-none">
                {COLUMNS.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted block mb-1">
                Next-step trigger
              </span>
              <div className="relative">
                <input
                  type="date"
                  value={triggerOn}
                  onChange={(event) => setTriggerOn(event.target.value)}
                  className="w-full h-10 rounded-md border border-line bg-canvas px-3 pr-8 text-[13px] text-ink cursor-pointer focus:border-accent focus:outline-none"
                />
                {triggerOn && (
                  <button
                    type="button"
                    onClick={() => setTriggerOn("")}
                    aria-label="Clear trigger date"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded grid place-items-center text-muted hover:bg-surface-3 hover:text-ink cursor-pointer"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="m6 6 12 12M18 6 6 18" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
              <span className="mt-1 block text-[10.5px] text-muted">
                When this step should be triggered (deadline).
              </span>
            </label>
          </div>
          <label className="block">
            <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted block mb-1">
              PIC
            </span>
            <select
              value={picContactId}
              onChange={(event) => setPicContactId(event.target.value)}
              className="w-full h-10 rounded-md border border-line bg-canvas px-3 text-[13px] text-ink cursor-pointer focus:border-accent focus:outline-none"
            >
              <option value="">None</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.full_name}{contact.role_title ? ` — ${contact.role_title}` : ""}
                </option>
              ))}
            </select>
            {contacts.length === 0 && (
              <span className="mt-1 block text-[10.5px] text-muted">
                Add a contact to this factory before assigning a PIC.
              </span>
            )}
          </label>
          <label className="block">
            <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted block mb-1">Body</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)}
              rows={9} placeholder="Add the detailed work item context…"
              className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-[13px] text-ink leading-relaxed resize-y focus:border-accent focus:outline-none" />
          </label>
        </div>

        <footer className="flex items-center gap-2 px-5 py-3 border-t border-line bg-surface-2/40 rounded-b-xl">
          {onDelete && (
            <button type="button" onClick={onDelete}
              className="h-9 px-4 rounded-full border border-[color:var(--color-danger)]/35 text-[12px] text-[color:var(--color-danger)] hover:tint-danger cursor-pointer">
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose}
            className="h-9 px-4 rounded-full border border-line-strong bg-surface text-[12px] text-ink-soft hover:text-ink cursor-pointer">
            Cancel
          </button>
          <button type="submit" disabled={saving || !title.trim()}
            className="h-9 px-5 rounded-full bg-accent hover:bg-[#3a51ff] disabled:opacity-50 text-white text-[12px] font-medium cursor-pointer">
            {saving ? "Saving…" : "Save"}
          </button>
        </footer>
      </form>
    </div>
  );
}
