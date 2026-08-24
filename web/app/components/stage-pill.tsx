"use client";

import type { Stage } from "@/lib/types";

import { Badge } from "@/design-system/components/badge";

/**
 * The shared shape behind every stage / result pill in the platform.
 *
 * `variant="outline"` is the closest of the system's own, but the colour comes
 * from the `.tone` recipe in globals.css keyed off `data-tone` — one hue token
 * per tone, mixed into a border, a fill, and a type colour that both skies can
 * carry. `.tone` is unlayered CSS, so it wins over the variant's utilities
 * without needing `!important`.
 */
export function TonePill({
  tone,
  children,
}: {
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <Badge
      variant="outline"
      data-tone={tone}
      className="tone h-5 px-2.5 text-[10px] tracking-[0.1em] uppercase"
    >
      {children}
    </Badge>
  );
}

const TONE: Record<Stage, string> = {
  New: "cobalt",
  Contacted: "indigo",
  Replied: "violet",
  "Meeting Booked": "magenta",
  Demo: "magenta",
  "Closed Won": "green",
  "Closed Lost": "rose",
  Nurture: "neutral",
};

export function StagePill({ stage }: { stage: Stage }) {
  return <TonePill tone={TONE[stage]}>{stage}</TonePill>;
}
