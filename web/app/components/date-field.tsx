"use client";

import * as React from "react";
import { CalendarIcon, XIcon } from "lucide-react";

import { Button } from "@/design-system/components/button";
import { Calendar } from "@/design-system/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/design-system/components/popover";
import { cn } from "@/design-system/lib/utils";

/**
 * The platform's date control, composed the way the design system composes it:
 * Popover + Calendar behind an outline Button.
 *
 * Every date in the platform is stored as a plain `YYYY-MM-DD` string, so the
 * conversion happens here rather than at eight call sites. It is deliberately
 * parsed and formatted component-wise instead of through `new Date(iso)`,
 * which reads a bare date as UTC midnight and lands on the previous day for
 * anyone west of Greenwich.
 */
function parse(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function format(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function DateField({
  value,
  onChange,
  placeholder = "Pick a date",
  size = "default",
  clearable = true,
  className,
  title,
}: {
  value: string | null | undefined;
  onChange: (iso: string) => void;
  placeholder?: string;
  size?: "sm" | "default";
  /** Offers an × to hand back "", for the fields where a date is optional. */
  clearable?: boolean;
  className?: string;
  title?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = parse(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size}
          title={title}
          className={cn(
            "w-full justify-start font-normal tabular-nums",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon />
          <span className="truncate">
            {selected
              ? selected.toLocaleDateString("en-GB", { dateStyle: "medium" })
              : placeholder}
          </span>
          {clearable && selected && (
            <XIcon
              role="button"
              aria-label="Clear date"
              className="ml-auto size-3.5 shrink-0 opacity-60 hover:opacity-100"
              onClick={(event) => {
                // The × sits inside the trigger, so the popover must not open.
                event.preventDefault();
                event.stopPropagation();
                onChange("");
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (date) onChange(format(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
