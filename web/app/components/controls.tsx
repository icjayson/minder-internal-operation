"use client";

// Small shared form controls reused across the non-pipeline pages, styled to
// match the pipeline Toolbar.

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full">
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
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 pl-9 pr-3 rounded-md bg-surface border border-line text-[13px] text-ink placeholder:text-muted focus:border-line-strong focus:outline-none transition-colors duration-150"
      />
    </div>
  );
}

export function SelectControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 pl-3 pr-9 rounded-md bg-surface border border-line text-[13px] text-ink cursor-pointer appearance-none focus:border-line-strong focus:outline-none transition-colors duration-150"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
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
        <path
          d="m6 9 6 6 6-6"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
