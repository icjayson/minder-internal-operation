"use client";

import { useCallback, useMemo, useRef, useState } from "react";

export type Column<T> = {
  key: string;
  header: string;
  width?: number; // initial px
  minWidth?: number; // default 60
  sortable?: boolean;
  sortValue?: (row: T) => string | number | null | undefined;
  align?: "left" | "right" | "center";
  render: (row: T) => React.ReactNode;
  cellClassName?: string;
};

type SortState = { key: string; dir: "asc" | "desc" } | null;

// Reusable table with click-to-sort headers (asc → desc → default) and
// drag-to-resize columns (persisted per `storageKey`). Fixed layout so widths
// are honoured; the container scrolls horizontally.
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  storageKey,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  storageKey?: string;
}) {
  const [sort, setSort] = useState<SortState>(null);
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined" && storageKey) {
      try {
        const s = localStorage.getItem(`dt:${storageKey}`);
        if (s) return JSON.parse(s);
      } catch {
        /* ignore */
      }
    }
    return {};
  });

  const colWidth = (c: Column<T>) => widths[c.key] ?? c.width ?? 140;

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1; // nulls always last
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [rows, sort, columns]);

  const toggleSort = (c: Column<T>) => {
    if (!c.sortable) return;
    setSort((cur) => {
      if (!cur || cur.key !== c.key) return { key: c.key, dir: "asc" };
      if (cur.dir === "asc") return { key: c.key, dir: "desc" };
      return null; // third click → default order
    });
  };

  // ── resize ──
  const drag = useRef<{ key: string; startX: number; startW: number } | null>(null);
  const persist = useCallback(
    (w: Record<string, number>) => {
      if (storageKey) {
        try {
          localStorage.setItem(`dt:${storageKey}`, JSON.stringify(w));
        } catch {
          /* ignore */
        }
      }
    },
    [storageKey],
  );
  const onDown = (e: React.PointerEvent, c: Column<T>) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { key: c.key, startX: e.clientX, startW: colWidth(c) };
  };
  const onMove = (e: React.PointerEvent, c: Column<T>) => {
    if (!drag.current || drag.current.key !== c.key) return;
    const min = c.minWidth ?? 60;
    const next = Math.max(min, drag.current.startW + (e.clientX - drag.current.startX));
    setWidths((w) => ({ ...w, [c.key]: next }));
  };
  const onUp = () => {
    if (drag.current) {
      drag.current = null;
      setWidths((w) => {
        persist(w);
        return w;
      });
    }
  };

  const total = columns.reduce((s, c) => s + colWidth(c), 0);

  return (
    <div className="rounded-lg border border-line bg-surface overflow-x-auto">
      <table
        className="text-[13px]"
        style={{ tableLayout: "fixed", width: "100%", minWidth: total }}
      >
        <colgroup>
          {columns.map((c) => (
            <col key={c.key} style={{ width: colWidth(c) }} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-line text-muted bg-surface-2/40">
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c)}
                  className={`relative text-left mono font-medium uppercase tracking-[0.12em] text-[10px] px-4 py-2.5 select-none ${
                    c.sortable ? "cursor-pointer hover:text-ink-soft" : ""
                  } ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    <span className="truncate">{c.header}</span>
                    {c.sortable && <SortArrow dir={active ? sort!.dir : null} />}
                  </span>
                  {/* resize handle */}
                  <span
                    onPointerDown={(e) => onDown(e, c)}
                    onPointerMove={(e) => onMove(e, c)}
                    onPointerUp={onUp}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize touch-none hover:bg-accent/30"
                    aria-hidden
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`group border-t border-line-soft transition-colors duration-150 ${
                onRowClick ? "hover:bg-surface-2/60 cursor-pointer" : ""
              }`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-4 py-3 align-middle overflow-hidden ${
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""
                  } ${c.cellClassName ?? ""}`}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortArrow({ dir }: { dir: "asc" | "desc" | null }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className={`shrink-0 transition-transform ${dir === "desc" ? "rotate-180" : ""} ${dir ? "text-accent" : "text-muted/40"}`}
    >
      <path d="M12 5v14M6 11l6-6 6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
