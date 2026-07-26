"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
];

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

  return (
    <aside className="sticky top-0 self-start h-screen w-14 shrink-0 border-r border-line bg-surface/60 backdrop-blur flex flex-col items-center py-3 gap-0.5">
      <Link
        href="/"
        aria-label="Minder Leads — home"
        className="relative w-9 h-9 rounded-xl overflow-hidden mb-3 shadow-[0_0_24px_-4px_rgba(45,68,224,0.55)] ring-1 ring-line-strong"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/minder-lead-logo.png" alt="Minder Leads" className="w-full h-full object-cover" />
        <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-accent ring-2 ring-canvas" />
      </Link>

      {NAV.map((item) => (
        <NavIcon key={item.href} href={item.href} label={item.label} active={isActive(pathname, item.href)}>
          {item.icon}
        </NavIcon>
      ))}

      {/* Alerts with unread badge */}
      <NavIcon href="/alerts" label="Alerts" active={isActive(pathname, "/alerts")}>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeWidth="1.5" strokeLinecap="round" />
      </NavIcon>
      {unread > 0 && (
        <span className="-mt-1 mb-0.5 min-w-4 h-4 px-1 rounded-full bg-accent text-white text-[9px] font-semibold grid place-items-center mono">
          {unread}
        </span>
      )}

      <div className="flex-1" />

      <ThemeToggle />

      <NavIcon href={SETTINGS.href} label={SETTINGS.label} active={isActive(pathname, SETTINGS.href)}>
        {SETTINGS.icon}
      </NavIcon>
    </aside>
  );
}

function NavIcon({
  children,
  href,
  label,
  active = false,
}: {
  children: React.ReactNode;
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`group relative w-9 h-9 rounded-md grid place-items-center cursor-pointer transition-colors duration-150 ${
        active ? "bg-surface-3 text-accent" : "text-muted hover:bg-surface-2 hover:text-ink-soft"
      }`}
    >
      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-accent" />}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        {children}
      </svg>
      <span className="absolute left-11 whitespace-nowrap rounded-md bg-surface-3 border border-line-strong text-ink text-[11px] mono uppercase tracking-wider px-2 py-1 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
        {label}
      </span>
    </Link>
  );
}
