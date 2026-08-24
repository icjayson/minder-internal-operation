"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/components/table";
import { cn } from "@/design-system/lib/utils";

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
//
// The markup is the design system's Table; the sort and resize behaviour is
// this component's own, since the system has no equivalent.
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
  const alignOf = (c: Column<T>) =>
    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "";

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table
        className="text-[13px]"
        style={{ tableLayout: "fixed", width: "100%", minWidth: total }}
      >
        <colgroup>
          {columns.map((c) => (
            <col key={c.key} style={{ width: colWidth(c) }} />
          ))}
        </colgroup>
        <TableHeader>
          {/* Headers are a static strip, so the row's own hover tint is off. */}
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <TableHead
                  key={c.key}
                  onClick={() => toggleSort(c)}
                  aria-sort={
                    active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined
                  }
                  className={cn(
                    "relative h-auto px-4 py-2.5 text-[10px] tracking-[0.12em] text-muted-foreground uppercase select-none",
                    c.sortable && "cursor-pointer hover:text-foreground",
                    alignOf(c),
                  )}
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
                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize touch-none hover:bg-primary/30"
                    aria-hidden
                  />
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={cn("group", onRowClick ? "cursor-pointer" : "hover:bg-transparent")}
            >
              {columns.map((c) => (
                <TableCell
                  key={c.key}
                  // Cells wrap and clip rather than running on: the layout is
                  // fixed, so a long value has to fold inside its own column.
                  className={cn(
                    "overflow-hidden px-4 py-3 whitespace-normal",
                    alignOf(c),
                    c.cellClassName,
                  )}
                >
                  {c.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
      className={cn(
        "shrink-0 transition-transform",
        dir === "desc" && "rotate-180",
        dir ? "text-primary" : "text-muted-foreground/40",
      )}
    >
      <path d="M12 5v14M6 11l6-6 6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
