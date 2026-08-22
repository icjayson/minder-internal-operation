"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { DesignSystemNav } from "./nav";
import { DesignSystemThemeProvider } from "./theme-context";

/**
 * Client half of the layout: owns the sky, paints the nav, and picks the token
 * brand for the route.
 *
 * The general system re-tokenises the library to Minder blue; the other three
 * document shadcn as it ships, so the brand override is scoped to that route.
 */
export function DesignSystemShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const brand = pathname === "/design-system/general" ? "minder" : "shadcn";

  return (
    <DesignSystemThemeProvider brand={brand}>
      <DesignSystemNav />
      {children}
    </DesignSystemThemeProvider>
  );
}
