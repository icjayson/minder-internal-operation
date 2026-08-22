"use client";

import * as React from "react";

import { useDesignSystemTheme } from "../theme-context";
import styles from "./charts.module.css";
import { CHART_CATEGORIES, type ChartCategory, type ChartEntry, chartEntries } from "./registry";

function useCopy() {
  const [copied, setCopied] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return [copied, setCopied] as const;
}

/** Fetches a chart's vendored source once, then keeps it for the session. */
function useChartSource(name: string | null) {
  const cache = React.useRef(new Map<string, string>());
  const [source, setSource] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");

  React.useEffect(() => {
    if (!name) return;
    const cached = cache.current.get(name);
    if (cached) {
      setSource(cached);
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setSource(null);
    setStatus("loading");
    fetch(`/api/design-system/component-source?name=${encodeURIComponent(name)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("unavailable"))))
      .then((payload: { files?: Array<{ content: string }> }) => {
        const content = payload.files?.[0]?.content ?? "";
        cache.current.set(name, content);
        if (cancelled) return;
        setSource(content);
        setStatus("idle");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  return { source, status };
}

/** The small chart glyph in each card's label, matching the gallery it mirrors. */
function ChartGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={styles.glyph}>
      <path d="M1.5 13.5h13" />
      <path d="M2 10.5 6 6l3 3 5-6" />
    </svg>
  );
}

function ChartCard({
  entry,
  label,
  onViewCode,
}: {
  entry: ChartEntry;
  label: string;
  onViewCode: () => void;
}) {
  const [copied, setCopied] = useCopy();
  const Chart = entry.Component;

  async function copySource() {
    try {
      const response = await fetch(
        `/api/design-system/component-source?name=${encodeURIComponent(entry.name)}`
      );
      const payload = (await response.json()) as { files?: Array<{ content: string }> };
      await navigator.clipboard.writeText(payload.files?.[0]?.content ?? "");
      setCopied(entry.name);
    } catch {
      setCopied(null);
    }
  }

  return (
    /* The interactive blocks carry a range picker and a wide time series; they
       get the full row here, the way the gallery they mirror lays them out. */
    <article className={styles.card} data-wide={entry.variant === "interactive" || undefined}>
      <div className={styles.cardBar}>
        <span className={styles.cardLabel} title={entry.description || entry.name}>
          <ChartGlyph /> {label}
        </span>
        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.iconAction}
            onClick={copySource}
            title={copied === entry.name ? "Copied" : "Copy source"}
            aria-label={`Copy ${entry.name} source`}
            data-copied={copied === entry.name || undefined}
          >
            <svg viewBox="0 0 16 16" aria-hidden>
              <rect x="5.5" y="5.5" width="8" height="8" rx="2" />
              <path d="M10.5 5.5v-1a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1" />
            </svg>
          </button>
          <button type="button" className={styles.textAction} onClick={onViewCode}>
            View Code
          </button>
        </div>
      </div>
      <div className={styles.cardStage}>
        <Chart />
      </div>
    </article>
  );
}

function CodeDrawer({ entry, onClose }: { entry: ChartEntry; onClose: () => void }) {
  const { source, status } = useChartSource(entry.name);
  const [copied, setCopied] = useCopy();

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={`${entry.name} source`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.drawerHeader}>
          <div>
            <p className={styles.drawerKicker}>{entry.category} chart</p>
            <h2>{entry.description || entry.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close code panel">
            ×
          </button>
        </header>
        <div className={styles.drawerFileBar}>
          <span>{entry.name}.tsx</span>
          <button
            type="button"
            data-copied={copied === entry.name || undefined}
            onClick={async () => {
              if (!source) return;
              await navigator.clipboard.writeText(source);
              setCopied(entry.name);
            }}
          >
            {copied === entry.name ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className={styles.pre}>
          <code>
            {status === "loading" ? "Loading source…" : status === "error" ? "Source unavailable." : source}
          </code>
        </pre>
      </aside>
    </div>
  );
}

export default function ChartGallery() {
  const { dark, toggleDark } = useDesignSystemTheme();

  const [category, setCategory] = React.useState<ChartCategory>("area");
  const [openChart, setOpenChart] = React.useState<ChartEntry | null>(null);
  const galleryRef = React.useRef<HTMLDivElement>(null);

  const visible = chartEntries
    .filter((entry) => entry.category === category)
    .sort((a, b) => Number(b.variant === "interactive") - Number(a.variant === "interactive"));
  const active = CHART_CATEGORIES.find((entry) => entry.id === category);
  const label = active?.label ?? "";
  const singular = active?.singular ?? "Chart";

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <h1>
          Beautiful Charts & Graphs
        </h1>
        <p>
          A collection of ready-to-use chart components built with Recharts. From basic charts to
          rich data displays, copy and paste into your apps.
        </p>
        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={() => galleryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            Browse Charts
          </button>
          <button type="button" className={styles.secondaryAction} aria-pressed={dark} onClick={toggleDark}>
            {dark ? "☾ Dark" : "☀ Light"}
          </button>
        </div>
      </div>

      <nav className={styles.categoryNav} aria-label="Chart categories">
        {CHART_CATEGORIES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-current={category === entry.id ? "page" : undefined}
            className={category === entry.id ? styles.categoryActive : styles.category}
            onClick={() => setCategory(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      <div className={styles.gallery} ref={galleryRef}>
        <div className={styles.galleryHeading}>
          <h2>{label}</h2>
          <span>
            {visible.length} of {chartEntries.length} blocks
          </span>
        </div>
        <div className={styles.grid}>
          {visible.map((entry) => (
            <ChartCard
              key={entry.name}
              entry={entry}
              label={singular}
              onViewCode={() => setOpenChart(entry)}
            />
          ))}
        </div>
      </div>

      {openChart ? <CodeDrawer entry={openChart} onClose={() => setOpenChart(null)} /> : null}
    </section>
  );
}
