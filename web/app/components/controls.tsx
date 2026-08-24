"use client";

// Small shared form controls reused across the non-pipeline pages. Both are
// thin wrappers now: the design system owns the chrome, focus ring, and dark
// treatment, and these keep only the call signature the pages already pass.

import { SearchIcon } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/design-system/components/input-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/design-system/components/native-select";

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
    <InputGroup>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </InputGroup>
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
    <NativeSelect value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <NativeSelectOption key={o.value} value={o.value}>
          {o.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
