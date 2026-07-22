"use client";

import type { Category } from "@/lib/types";

const STYLE: Record<Category, { bg: string; text: string; border: string }> = {
  ICP: {
    bg: "var(--color-accent-dim)",
    text: "var(--color-accent)",
    border: "var(--color-accent)",
  },
  Advisor: {
    bg: "#1e1a3a",
    text: "#c0b1ff",
    border: "rgba(192,177,255,0.35)",
  },
  VC: {
    bg: "#13223f",
    text: "#8ab6ff",
    border: "rgba(138,182,255,0.35)",
  },
  Angel: {
    bg: "#2e1a2e",
    text: "#ef9fd1",
    border: "rgba(239,159,209,0.35)",
  },
  Accelerator: {
    bg: "#2a2110",
    text: "var(--color-warn)",
    border: "rgba(251,191,36,0.3)",
  },
  "Design Partner": {
    // warm emerald/teal tint — signals a production pilot relationship
    bg: "#12302a",
    text: "#5df2cf",
    border: "rgba(93,242,207,0.4)",
  },
  "Strategic Partner": {
    // cooler cyan — long-term distribution partners
    bg: "#13272a",
    text: "#6edfe3",
    border: "rgba(110,223,227,0.35)",
  },
  Press: {
    bg: "#22182e",
    text: "#b89bff",
    border: "rgba(184,155,255,0.35)",
  },
  Gov: {
    bg: "#1c1c1c",
    text: "#b5b5b5",
    border: "rgba(181,181,181,0.25)",
  },
};

export function CategoryPill({ category }: { category: Category }) {
  const s = STYLE[category];
  return (
    <span
      className="inline-flex items-center h-5 px-2 rounded-sm mono text-[10px] uppercase tracking-[0.1em] font-medium whitespace-nowrap border"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {category}
    </span>
  );
}
