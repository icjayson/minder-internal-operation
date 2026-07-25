"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

// Sidebar button that flips between the Cosmos (dark) and Daybreak (light)
// skies. The actual attribute is set pre-paint by the inline script in the
// root layout; here we read it on mount and keep it + localStorage in sync.
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const cur = document.documentElement.getAttribute("data-theme");
    setTheme(cur === "light" ? "light" : "dark");
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("minder-theme", next);
    } catch {
      /* private mode — non-fatal */
    }
  }

  // Icon reflects the sky you'll switch TO.
  const goesLight = theme === "dark";

  return (
    <button
      onClick={toggle}
      title={goesLight ? "Light mode" : "Dark mode"}
      aria-label="Toggle theme"
      className="group relative w-9 h-9 rounded-md grid place-items-center cursor-pointer text-muted hover:bg-surface-2 hover:text-ink-soft transition-colors duration-150"
    >
      {/* Render a stable default until mounted to avoid a hydration mismatch. */}
      {mounted && !goesLight ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="4.5" strokeWidth="1.6" />
          <path
            d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
      <span className="absolute left-11 whitespace-nowrap rounded-md bg-surface-3 border border-line-strong text-ink text-[11px] mono uppercase tracking-wider px-2 py-1 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
        {goesLight ? "Light" : "Dark"}
      </span>
    </button>
  );
}
