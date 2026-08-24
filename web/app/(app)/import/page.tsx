"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GEO_OPTIONS, ROLE_CATEGORIES, ROLE_LEVELS, VERTICALS } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { effectiveContactRoleLevel } from "@/lib/contact-role";
import { supabase } from "@/lib/supabase";
import {
  contactIdentity,
  factoryIdentity,
  normalizeEmail,
  normalizeText,
  normalizeUrl,
  parseDelimited,
  normalizeWorkerBand,
} from "@/lib/import-normalization";
import { PageHeader } from "@/app/components/page-header";
import { Button } from "@/design-system/components/button";
import { Textarea } from "@/design-system/components/textarea";
import { NativeSelect, NativeSelectOption } from "@/design-system/components/native-select";
import { Card } from "@/design-system/components/card";

type Mapping = {
  factory: Record<string, string | null>;
  contact: Record<string, string | null>;
  vertical_column: string | null;
  vertical_map: Record<string, string>;
  geo_column: string | null;
  geo_map: Record<string, string>;
  notes?: string;
};

const FACTORY_FIELDS = [
  "name",
  "website_url",
  "hq_location",
  "frontline_workers",
  "description",
  "notes",
];
const CONTACT_FIELDS = [
  "full_name",
  "role_title",
  "email",
  "linkedin_url",
  "phone",
  "role_category",
  "role_level",
  "notes",
];

type ImportError = { row: number; message: string };
type ImportSummary = {
  factoriesCreated: number;
  factoriesUpdated: number;
  contactsCreated: number;
  contactsUpdated: number;
  skipped: number;
  scored: number;
  errors: ImportError[];
};

export default function ImportPage() {
  const { factories, contacts, verticals, reload } = useStore();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const analysisRequest = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => analysisRequest.current?.abort();
  }, []);

  function cancelAnalysisRequest() {
    analysisRequest.current?.abort();
    analysisRequest.current = null;
  }

  function parse(csv: string) {
    cancelAnalysisRequest();
    setBusy(null);
    const all = parseDelimited(csv);
    setHeaders(all[0] ?? []);
    setRows(all.slice(1).filter((r) => r.some((c) => c.trim())));
    setMapping(null);
    setResult(null);
    setError(null);
  }

  async function analyze() {
    cancelAnalysisRequest();
    const controller = new AbortController();
    analysisRequest.current = controller;
    setBusy("Analysing with AI…");
    setError(null);
    try {
      const res = await fetch("/api/map-csv", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers, samples: representativeRows(rows, 12) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "AI mapping failed");
      if (analysisRequest.current !== controller) return;
      setMapping(normalizeMapping(data));
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      if (analysisRequest.current === controller) {
        analysisRequest.current = null;
        setBusy(null);
      }
    }
  }

  function deleteAnalysis() {
    cancelAnalysisRequest();
    setText("");
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setMapping(null);
    setResult(null);
    setError(null);
    setBusy(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  const hIndex = useMemo(() => Object.fromEntries(headers.map((h, i) => [h, i])), [headers]);

  function resolveVertical(raw: string): string | null {
    if (!raw) return null;
    const key = mapping?.vertical_map?.[raw] ?? matchKey(raw, VERTICALS.map((v) => ({ key: v.key, text: `${v.key} ${v.name}` })));
    return verticals.find((v) => v.key === key)?.id ?? null;
  }
  function resolveGeo(raw: string): string | null {
    if (!raw) return null;
    return mapping?.geo_map?.[raw] ?? matchKey(raw, GEO_OPTIONS.map((g) => ({ key: g.key, text: `${g.key} ${g.label}` })));
  }
  function resolveRole(raw: string) {
    const key = matchKey(raw, ROLE_CATEGORIES.map((r) => ({ key: r.key, text: `${r.key} ${r.label}` })));
    const cat = ROLE_CATEGORIES.find((r) => r.key === key);
    return { role_category: cat?.key ?? null, role_level: cat?.level ?? null };
  }

  function transform(row: string[]) {
    const g = (h: string | null) => (h && hIndex[h] != null ? (row[hIndex[h]] ?? "").trim() : "");
    const m = mapping!;
    const factory: Record<string, unknown> = { source: "import" };
    for (const f of FACTORY_FIELDS) {
      const v = g(m.factory[f]);
      if (!v) continue;
      if (f === "frontline_workers") factory[f] = normalizeWorkerBand(v);
      else if (f === "website_url") factory[f] = normalizeUrl(v);
      else factory[f] = normalizeText(v);
    }
    if (m.vertical_column) factory.vertical_id = resolveVertical(g(m.vertical_column));
    if (m.geo_column) factory.geo_tier = resolveGeo(g(m.geo_column));

    const contact: Record<string, unknown> = {};
    for (const f of CONTACT_FIELDS) {
      const v = g(m.contact[f]);
      if (!v || f === "role_category" || f === "role_level") continue;
      if (f === "email") contact[f] = normalizeEmail(v);
      else if (f === "linkedin_url") contact[f] = normalizeUrl(v);
      else contact[f] = normalizeText(v);
    }
    const roleRaw = g(m.contact.role_category) || g(m.contact.role_title);
    if (roleRaw) Object.assign(contact, resolveRole(roleRaw));
    const levelRaw = g(m.contact.role_level).toLowerCase();
    if (ROLE_LEVELS.includes(levelRaw as (typeof ROLE_LEVELS)[number]))
      contact.role_level = levelRaw;
    contact.role_level = effectiveContactRoleLevel(
      typeof contact.role_title === "string" ? contact.role_title : null,
      (contact.role_level as (typeof ROLE_LEVELS)[number] | null | undefined) ?? null,
    );
    return { factory, contact };
  }

  async function runImport() {
    if (!mapping?.factory.name) return setError("Map the factory name column first.");
    setBusy("Importing…");
    setError(null);
    setResult(null);
    try {
      const sb = supabase();
      const summary: ImportSummary = {
        factoriesCreated: 0,
        factoriesUpdated: 0,
        contactsCreated: 0,
        contactsUpdated: 0,
        skipped: 0,
        scored: 0,
        errors: [],
      };
      const { data: job } = await sb
        .from("import_jobs")
        .insert({ file_name: fileName, total_rows: rows.length })
        .select("id")
        .maybeSingle();

      const existing = new Map<string, string>();
      (factories ?? []).forEach((f) => {
        existing.set(factoryIdentity(f.website_url, f.name, f.country), f.id);
        existing.set(factoryIdentity(null, f.name, f.country), f.id);
        existing.set(factoryIdentity(null, f.name, null), f.id);
      });
      const existingContacts = new Map<string, string>();
      (contacts ?? []).forEach((c) =>
        existingContacts.set(`${c.factory_id}|${contactIdentity(c)}`, c.id),
      );

      const groups = new Map<string, {
        factory: Record<string, unknown>;
        contacts: { data: Record<string, unknown>; row: number }[];
        rows: number[];
      }>();
      for (const [index, row] of rows.entries()) {
        const { factory, contact } = transform(row);
        const rowNumber = index + 2;
        if (!factory.name) {
          summary.skipped++;
          summary.errors.push({ row: rowNumber, message: "Missing factory name" });
          continue;
        }
        if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contact.email))) {
          summary.errors.push({ row: rowNumber, message: `Invalid contact email: ${contact.email}` });
          delete contact.email;
        }
        const key = factoryIdentity(factory.website_url, factory.name, null);
        if (!groups.has(key)) groups.set(key, { factory, contacts: [], rows: [] });
        const group = groups.get(key)!;
        group.factory = { ...group.factory, ...nonEmptyPatch(factory) };
        group.rows.push(rowNumber);
        if (contact.full_name) group.contacts.push({ data: contact, row: rowNumber });
      }

      const scoreIds = new Set<string>();
      for (const [key, group] of groups) {
        const { factory, contacts: groupContacts, rows: groupRows } = group;
        const fallbackKey = factoryIdentity(null, factory.name, null);
        let fid: string | undefined = existing.get(key) ?? existing.get(fallbackKey);
        if (!fid) {
          const { data, error } = await sb.from("factories").insert(factory).select("id").single();
          if (error || !data) {
            summary.skipped += groupRows.length;
            summary.errors.push({ row: groupRows[0], message: error?.message ?? "Factory insert failed" });
            continue;
          }
          fid = data.id as string;
          existing.set(key, fid);
          existing.set(fallbackKey, fid);
          summary.factoriesCreated++;
          scoreIds.add(fid);
        } else {
          const { error: updateError } = await sb
            .from("factories")
            .update(nonEmptyPatch(factory))
            .eq("id", fid);
          if (updateError)
            summary.errors.push({ row: groupRows[0], message: `Factory update: ${updateError.message}` });
          else {
            summary.factoriesUpdated++;
            scoreIds.add(fid);
          }
        }

        for (const contactRow of groupContacts) {
          const contact = contactRow.data;
          const identity = `${fid}|${contactIdentity(contact)}`;
          const contactId = existingContacts.get(identity);
          if (contactId) {
            const { error: updateError } = await sb
              .from("contacts")
              .update(nonEmptyPatch(contact))
              .eq("id", contactId);
            if (updateError)
              summary.errors.push({ row: contactRow.row, message: `Contact update: ${updateError.message}` });
            else summary.contactsUpdated++;
          } else {
            const { data, error: insertError } = await sb
              .from("contacts")
              .insert({ factory_id: fid, ...contact })
              .select("id")
              .single();
            if (insertError || !data)
              summary.errors.push({ row: contactRow.row, message: `Contact insert: ${insertError?.message ?? "failed"}` });
            else {
              existingContacts.set(identity, data.id as string);
              summary.contactsCreated++;
            }
          }
        }
      }

      const ids = [...scoreIds];
      for (let i = 0; i < ids.length; i += 3) {
        setBusy(`Scoring ${Math.min(i + 3, ids.length)} / ${ids.length} factories…`);
        const chunk = ids.slice(i, i + 3);
        const settled = await Promise.allSettled(chunk.map(async (id) => {
          const res = await fetch("/api/score-factory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ factoryId: id }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? `Score failed (${res.status})`);
          }
        }));
        settled.forEach((outcome, offset) => {
          if (outcome.status === "fulfilled") summary.scored++;
          else summary.errors.push({ row: 0, message: `Score ${chunk[offset]}: ${outcome.reason}` });
        });
      }

      if (job?.id) {
        await sb.from("import_jobs").update({
          status: summary.errors.length ? "completed_with_errors" : "completed",
          factories_created: summary.factoriesCreated,
          factories_updated: summary.factoriesUpdated,
          contacts_created: summary.contactsCreated,
          contacts_updated: summary.contactsUpdated,
          skipped_rows: summary.skipped,
          errors: summary.errors,
          completed_at: new Date().toISOString(),
        }).eq("id", job.id);
      }
      setResult(summary);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "import failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Import" title="Import CSV"
        subtitle="Drop a messy export from Clay / Apollo / Sales Navigator. AI restructures it to the factory + contact schema." />
      <div className="max-w-4xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <ImportProgress current={result ? 3 : mapping ? 2 : headers.length ? 1 : 0} />
        {error && <div className="rounded-md border border-[color:var(--color-danger)]/30 tint-danger px-3 py-2 text-[13px] text-[color:var(--color-danger)]">{error}</div>}

        {/* Step 1: input */}
        <Card className="gap-0 p-5">
          <h3 className="text-[10px] tabular-nums uppercase tracking-[0.14em] text-muted-foreground mb-3">1 · Paste or upload CSV</h3>
          <div className="flex items-center gap-2 mb-3">
            <label className="h-8 px-3 rounded-full border border-border-strong bg-muted hover:bg-accent text-[12px] font-medium text-foreground/80 cursor-pointer inline-flex items-center">
              Upload .csv
              <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    cancelAnalysisRequest();
                    const t = await f.text();
                    setFileName(f.name);
                    setText(t.replace(/^\uFEFF/, ""));
                    parse(t.replace(/^\uFEFF/, ""));
                  }
                }} />
            </label>
            {headers.length > 0 && <span className="text-[12px] text-foreground/80">{headers.length} columns · {rows.length} rows detected</span>}
          </div>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} onBlur={() => text && parse(text)} rows={5} placeholder="…or paste CSV text here (first line = headers)" className="w-full px-3 py-2 text-[12px] tabular-nums leading-relaxed resize-y" />
          <Button onClick={analyze} disabled={!headers.length || !!busy} className="mt-3 px-4">
            {busy === "Analysing with AI…" ? "Analysing…" : "Analyse with AI"}
          </Button>
          {mapping && (
            <button onClick={deleteAnalysis} disabled={!!busy}
              title="Clear the uploaded CSV and its AI mapping. Imported records are not deleted."
              className="mt-3 ml-2 h-9 px-4 rounded-full border border-[color:var(--color-danger)]/40 bg-card hover:tint-danger disabled:opacity-60 text-[13px] font-medium text-[color:var(--color-danger)] cursor-pointer">
              Delete analysis
            </button>
          )}
        </Card>

        {/* Step 2: mapping */}
        {mapping && (
          <Card className="gap-0 p-5">
            <h3 className="text-[10px] tabular-nums uppercase tracking-[0.14em] text-muted-foreground mb-3">2 · Review the AI mapping</h3>
            {mapping.notes && <p className="text-[12px] text-foreground/80 mb-3">{mapping.notes}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              <MapGroup title="Factory">
                {FACTORY_FIELDS.map((f) => (
                  <MapRow key={f} label={f} value={mapping.factory[f]} headers={headers}
                    onChange={(v) => setMapping({ ...mapping, factory: { ...mapping.factory, [f]: v } })} />
                ))}
                <MapRow label="vertical (col)" value={mapping.vertical_column} headers={headers}
                  onChange={(v) => setMapping({ ...mapping, vertical_column: v })} />
                <MapRow label="geo (col)" value={mapping.geo_column} headers={headers}
                  onChange={(v) => setMapping({ ...mapping, geo_column: v })} />
              </MapGroup>
              <MapGroup title="Contact">
                {CONTACT_FIELDS.map((f) => (
                  <MapRow key={f} label={f} value={mapping.contact[f]} headers={headers}
                    onChange={(v) => setMapping({ ...mapping, contact: { ...mapping.contact, [f]: v } })} />
                ))}
              </MapGroup>
            </div>
          </Card>
        )}

        {/* Step 3: preview + import */}
        {mapping && (
          <Card className="gap-0 p-5">
            <h3 className="text-[10px] tabular-nums uppercase tracking-[0.14em] text-muted-foreground mb-3">3 · Preview & import</h3>
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-muted-foreground">
                    {["Factory", "Vertical", "Contact", "Role", "Email"].map((h) => (
                      <th key={h} className="text-left tabular-nums uppercase tracking-wider text-[10px] px-2 py-1">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 6).map((r, i) => {
                    const t = transform(r);
                    const vName = verticals.find((v) => v.id === t.factory.vertical_id)?.name ?? "—";
                    return (
                      <tr key={i} className="border-t border-border/60">
                        <td className="px-2 py-1.5 text-foreground">{String(t.factory.name ?? "—")}</td>
                        <td className="px-2 py-1.5 text-foreground/80">{vName}</td>
                        <td className="px-2 py-1.5 text-foreground/80">{String(t.contact.full_name ?? "—")}</td>
                        <td className="px-2 py-1.5 text-foreground/80">{String(t.contact.role_title ?? "—")}</td>
                        <td className="px-2 py-1.5 text-foreground/80 tabular-nums">{String(t.contact.email ?? "—")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Button onClick={runImport} disabled={!!busy} className="px-5">
              {busy === "Importing…" ? "Importing…" : `Import ${rows.length} rows`}
            </Button>
            {result && (
              <div className="mt-4 rounded-md border border-border bg-muted/50 p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                  <ResultStat label="Factories created" value={result.factoriesCreated} />
                  <ResultStat label="Factories updated" value={result.factoriesUpdated} />
                  <ResultStat label="Contacts created" value={result.contactsCreated} />
                  <ResultStat label="Contacts updated" value={result.contactsUpdated} />
                  <ResultStat label="Rows skipped" value={result.skipped} />
                  <ResultStat label="Factories scored" value={result.scored} />
                  <ResultStat label="Warnings/errors" value={result.errors.length} />
                </div>
                {result.errors.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => downloadErrors(result.errors)} className="mt-3 h-7 px-3 rounded-full text-[11px] text-foreground/80">
                    Download row errors (.csv)
                  </Button>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </>
  );
}

// ── helpers ─────────────────────────────────────────────
function ImportProgress({ current }: { current: number }) {
  const steps = ["Upload", "Map columns", "Review", "Complete"];
  return (
    <Card className="gap-0 px-4 py-4 shadow-mo-soft" aria-label="Import progress">
      <div className="relative grid grid-cols-4">
        <span className="absolute left-[12.5%] right-[12.5%] top-3 h-0.5 bg-border-strong" aria-hidden>
          <span className="block h-full bg-primary transition-[width] duration-300" style={{ width: `${(current / (steps.length - 1)) * 100}%` }} />
        </span>
        {steps.map((step, index) => (
          <div key={step} className="relative z-[1] flex flex-col items-center text-center">
            <span className={`grid h-6 w-6 place-items-center rounded-full border text-[10px] font-semibold ${index < current ? "border-primary bg-primary text-primary-foreground" : index === current ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary-tint" : "border-border-strong bg-card text-muted-foreground"}`}>{index < current ? "✓" : index + 1}</span>
            <span className={`mt-2 text-[10.5px] ${index === current ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{step}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MapGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] tabular-nums uppercase tracking-wider text-primary mb-1.5">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function MapRow({ label, value, headers, onChange }: { label: string; value: string | null; headers: string[]; onChange: (v: string | null) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-32 shrink-0 text-[11px] text-foreground/80 truncate">{label}</span>
      <NativeSelect value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} className="flex-1 h-8 px-2 text-[12px]">
        <NativeSelectOption value="">— none —</NativeSelectOption>
        {headers.map((h) => <NativeSelectOption key={h} value={h}>{h}</NativeSelectOption>)}
      </NativeSelect>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/60 bg-background px-2 py-1.5">
      <div className="tabular-nums uppercase tracking-wider text-[9px] text-muted-foreground">{label}</div>
      <div className="tabular-nums text-[15px] text-foreground">{value}</div>
    </div>
  );
}

function normalizeMapping(d: Partial<Mapping>): Mapping {
  return {
    factory: d.factory ?? {},
    contact: d.contact ?? {},
    vertical_column: d.vertical_column ?? null,
    vertical_map: d.vertical_map ?? {},
    geo_column: d.geo_column ?? null,
    geo_map: d.geo_map ?? {},
    notes: d.notes,
  };
}

function matchKey(raw: string, opts: { key: string; text: string }[]): string | null {
  const r = raw.toLowerCase();
  for (const o of opts) {
    const words = o.text.toLowerCase().split(/[\s_/&]+/).filter((w) => w.length > 3);
    if (words.some((w) => r.includes(w) || w.includes(r))) return o.key;
  }
  return null;
}

function nonEmptyPatch(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) =>
      value !== undefined
      && value !== null
      && value !== ""
      && (!Array.isArray(value) || value.length > 0),
    ),
  );
}

function representativeRows(rows: string[][], limit: number): string[][] {
  if (rows.length <= limit) return rows;
  const picked = new Set<number>();
  for (let i = 0; i < limit; i++)
    picked.add(Math.round((i * (rows.length - 1)) / (limit - 1)));
  return [...picked].map((index) => rows[index]);
}

function downloadErrors(errors: ImportError[]) {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [
    "row,message",
    ...errors.map((error) => `${escape(error.row || "scoring")},${escape(error.message)}`),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "minder-import-errors.csv";
  link.click();
  URL.revokeObjectURL(url);
}
