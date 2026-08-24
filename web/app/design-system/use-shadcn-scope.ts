"use client";

import * as React from "react";

/**
 * Hands the /design-system area its own sky and palette, independent of the app's.
 *
 * Everything lands on <body> rather than on a wrapper: Radix renders dialogs,
 * menus, and toasts through a portal outside this subtree, and they would
 * otherwise miss whatever the tab has set.
 *
 * Since the design system became the app's own token layer, two of these
 * effects run backwards from how they read: `minder-brand` is the app's
 * resting state and gets *taken off* for the library tab, and the app's
 * `data-theme` is pinned to light for the duration. Both restore on unmount.
 */
export function useShadcnScope(dark: boolean, brand: "shadcn" | "minder" = "shadcn") {
  React.useEffect(() => {
    document.body.classList.add("shadcn-scope");
    return () => document.body.classList.remove("shadcn-scope");
  }, []);

  /**
   * `dark:` answers to two markers — the app's `data-theme` on <html> and this
   * class on <body> — and CSS has no way to say "nearest ancestor wins", so an
   * app left in dark would otherwise bleed through a page this tab has set to
   * light. Pinning <html> to light while the area is mounted leaves the body
   * class as the only live marker.
   */
  React.useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("data-theme");
    root.setAttribute("data-theme", "light");
    return () => {
      if (previous) root.setAttribute("data-theme", previous);
      else root.removeAttribute("data-theme");
    };
  }, []);

  React.useEffect(() => {
    document.body.classList.toggle("dark", dark);
    return () => document.body.classList.remove("dark");
  }, [dark]);

  React.useEffect(() => {
    if (brand === "minder") return;
    document.body.classList.remove("minder-brand");
    return () => {
      document.body.classList.add("minder-brand");
    };
  }, [brand]);
}
