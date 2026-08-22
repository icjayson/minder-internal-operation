"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  contextFileFormat,
  contextFileLabels,
  contextLinkLabels,
  filterAndSortContextItems,
  sortContextItemsLatestFirst,
  type ContextSortOrder,
  type ContextTypeFilter,
} from "@/lib/context-item";
import type { ContextEntityType, ContextItem } from "@/lib/types";
import { supabase } from "@/lib/supabase";

const BUCKET = "context-files";

export function ContextPanel({
  entityType,
  entityId,
  summary,
  onStats,
}: {
  entityType: ContextEntityType;
  entityId: string;
  summary?: string | null;
  onStats?: (stats: { count: number; latestAt: string | null }) => void;
}) {
  const [items, setItems] = useState<ContextItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingText, setAddingText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryOverride, setSummaryOverride] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ContextTypeFilter>("all");
  const [sortOrder, setSortOrder] = useState<ContextSortOrder>("latest");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase()
      .from("context_items")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("updated_at", { ascending: false });
    if (error) setError(error.message);
    const rows = sortContextItemsLatestFirst((data ?? []) as ContextItem[]);
    setItems(rows);
    const latestAt = rows.reduce<string | null>((acc, r) => (acc && acc > r.updated_at ? acc : r.updated_at), null);
    onStats?.({ count: rows.length, latestAt });
  }, [entityType, entityId, onStats]);

  useEffect(() => { load(); }, [load]);

  async function regenerateSummary() {
    setSummarizing(true);
    setError(null);
    try {
      const res = await fetch("/api/summarize-entity", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (data.summary) setSummaryOverride(data.summary as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Summary failed");
    } finally {
      setSummarizing(false);
    }
  }

  const shownSummary = summaryOverride ?? summary;

  async function addText(title: string, body: string) {
    if (!body.trim() && !title.trim()) return;
    setError(null);
    const { error } = await supabase().from("context_items").insert({
      entity_type: entityType, entity_id: entityId, kind: "text",
      title: title.trim() || null, body: body.trim() || null, extraction_status: "done",
    });
    if (error) setError(error.message);
    setAddingText(false);
    await load();
  }

  async function updateText(id: string, patch: { title?: string | null; body?: string | null }) {
    setItems((prev) => prev?.map((i) => (i.id === id ? { ...i, ...patch } : i)) ?? prev);
    const { error } = await supabase().from("context_items").update(patch).eq("id", id);
    if (error) setError(error.message);
    setEditId(null);
  }

  async function extract(itemId: string) {
    try {
      await fetch("/api/context/extract", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
    } catch { /* status stays pending; user can retry */ }
    await load();
  }

  async function uploadFiles(files: FileList) {
    setBusy(true);
    setError(null);
    try {
      const sb = supabase();
      for (const file of Array.from(files)) {
        const safe = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${entityType}/${entityId}/${crypto.randomUUID()}-${safe}`;
        const { error: upErr } = await sb.storage.from(BUCKET).upload(path, file, { upsert: false });
        if (upErr) { setError(upErr.message); continue; }
        const { data: row, error: insErr } = await sb.from("context_items").insert({
          entity_type: entityType, entity_id: entityId, kind: "file",
          title: file.name, file_name: file.name, mime_type: file.type || null,
          byte_size: file.size, storage_path: path, extraction_status: "pending",
        }).select("id").single();
        if (insErr) { setError(insErr.message); continue; }
        await load();
        if (row?.id) await extract(row.id);
      }
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeItem(item: ContextItem) {
    if (item.source === "fde-kit") return;
    if (!confirm(`Remove “${item.title ?? item.file_name ?? "this item"}” from context?`)) return;
    setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? prev);
    const sb = supabase();
    if (item.kind === "file" && item.storage_path) await sb.storage.from(BUCKET).remove([item.storage_path]);
    const { error } = await sb.from("context_items").delete().eq("id", item.id);
    if (error) setError(error.message);
    await load();
  }

  const fileCount = items?.filter((i) => i.kind === "file").length ?? 0;
  const textCount = items?.filter((i) => i.kind === "text").length ?? 0;
  const linkCount = items?.filter((i) => i.kind === "link").length ?? 0;
  const visibleItems = filterAndSortContextItems(items ?? [], typeFilter, sortOrder);

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] mono uppercase tracking-[0.14em] text-muted font-medium">
          Context {items ? `· ${items.length}` : ""}
        </h3>
        <div className="flex items-center gap-1.5">
          <button onClick={() => { setAddingText(true); setEditId(null); }}
            className="h-7 px-3 rounded-full border border-line-strong bg-surface-2 hover:bg-surface-3 text-[11.5px] font-medium text-ink-soft hover:text-ink cursor-pointer">
            + Text
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={busy}
            className="h-7 px-3 rounded-full bg-accent hover:bg-[#3a51ff] text-white text-[11.5px] font-medium cursor-pointer disabled:opacity-60 inline-flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 15V3m0 0 4 4m-4-4L8 7M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {busy ? "Uploading…" : "Upload"}
          </button>
          <input ref={fileRef} type="file" multiple hidden
            onChange={(e) => e.target.files && e.target.files.length && uploadFiles(e.target.files)} />
        </div>
      </div>

      <p className="text-[11px] text-muted mb-2.5">
        Files, links &amp; notes for <span className="text-ink-soft">this {entityType}</span> only — feeds its AI scoring &amp; recommendations (from Phase 3). {fileCount} file{fileCount === 1 ? "" : "s"} · {linkCount} link{linkCount === 1 ? "" : "s"} · {textCount} note{textCount === 1 ? "" : "s"}.
      </p>

      {error && (
        <div className="mb-2 rounded-md border border-[color:var(--color-danger)]/30 tint-danger px-3 py-1.5 text-[11.5px] text-[color:var(--color-danger)]">{error}</div>
      )}

      {/* AI summary of this entity's context */}
      <div className="mb-3 rounded-md border border-line bg-surface-2/50 px-3 py-2.5">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[9px] mono uppercase tracking-[0.14em] text-accent">✦ Summary</div>
          <button onClick={regenerateSummary} disabled={summarizing}
            className="h-6 px-2.5 rounded-full border border-line-strong bg-surface hover:bg-surface-3 text-[10.5px] font-medium text-ink-soft hover:text-ink cursor-pointer disabled:opacity-60">
            {summarizing ? "Summarising…" : shownSummary ? "Regenerate" : "Generate"}
          </button>
        </div>
        {shownSummary ? (
          <p className="text-[12.5px] text-ink-soft leading-relaxed whitespace-pre-wrap">{shownSummary}</p>
        ) : (
          <p className="text-[12px] text-muted">Generate an AI recap of everything below — what you know, what you&apos;ve done, and the next step.</p>
        )}
      </div>

      <div className="mb-2.5 flex flex-wrap items-center justify-end gap-2">
        <label className="flex items-center gap-1.5 text-[10px] mono uppercase tracking-wider text-muted">
          Type
          <select
            aria-label="Filter context by type"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as ContextTypeFilter)}
            className="h-8 rounded-md border border-line bg-surface px-2.5 text-[11.5px] normal-case tracking-normal text-ink focus:border-line-strong focus:outline-none"
          >
            <option value="all">All</option>
            <option value="file">Files</option>
            <option value="link">Links</option>
            <option value="text">Notes</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-[10px] mono uppercase tracking-wider text-muted">
          Sort
          <select
            aria-label="Sort context items"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as ContextSortOrder)}
            className="h-8 rounded-md border border-line bg-surface px-2.5 text-[11.5px] normal-case tracking-normal text-ink focus:border-line-strong focus:outline-none"
          >
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
          </select>
        </label>
      </div>

      {/* Add-text form */}
      {addingText && <TextForm onCancel={() => setAddingText(false)} onSave={addText} />}

      {/* Artifacts list */}
      {items === null ? (
        <p className="text-[12px] text-muted">Loading…</p>
      ) : items.length === 0 && !addingText ? (
        <p className="text-[12px] text-muted">No context yet. Upload research, call notes or screenshots, or add a text note.</p>
      ) : visibleItems.length === 0 && !addingText ? (
        <p className="text-[12px] text-muted">No context items match this filter.</p>
      ) : (
        <div className="space-y-1.5">
          {visibleItems.map((item) =>
            item.kind === "text" ? (
              editId === item.id ? (
                <TextForm key={item.id} initial={item} onCancel={() => setEditId(null)}
                  onSave={(title, body) => updateText(item.id, { title: title.trim() || null, body: body.trim() || null })} />
              ) : (
                <TextCard key={item.id} item={item} readOnly={item.source === "fde-kit"} onEdit={() => { setEditId(item.id); setAddingText(false); }} onDelete={() => removeItem(item)} />
              )
            ) : item.kind === "link" ? (
              <LinkCard key={item.id} item={item} onDelete={() => removeItem(item)} />
            ) : (
              <FileCard key={item.id} item={item} readOnly={item.source === "fde-kit"} onRetry={() => extract(item.id)} onDelete={() => removeItem(item)} />
            ),
          )}
        </div>
      )}
    </section>
  );
}

function TextForm({
  initial, onSave, onCancel,
}: {
  initial?: ContextItem;
  onSave: (title: string, body: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  return (
    <div className="mb-2 rounded-md border border-line-strong bg-surface-2/60 p-2.5 space-y-2">
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional) — e.g. Call 12 Jul, Site audit…"
        className="w-full h-8 rounded-md border border-line bg-canvas px-2 text-[12.5px] text-ink focus:border-accent focus:outline-none" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Paste notes, findings, transcript…"
        className="w-full rounded-md border border-line bg-canvas px-2 py-1.5 text-[12.5px] text-ink leading-relaxed resize-y focus:border-accent focus:outline-none" />
      <div className="flex gap-2">
        <button onClick={() => onSave(title, body)} className="h-7 px-3 rounded-full bg-accent hover:bg-[#3a51ff] text-white text-[11.5px] font-medium cursor-pointer">Save</button>
        <button onClick={onCancel} className="h-7 px-3 rounded-full border border-line-strong bg-surface text-[11.5px] text-ink-soft cursor-pointer">Cancel</button>
      </div>
    </div>
  );
}

function TextCard({ item, readOnly, onEdit, onDelete }: { item: ContextItem; readOnly?: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="group rounded-md border border-line bg-surface px-3 py-2 hover:border-line-strong">
      <div className="flex items-center gap-2">
        <IconText />
        <button onClick={readOnly ? undefined : onEdit} className="min-w-0 flex-1 text-left cursor-pointer">
          <span className="text-[12.5px] font-medium text-ink truncate block">{item.title || "Note"}</span>
        </button>
        <span className="text-[10px] mono text-muted shrink-0">{relTime(item.updated_at)}</span>
        {readOnly ? <span className="text-[9px] mono uppercase tracking-wider text-muted">synced</span> : <RowDelete onDelete={onDelete} />}
      </div>
      {item.body && <p className="mt-1 text-[12px] text-ink-soft leading-relaxed line-clamp-3 whitespace-pre-wrap">{item.body}</p>}
    </div>
  );
}

function FileCard({ item, readOnly, onRetry, onDelete }: { item: ContextItem; readOnly?: boolean; onRetry: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const isImg = (item.mime_type ?? "").startsWith("image/");
  async function download() {
    if (!item.storage_path || downloading) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase().storage.from(BUCKET).createSignedUrl(item.storage_path, 60, { download: item.file_name ?? true });
      if (error || !data) { alert(`Download failed: ${error?.message ?? "no URL"}`); return; }
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = item.file_name ?? "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setDownloading(false);
    }
  }
  useEffect(() => {
    if (!open || !isImg || previewUrl || previewError || !item.storage_path) return;
    let active = true;
    void supabase().storage.from(BUCKET).createSignedUrl(item.storage_path, 3600).then(({ data, error }) => {
      if (!active) return;
      if (error || !data) setPreviewError(true);
      else setPreviewUrl(data.signedUrl);
    });
    return () => { active = false; };
  }, [open, isImg, previewUrl, previewError, item.storage_path]);
  const labels = contextFileLabels(item);
  const fileFormat = contextFileFormat(item);
  const fileSize = formatBytes(item.byte_size);
  const canToggle = (isImg && !!item.storage_path) || (item.extraction_status === "done" && !!item.body);
  return (
    <div className="group rounded-md border border-line bg-surface px-3 py-2 hover:border-line-strong">
      <div className="flex items-center gap-2">
        {isImg ? <IconImage /> : <IconFile />}
        <div className="min-w-0 flex-1">
          {labels.heading && <span className="text-[12.5px] font-medium text-ink truncate block">{labels.heading}</span>}
          <span className={`${labels.heading ? "text-[11.5px] text-ink-soft" : "text-[12.5px] font-medium text-ink"} truncate block`}>{labels.fileName}</span>
          <span className="text-[10px] mono text-muted">{fileSize}{fileSize ? " - " : ""}{fileFormat}</span>
        </div>
        <StatusBadge status={item.extraction_status} onRetry={onRetry} readOnly={readOnly} />
        {item.storage_path && (
          <button onClick={download} disabled={downloading} title="Download file" aria-label="Download file"
            className="w-6 h-6 rounded-md grid place-items-center text-muted hover:text-ink hover:bg-surface-3 cursor-pointer disabled:opacity-50">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
        {canToggle && (
          <button onClick={() => setOpen((o) => !o)}
            title={open ? (isImg ? "Hide preview" : "Hide text") : (isImg ? "Show preview" : "Show extracted text")}
            aria-label={isImg ? "Toggle image preview" : "Toggle extracted text"}
            className="w-6 h-6 rounded-md grid place-items-center text-muted hover:text-ink hover:bg-surface-3 cursor-pointer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`transition-transform ${open ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
        <span className="text-[10px] mono text-muted shrink-0">{relTime(item.updated_at)}</span>
        {readOnly ? <span className="text-[9px] mono uppercase tracking-wider text-muted">synced</span> : <RowDelete onDelete={onDelete} />}
      </div>
      {open && isImg && (
        <div className="mt-2">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={item.file_name ?? "image preview"} className="max-h-72 w-auto max-w-full rounded border border-line" />
          ) : (
            <p className="text-[11px] text-muted px-1 py-2">{previewError ? "Preview unavailable" : "Loading preview…"}</p>
          )}
        </div>
      )}
      {open && !isImg && item.body && (
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-canvas border border-line px-2 py-1.5 text-[11px] text-ink-soft leading-relaxed whitespace-pre-wrap font-sans">{item.body.slice(0, 4000)}{item.body.length > 4000 ? "\n…" : ""}</pre>
      )}
    </div>
  );
}

function LinkCard({ item, onDelete }: { item: ContextItem; onDelete: () => void }) {
  const labels = contextLinkLabels(item);
  return (
    <div className="group rounded-md border border-line bg-surface px-3 py-2 hover:border-line-strong">
      <div className="flex items-center gap-2">
        <span className="text-muted" aria-hidden="true">↗</span>
        <div className="min-w-0 flex-1">
          {labels.heading && <span className="text-[12.5px] font-medium text-ink truncate block">{labels.heading}</span>}
          <a href={labels.href} target="_blank" rel="noreferrer" className="text-[12px] font-medium text-accent underline underline-offset-2 truncate block">{labels.label}</a>
          {!labels.heading && item.url && item.title && <p className="mt-1 text-[11px] text-muted truncate">{item.url}</p>}
        </div>
        <span className="text-[10px] mono text-muted shrink-0">{relTime(item.updated_at)}</span>
        {item.source === "fde-kit" ? <span className="text-[9px] mono uppercase tracking-wider text-muted">synced</span> : <RowDelete onDelete={onDelete} />}
      </div>
    </div>
  );
}

function StatusBadge({ status, onRetry, readOnly }: { status: ContextItem["extraction_status"]; onRetry: () => void; readOnly?: boolean }) {
  if (status === "pending")
    return <span className="text-[9.5px] mono uppercase tracking-wider text-[color:var(--color-warn)] animate-pulse shrink-0">extracting…</span>;
  if (status === "done")
    return <span className="text-[9.5px] mono uppercase tracking-wider text-accent shrink-0" title="Text extracted — feeds the AI">text ✓</span>;
  if (status === "failed" && readOnly)
    return <span className="text-[9.5px] mono uppercase tracking-wider text-[color:var(--color-danger)] shrink-0">failed</span>;
  if (status === "failed")
    return (
      <button onClick={onRetry} title="Extraction failed — click to retry"
        className="text-[9.5px] mono uppercase tracking-wider text-[color:var(--color-danger)] shrink-0 cursor-pointer hover:underline">retry</button>
    );
  if (status === "unsupported")
    return <span className="text-[9.5px] mono uppercase tracking-wider text-muted shrink-0" title="No text extracted — add a note describing it">no text</span>;
  return null;
}

function RowDelete({ onDelete }: { onDelete: () => void }) {
  return (
    <button onClick={onDelete} aria-label="Remove"
      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md grid place-items-center text-muted hover:text-[color:var(--color-danger)] cursor-pointer transition-opacity shrink-0">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

function IconFile() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-muted shrink-0"><path d="M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5Z" strokeWidth="1.5" strokeLinejoin="round" /></svg>;
}
function IconImage() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-muted shrink-0"><rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="1.5" /><circle cx="8.5" cy="9.5" r="1.5" strokeWidth="1.5" /><path d="m4 17 5-4 4 3 3-2 4 3" strokeWidth="1.5" strokeLinejoin="round" /></svg>;
}
function IconText() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-muted shrink-0"><path d="M4 6h16M4 12h16M4 18h10" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}

function formatBytes(n: number | null): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function relTime(iso: string): string {
  const d = new Date(iso).getTime();
  if (!Number.isFinite(d)) return "";
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
