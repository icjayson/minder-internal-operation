"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { useStore } from "@/lib/factories-store";

const NAV: { href: string; label: string; icon: React.ReactNode }[] = [
  {
    href: "/",
    label: "Verticals",
    icon: <path d="M4 6h16M4 12h12M4 18h8" strokeWidth="1.6" strokeLinecap="round" />,
  },
  {
    href: "/networks",
    label: "Networks",
    icon: (
      <>
        <circle cx="6" cy="18" r="2.4" strokeWidth="1.5" />
        <circle cx="18" cy="18" r="2.4" strokeWidth="1.5" />
        <circle cx="12" cy="5" r="2.4" strokeWidth="1.5" />
        <path d="M11 7 7 16m6-9 4 9" strokeWidth="1.4" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/factories",
    label: "Factories",
    icon: (
      <>
        <path d="M3 21V9l6 3V9l6 3V9l6 3v9H3Z" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M7 21v-4h3v4" strokeWidth="1.4" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/contacts",
    label: "Contacts",
    icon: (
      <>
        <circle cx="9" cy="8" r="3" strokeWidth="1.5" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="17" cy="7" r="2" strokeWidth="1.5" />
      </>
    ),
  },
  {
    href: "/map",
    label: "Map",
    icon: (
      <>
        <rect x="3" y="4" width="6" height="5" rx="1" strokeWidth="1.5" />
        <rect x="15" y="3" width="6" height="4.5" rx="1" strokeWidth="1.5" />
        <rect x="15" y="16.5" width="6" height="4.5" rx="1" strokeWidth="1.5" />
        <path d="M9 6.5h3.5a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 0 1.5 1.5H15M14 5.2h1" strokeWidth="1.4" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/import",
    label: "Import CSV",
    icon: (
      <path d="M12 15V3m0 0 4 4m-4-4L8 7M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    href: "/sequences",
    label: "Sequences",
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="1.5" />
        <path d="M8 9h8M8 13h5" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/messages",
    label: "Messages",
    icon: (
      <path
        d="M4 6c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2h-6l-4 3v-3H6c-1.1 0-2-.9-2-2V6Z"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: <path d="M4 19V5M10 19v-8M16 19v-5M22 19H2" strokeWidth="1.5" strokeLinecap="round" />,
  },
  {
    href: "/ai-context",
    label: "AI Context",
    icon: (
      <>
        <path d="M12 3 14 9l6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="m18 3 .6 1.7L20 5.4l-1.4.6-.6 1.7-.6-1.7-1.4-.6 1.4-.7L18 3Z" strokeWidth="1.2" strokeLinejoin="round" />
      </>
    ),
  },
];

// Keep these routes available while temporarily removing them from navigation.
const HIDDEN_NAV_HREFS = new Set(["/", "/sequences", "/messages", "/settings"]);

const SETTINGS = {
  href: "/settings",
  label: "Settings",
  icon: (
    <>
      <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.2.6.7 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </>
  ),
};

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  const { notifications } = useStore();
  const unread = (notifications ?? []).filter((n) => !n.read_at).length;
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("minder:sidebar-collapsed") === "true");
    } catch {
      /* Use the discoverable expanded navigation by default. */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try { localStorage.setItem("minder:sidebar-collapsed", String(next)); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <aside className={`sticky top-0 z-30 flex h-screen shrink-0 self-start flex-col border-r border-line bg-surface/85 py-3 backdrop-blur-xl transition-[width] duration-300 max-lg:w-16 ${collapsed ? "w-16" : "w-56"}`}>
      <div className={`mb-3 flex h-10 items-center px-3 ${collapsed ? "justify-center" : "gap-2.5"}`}>
        <Link
          href="/"
          aria-label="Minder Leads — home"
          className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl shadow-[0_0_24px_-4px_rgba(45,68,224,0.55)] ring-1 ring-line-strong"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/minder-lead-logo.png" alt="Minder Leads" className="h-full w-full object-cover" />
          <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-accent ring-2 ring-canvas" />
        </Link>
        {!collapsed && <div className="min-w-0 max-lg:hidden"><div className="truncate text-[13px] font-semibold text-ink">Minder Leads</div><div className="text-[9px] uppercase tracking-[0.12em] text-muted">Design partners</div></div>}
      </div>

      {NAV.filter((item) => !HIDDEN_NAV_HREFS.has(item.href)).map((item) => (
        <NavIcon key={item.href} href={item.href} label={item.label} active={isActive(pathname, item.href)} collapsed={collapsed}>
          {item.icon}
        </NavIcon>
      ))}

      {/* Alerts with unread badge */}
      <NavIcon href="/alerts" label="Alerts" active={isActive(pathname, "/alerts")} collapsed={collapsed} badge={unread}>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeWidth="1.5" strokeLinecap="round" />
      </NavIcon>
      <div className="flex-1" />

      <div className={`flex items-center px-3 ${collapsed ? "justify-center" : "justify-between max-lg:justify-center"}`}>
        {!collapsed && <span className="text-[11px] text-muted max-lg:hidden">Appearance</span>}
        <ThemeToggle />
      </div>

      {!HIDDEN_NAV_HREFS.has(SETTINGS.href) && (
        <NavIcon href={SETTINGS.href} label={SETTINGS.label} active={isActive(pathname, SETTINGS.href)} collapsed={collapsed}>
          {SETTINGS.icon}
        </NavIcon>
      )}

      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        className="mx-3 mt-2 hidden h-8 items-center justify-center gap-2 rounded-md border border-line text-[10.5px] text-muted hover:border-line-strong hover:text-ink-soft lg:flex"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={collapsed ? "rotate-180" : ""}><path d="m15 5-7 7 7 7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}

function NavIcon({
  children,
  href,
  label,
  active = false,
  collapsed,
  badge = 0,
}: {
  children: React.ReactNode;
  href: string;
  label: string;
  active?: boolean;
  collapsed: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`group relative mx-2 flex h-9 items-center rounded-md cursor-pointer transition-colors duration-150 ${collapsed ? "justify-center px-0 max-lg:justify-center" : "gap-3 px-3 max-lg:justify-center max-lg:px-0"} ${
        active ? "bg-surface-3 text-accent" : "text-muted hover:bg-surface-2 hover:text-ink-soft"
      }`}
    >
      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-accent" />}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        {children}
      </svg>
      {!collapsed && <span className="min-w-0 flex-1 truncate text-[12px] font-medium max-lg:hidden">{label}</span>}
      {badge > 0 && <span className={`grid min-w-4 h-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-semibold text-white ${collapsed ? "absolute right-0 top-0" : "max-lg:absolute max-lg:right-0 max-lg:top-0"}`}>{badge}</span>}
      <span className={`absolute left-[52px] z-50 whitespace-nowrap rounded-md border border-line-strong bg-surface-3 px-2 py-1 text-[10px] uppercase tracking-wider text-ink opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 ${collapsed ? "" : "hidden max-lg:block"}`}>
        {label}
      </span>
    </Link>
  );
}
