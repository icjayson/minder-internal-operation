"use client";

import type { Category, Stage } from "@/lib/types";
import { CATEGORIES, STAGES } from "@/lib/types";

type Props = {
  search: string;
  onSearch: (v: string) => void;
  stageFilter: Stage | "All";
  onStageFilter: (s: Stage | "All") => void;
  categoryFilter: Category | "All";
  onCategoryFilter: (c: Category | "All") => void;
  onNewLead: () => void;
};

export function Toolbar({
  search,
  onSearch,
  stageFilter,
  onStageFilter,
  categoryFilter,
  onCategoryFilter,
  onNewLead,
}: Props) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="relative flex-1 max-w-md">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        >
          <circle cx="11" cy="11" r="7" strokeWidth="1.6" />
          <path d="m20 20-3.5-3.5" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Search name, company, title…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-md bg-surface border border-line text-[13px] text-ink placeholder:text-muted focus:border-line-strong focus:outline-none transition-colors duration-150"
        />
        <kbd className="hidden md:inline-flex absolute right-2 top-1/2 -translate-y-1/2 mono text-[10px] text-muted uppercase border border-line-strong bg-surface-2 rounded px-1.5 py-0.5">
          ⌘K
        </kbd>
      </div>

      <FilterSelect
        value={stageFilter}
        onChange={(v) => onStageFilter(v as Stage | "All")}
        label="All stages"
        options={STAGES as readonly string[]}
      />

      <FilterSelect
        value={categoryFilter}
        onChange={(v) => onCategoryFilter(v as Category | "All")}
        label="All categories"
        options={CATEGORIES as readonly string[]}
      />

      <div className="flex-1" />

      <button
        onClick={onNewLead}
        className="h-9 px-3 rounded-md bg-accent hover:bg-[#2bf094] text-canvas text-[13px] font-medium cursor-pointer transition-colors duration-150 inline-flex items-center gap-1.5"
        title="Add a lead manually"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 5v14M5 12h14" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        New lead
      </button>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: readonly string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 pl-3 pr-9 rounded-md bg-surface border border-line text-[13px] text-ink cursor-pointer appearance-none focus:border-line-strong focus:outline-none transition-colors duration-150"
      >
        <option value="All">{label}</option>
        {options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
      >
        <path d="m6 9 6 6 6-6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
