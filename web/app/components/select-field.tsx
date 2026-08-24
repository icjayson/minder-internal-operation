"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/components/select";
import { cn } from "@/design-system/lib/utils";

/**
 * Radix rejects an empty string as an item value — it reserves "" for "nothing
 * selected" and throws if an item claims it. The platform stores exactly that
 * for an unset stage, an unassigned owner, an "All" filter, so the two have to
 * be translated somewhere. Doing it here means the 28 call sites keep passing
 * "" the way the rest of the code already does.
 */
const EMPTY = "__empty";

export type SelectOption = { value: string; label: string };

export function SelectField({
  value,
  onChange,
  options,
  placeholder,
  /** Label for the option that clears the field. Omit to leave it unclearable. */
  emptyLabel,
  size = "default",
  className,
  disabled,
  "aria-label": ariaLabel,
  title,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  emptyLabel?: string;
  size?: "sm" | "default";
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
  title?: string;
}) {
  return (
    <Select
      value={value ? value : emptyLabel ? EMPTY : undefined}
      onValueChange={(next) => onChange(next === EMPTY ? "" : next)}
      disabled={disabled}
    >
      <SelectTrigger
        size={size}
        className={cn("w-full", className)}
        aria-label={ariaLabel}
        title={title}
      >
        <SelectValue placeholder={placeholder ?? "Select…"} />
      </SelectTrigger>
      <SelectContent>
        {emptyLabel && <SelectItem value={EMPTY}>{emptyLabel}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
