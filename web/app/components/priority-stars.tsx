"use client";

import { useState } from "react";

type Props = {
  value: number | null;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
};

export function PriorityStars({ value, onChange, size = 13, readOnly = false }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? value ?? 0;

  return (
    <div
      className="inline-flex items-center gap-0.5"
      onMouseLeave={() => setHover(null)}
      onClick={(e) => e.stopPropagation()}
      role="radiogroup"
      aria-label="Priority"
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= active;
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(i)}
            onClick={() => !readOnly && onChange?.(i === value ? 0 : i)}
            aria-checked={filled}
            role="radio"
            title={`${i} star${i > 1 ? "s" : ""}`}
            className={`p-0.5 rounded ${readOnly ? "" : "cursor-pointer"} transition-colors duration-150`}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={filled ? "var(--color-primary)" : "none"}
              stroke={filled ? "var(--color-primary)" : "var(--color-muted-foreground)"}
              strokeWidth="1.6"
              strokeLinejoin="round"
            >
              <path d="M12 3.5 14.8 9l6 .9-4.4 4.2 1 5.9L12 17.3 6.6 20l1-5.9L3.2 9.9l6-.9L12 3.5Z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
