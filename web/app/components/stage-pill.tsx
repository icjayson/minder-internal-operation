"use client";

import type { Stage } from "@/lib/types";

import { Badge } from "@/design-system/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/design-system/components/select";
import { cn } from "@/design-system/lib/utils";

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

/**
 * A stage pill you can click to change the stage.
 *
 * It used to be a transparent `<select>` laid over the pill, which meant the
 * one dropdown in the platform that opened was the operating system's — a grey
 * native menu in the middle of the design system. The pill is the Select's
 * trigger now, with the trigger's own border, padding and chevron switched off
 * so the cell looks exactly as it did.
 *
 * `stopPropagation` stays: these sit inside table rows that open a drawer, and
 * changing a stage should not also open the record.
 */
export function StagePillSelect<T extends string>({
  value,
  options,
  onChange,
  children,
}: {
  value: T;
  options: readonly T[];
  onChange: (next: T) => void;
  /** The pill to show — the caller owns which one, since stages differ by entity. */
  children: React.ReactNode;
}) {
  return (
    <div className="inline-block" onClick={(event) => event.stopPropagation()}>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger
          size="sm"
          aria-label="Change stage"
          className={cn(
            "h-auto w-fit gap-0 border-0 p-0 shadow-none data-[size=sm]:h-auto",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "[&>svg]:hidden",
          )}
        >
          {children}
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
