import type * as React from "react";

/** A single runnable example shown inside a component's docs page. */
export type Demo = {
  id: string;
  title: string;
  description?: string;
  /** The source the "Code" tab shows and the copy button writes to the clipboard. */
  code: string;
  Component: React.ComponentType;
};

export type ComponentDoc = {
  /** Slug — matches the folder name in `design-system/components`. */
  name: string;
  title: string;
  description: string;
  category: Category;
  /** Minimal import + markup snippet shown under "Usage". */
  usage: string;
  demos: Demo[];
};

export const CATEGORIES = [
  "Forms",
  "Layout",
  "Data display",
  "Navigation",
  "Overlay",
  "Feedback",
  "AI chat",
] as const;

export type Category = (typeof CATEGORIES)[number];
