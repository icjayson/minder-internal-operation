"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/app/components/page-header";
import {
  SHARED_CONTEXT_CATEGORIES,
  SHARED_CONTEXT_DEFINITIONS,
  type SharedContextCategory,
  type SharedContextKey,
} from "@/lib/shared-context";
import { supabase } from "@/lib/supabase";
import type { SharedContext, SharedContextFile } from "@/lib/types";

const BUCKET = "context-files";

export default function AIContextPage() {
  const [category, setCategory] = useState<SharedContextCategory>("product");
  const [contexts, setContexts] = useState<SharedContext[]>([]);
  const [files, setFiles] = useState<SharedContextFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [saving, setSaving] = useState<SharedContextKey | null>(null);
  const [saved, setSaved] = useState<SharedContextKey | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const sb = supabase();
    const [contextResult, filesResult] = await Promise.all([
      sb.from("shared_contexts").select("*").order("sort_order"),
      sb.from("shared_context_files").select("*").order("created_at", { ascending: false }),
    ]);

    if (contextResult.error) {
      setSchemaMissing(isMissingTableError(contextResult.error.message));
      setError(contextResult.error.message);
      return;
    }

    setSchemaMissing(false);
    setError(filesResult.error?.message ?? null);
    const current = (contextResult.data ?? []) as SharedContext[];
    const existing = new Set(current.map((row) => row.context_key));
    const missing = SHARED_CONTEXT_DEFINITIONS.filter((definition) => !existing.has(definition.key));

    if (missing.length) {
      const { error: seedError } = await sb.from("shared_contexts").insert(
        missing.map((definition) => ({
          context_key: definition.key,
          category: definition.category,
          title: definition.label,
          body: definition.defaultBody,
          active: true,
          sort_order: SHARED_CONTEXT_DEFINITIONS.indexOf(definition),
        })),
      );
      if (seedError) {
        setError(seedError.message);
      } else {
        const { data } = await sb.from("shared_contexts").select("*").order("sort_order");
        setContexts((data ?? []) as SharedContext[]);
      }
    } else {
      setContexts(current);
    }
    setFiles((filesResult.data ?? []) as SharedContextFile[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function editContext(key: SharedContextKey, patch: Partial<SharedContext>) {
    setContexts((current) =>
      current.map((context) => (context.context_key === key ? { ...context, ...patch } : context)),
    );
    setSaved(null);
  }

  async function saveContext(key: SharedContextKey) {
    const context = contexts.find((row) => row.context_key === key);
    if (!context) return;
    setSaving(key);
    setError(null);
    const { error: saveError } = await supabase()
      .from("shared_contexts")
      .update({ body: context.body, active: context.active })
      .eq("id", context.id);
    setSaving(null);
    if (saveError) {
      setError(saveError.message);
    } else {
      setSaved(key);
      window.setTimeout(() => setSaved((current) => (current === key ? null : current)), 1800);
    }
  }

  async function extract(itemId: string) {
    try {
      const response = await fetch("/api/context/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, shared: true }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) setError(result.error ?? `Extraction failed (HTTP ${response.status})`);
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : "Extraction failed");
    }
    await load();
  }

  async function uploadFiles(fileList: FileList) {
    setUploading(true);
    setError(null);
    const sb = supabase();
    try {
      for (const file of Array.from(fileList)) {
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const storagePath = `shared/${category}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await sb.storage.from(BUCKET).upload(storagePath, file);
        if (uploadError) {
          setError(uploadError.message);
          continue;
        }
        const { data, error: insertError } = await sb
          .from("shared_context_files")
          .insert({
            category,
            title: file.name,
            file_name: file.name,
            mime_type: file.type || null,
            byte_size: file.size,
            storage_path: storagePath,
            extraction_status: "pending",
          })
          .select("id")
          .single();
        if (insertError) {
          await sb.storage.from(BUCKET).remove([storagePath]);
          setError(insertError.message);
          continue;
        }
        await load();
        if (data?.id) await extract(data.id);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeFile(file: SharedContextFile) {
    if (!window.confirm(`Remove “${file.file_name ?? file.title ?? "this file"}” from shared context?`)) return;
    const sb = supabase();
    const { error: storageError } = await sb.storage.from(BUCKET).remove([file.storage_path]);
    const { error: deleteError } = await sb.from("shared_context_files").delete().eq("id", file.id);
    setError(deleteError?.message ?? storageError?.message ?? null);
    await load();
  }

  const definitions = SHARED_CONTEXT_DEFINITIONS.filter((item) => item.category === category);
  const categoryFiles = files.filter((file) => file.category === category);
  const currentCategory = SHARED_CONTEXT_CATEGORIES[category];

  return (
    <>
      <PageHeader
        eyebrow="AI context"
        title="Shared context layer"
        subtitle="Edit the site-wide source of truth used by scoring, recommendations, summaries and message generation."
      />

      <div className="max-w-5xl space-y-5 px-8 py-5">
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-surface p-1.5">
          {(Object.entries(SHARED_CONTEXT_CATEGORIES) as [
            SharedContextCategory,
            (typeof SHARED_CONTEXT_CATEGORIES)[SharedContextCategory],
          ][]).map(([key, item]) => {
            const active = category === key;
            return (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`rounded-md px-4 py-3 text-left transition-colors cursor-pointer ${
                  active ? "bg-surface-3 text-ink shadow-sm" : "text-ink-soft hover:bg-surface-2"
                }`}
              >
                <span className="block text-[10px] mono uppercase tracking-[0.14em] text-accent">
                  {item.label}
                </span>
                <span className="mt-1 block text-[12px] text-muted">{item.description}</span>
              </button>
            );
          })}
        </div>

        {schemaMissing && (
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-[12.5px] text-ink-soft">
            Shared context tables are not installed yet. Run{" "}
            <code className="mono text-amber-500">supabase/017_shared_ai_context.sql</code> in the Supabase SQL
            Editor, then reload this page. Until then, AI routes continue using the checked-in defaults.
          </div>
        )}
        {error && !schemaMissing && (
          <div className="rounded-lg border border-[color:var(--color-danger)]/30 tint-danger px-4 py-3 text-[12.5px] text-[color:var(--color-danger)]">
            {error}
          </div>
        )}

        <section>
          <div className="mb-3">
            <h2 className="text-[10px] mono uppercase tracking-[0.14em] text-muted">
              {currentCategory.label} context
            </h2>
            <p className="mt-1 text-[12px] text-ink-soft">
              Changes apply to future AI runs. Disabled blocks fall back to the checked-in default.
            </p>
          </div>

          <div className="space-y-3">
            {definitions.map((definition) => {
              const context = contexts.find((row) => row.context_key === definition.key);
              return (
                <article key={definition.key} className="rounded-lg border border-line bg-surface p-4">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[12px] mono font-medium tracking-[0.04em] text-ink">
                        {definition.label}
                      </h3>
                      <p className="mt-1 text-[11.5px] text-muted">{definition.description}</p>
                    </div>
                    <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted">
                      <input
                        type="checkbox"
                        checked={context?.active ?? true}
                        disabled={!context}
                        onChange={(event) => editContext(definition.key, { active: event.target.checked })}
                      />
                      active
                    </label>
                  </div>
                  <textarea
                    value={context?.body ?? definition.defaultBody}
                    disabled={!context}
                    rows={Math.min(14, Math.max(6, (context?.body ?? definition.defaultBody).split("\n").length + 2))}
                    onChange={(event) => editContext(definition.key, { body: event.target.value })}
                    className="w-full resize-y rounded-md border border-line bg-canvas px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-soft focus:border-accent focus:outline-none disabled:opacity-60"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => saveContext(definition.key)}
                      disabled={!context || saving === definition.key}
                      className="h-7 min-w-20 rounded-full bg-accent px-3 text-[11.5px] font-medium text-white hover:bg-[#3a51ff] disabled:opacity-60 cursor-pointer"
                    >
                      {saving === definition.key ? "Saving…" : saved === definition.key ? "Saved ✓" : "Save"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[10px] mono uppercase tracking-[0.14em] text-muted">
                {currentCategory.label} files
              </h2>
              <p className="mt-1 text-[12px] text-ink-soft">
                Uploaded files are extracted to text and appended to this category in future AI runs.
              </p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={schemaMissing || uploading}
              className="h-8 shrink-0 rounded-full bg-accent px-4 text-[11.5px] font-medium text-white hover:bg-[#3a51ff] disabled:opacity-60 cursor-pointer"
            >
              {uploading ? "Uploading…" : "Upload context"}
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              accept=".txt,.md,.csv,.tsv,.json,.log,.pdf,.docx,image/*"
              onChange={(event) => event.target.files?.length && void uploadFiles(event.target.files)}
            />
          </div>

          <div className="mt-4 space-y-2">
            {categoryFiles.length === 0 ? (
              <p className="rounded-md border border-dashed border-line px-3 py-5 text-center text-[12px] text-muted">
                No shared files in this category yet.
              </p>
            ) : (
              categoryFiles.map((file) => (
                <SharedFileRow
                  key={file.id}
                  file={file}
                  onRetry={() => void extract(file.id)}
                  onDelete={() => void removeFile(file)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function SharedFileRow({
  file,
  onRetry,
  onDelete,
}: {
  file: SharedContextFile;
  onRetry: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const retryable = file.extraction_status === "failed" || file.extraction_status === "unsupported";
  return (
    <div className="rounded-md border border-line bg-surface-2/40 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="shrink-0 text-muted">
          <path d="M6 2h8l4 4v16H6V2Z" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M14 2v5h5" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium text-ink">
            {file.file_name ?? file.title ?? "Context file"}
          </p>
          <p className="text-[10px] mono text-muted">{formatBytes(file.byte_size)}</p>
        </div>
        <span className={`text-[10px] mono uppercase ${statusColour(file.extraction_status)}`}>
          {statusLabel(file.extraction_status)}
        </span>
        {retryable && (
          <button onClick={onRetry} className="text-[10.5px] text-accent hover:underline cursor-pointer">
            Retry
          </button>
        )}
        {file.body && (
          <button onClick={() => setOpen((current) => !current)} className="text-[10.5px] text-ink-soft hover:text-ink cursor-pointer">
            {open ? "Hide text" : "View text"}
          </button>
        )}
        <button onClick={onDelete} className="text-[10.5px] text-muted hover:text-[color:var(--color-danger)] cursor-pointer">
          Remove
        </button>
      </div>
      {open && file.body && (
        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-canvas p-3 text-[11px] leading-relaxed text-ink-soft">
          {file.body}
        </pre>
      )}
    </div>
  );
}

function isMissingTableError(message: string): boolean {
  const value = message.toLowerCase();
  return value.includes("shared_contexts") && (value.includes("schema cache") || value.includes("does not exist"));
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusLabel(status: SharedContextFile["extraction_status"]): string {
  if (status === "done") return "Text ✓";
  if (status === "pending") return "Extracting…";
  if (status === "failed") return "Failed";
  if (status === "unsupported") return "Unsupported";
  return status;
}

function statusColour(status: SharedContextFile["extraction_status"]): string {
  if (status === "done") return "text-accent";
  if (status === "failed" || status === "unsupported") return "text-[color:var(--color-danger)]";
  return "text-muted";
}
