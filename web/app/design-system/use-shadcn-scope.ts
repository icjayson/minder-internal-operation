"use client";

import * as React from "react";

/**
 * Puts shadcn's tokens on <body> for as long as the calling tab is mounted.
 *
 * It has to be <body> rather than a wrapper: Radix renders dialogs, menus, and
 * toasts through a portal that lands outside this subtree, and they would
 * otherwise fall back to the Celesnity palette.
 */
export function useShadcnScope(dark: boolean, brand: "shadcn" | "minder" = "shadcn") {
  React.useEffect(() => {
    document.body.classList.add("shadcn-scope");
    return () => document.body.classList.remove("shadcn-scope");
  }, []);

  React.useEffect(() => {
    document.body.classList.toggle("dark", dark);
    return () => document.body.classList.remove("dark");
  }, [dark]);

  React.useEffect(() => {
    document.body.classList.toggle("minder-brand", brand === "minder");
    return () => document.body.classList.remove("minder-brand");
  }, [brand]);
}
