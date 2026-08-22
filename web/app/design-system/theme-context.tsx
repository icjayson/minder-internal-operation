"use client";

import * as React from "react";

import { useShadcnScope } from "./use-shadcn-scope";

type ThemeValue = { dark: boolean; toggleDark: () => void };

const DesignSystemThemeContext = React.createContext<ThemeValue | null>(null);

/**
 * Holds the light/dark choice for the whole /design-system area.
 *
 * It lives in the layout rather than in a page so the nav — which sits outside
 * every route — shares the sky, and so moving between routes cannot leave a
 * stale body class behind. Pages read it through `useDesignSystemTheme`, since
 * the App Router gives a layout no way to pass props to its children.
 */
export function DesignSystemThemeProvider({
  brand,
  children,
}: {
  brand: "shadcn" | "minder";
  children: React.ReactNode;
}) {
  const [dark, setDark] = React.useState(false);
  useShadcnScope(dark, brand);

  const value = React.useMemo(
    () => ({ dark, toggleDark: () => setDark((current) => !current) }),
    [dark]
  );

  return (
    <DesignSystemThemeContext.Provider value={value}>{children}</DesignSystemThemeContext.Provider>
  );
}

export function useDesignSystemTheme(): ThemeValue {
  const value = React.useContext(DesignSystemThemeContext);
  if (!value) {
    throw new Error("useDesignSystemTheme must be used inside the /design-system layout");
  }
  return value;
}
