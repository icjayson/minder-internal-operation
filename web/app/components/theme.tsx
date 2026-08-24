"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "dark" | "light";

type ThemeValue = { theme: Theme; mounted: boolean; toggle: () => void };

const AppThemeContext = createContext<ThemeValue | null>(null);

/**
 * Holds the app's light/dark choice.
 *
 * The attribute itself is set pre-paint by the inline script in the root
 * layout, so this reads rather than owns the initial value; `mounted` is what
 * lets a consumer render a stable default until that read has happened.
 *
 * It is a context rather than local state in the toggle because more than the
 * toggle needs the answer — Sonner takes its sky as a prop, since the vendored
 * Toaster reads next-themes and this app does not use it.
 */
export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("minder-theme", next);
      } catch {
        /* private mode — non-fatal */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, mounted, toggle }), [theme, mounted, toggle]);
  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): ThemeValue {
  const value = useContext(AppThemeContext);
  if (!value) throw new Error("useAppTheme must be used inside AppShell");
  return value;
}
