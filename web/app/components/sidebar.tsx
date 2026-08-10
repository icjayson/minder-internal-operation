"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { useStore } from "@/lib/factories-store";
import { STAGE_RANK } from "@/lib/stage";

const NAV: { href: string; label: string; icon: React.ReactNode }[] = [
  {
    href: "/",
    label: "Verticals",
    icon: <path d="M4 6h16M4 12h12M4 18h8" strokeWidth="1.6" strokeLinecap="round" />,
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

const PARTNER_NAV: { href: string; label: string; icon: React.ReactNode }[] = [
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
];

const FUNDRAISING_NAV: { href: string; label: string; icon: React.ReactNode }[] = [
  {
    href: "/fundraising/investors",
    label: "Investors",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" strokeWidth="1.5" />
        <path d="M14.8 8.8c-.6-.5-1.5-.8-2.6-.8-1.5 0-2.7.7-2.7 1.9 0 1.1.9 1.6 2.7 2 1.7.4 2.5.9 2.5 2.1 0 1.3-1.1 2.1-2.8 2.1-1.2 0-2.3-.4-3-1.1M12 6.5v11" strokeWidth="1.4" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/fundraising/competitions",
    label: "Competitions & Programmes",
    icon: (
      <>
        <path d="M7 4h10v3a5 5 0 0 1-10 0V4Z" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M7 5H4v1.5A3 3 0 0 0 7 9M17 5h3v1.5A3 3 0 0 1 17 9M9.5 13.5h5l-.8 3.5h-3.4l-.8-3.5ZM8 20h8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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
  const { notifications, factories, networks, fundraisingLeads } = useStore();
  const unread = (notifications ?? []).filter((n) => !n.read_at).length;

  // Right-aligned nav counts.
  const repliedOnwards = STAGE_RANK["Replied"];
  const customerCount = (factories ?? []).filter((f) => f.is_customer).length;
  // Partners = factories (still in the partner tracker) + networks that have
  // progressed to Replied or beyond.
  const partnerCount =
    (factories ?? []).filter(
      (f) => !(f.is_customer && f.stage === "Closed Won") && STAGE_RANK[f.stage] >= repliedOnwards,
    ).length +
    (networks ?? []).filter((n) => STAGE_RANK[n.stage] >= repliedOnwards).length;
  const fundraisingCount = (fundraisingLeads ?? []).length;

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
          aria-label="Minder Ops Platform — home"
          className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl shadow-[0_0_24px_-4px_rgba(45,68,224,0.55)] ring-1 ring-line-strong"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/minder-lead-logo.png" alt="Minder Ops Platform" className="h-full w-full object-cover" />
          <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-accent ring-2 ring-canvas" />
        </Link>
        {!collapsed && <div className="min-w-0 max-lg:hidden"><div className="truncate text-[13px] font-semibold text-ink">Minder Ops Platform</div><div className="text-[9px] uppercase tracking-[0.12em] text-muted">Internal operations</div></div>}
      </div>

      <div className="flex flex-col gap-1.5">
        {NAV.slice(0, 1).filter((item) => !HIDDEN_NAV_HREFS.has(item.href)).map((item) => (
          <NavIcon key={item.href} href={item.href} label={item.label} active={isActive(pathname, item.href)} collapsed={collapsed}>
            {item.icon}
          </NavIcon>
        ))}

        <NavIcon href="/customers" label="Customers" active={isActive(pathname, "/customers")} collapsed={collapsed} count={customerCount}>
          <circle cx="9" cy="8" r="3" strokeWidth="1.5" />
          <path d="M3 20c0-3.3 2.7-6 6-6 1.4 0 2.7.5 3.7 1.3" strokeWidth="1.5" strokeLinecap="round" />
          <path d="m15 18 2 2 4-4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </NavIcon>

        <PartnerNav pathname={pathname} collapsed={collapsed} count={partnerCount} />

        <FundraisingNav pathname={pathname} collapsed={collapsed} count={fundraisingCount} />

        {NAV.slice(1).filter((item) => !HIDDEN_NAV_HREFS.has(item.href)).map((item) => (
          <NavIcon key={item.href} href={item.href} label={item.label} active={isActive(pathname, item.href)} collapsed={collapsed}>
            {item.icon}
          </NavIcon>
        ))}

        {/* Persistent alert history with the actionable unread badge. */}
        <NavIcon href="/alert-log" label="Alert log" active={isActive(pathname, "/alert-log")} collapsed={collapsed} badge={unread}>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeWidth="1.5" strokeLinecap="round" />
        </NavIcon>
      </div>
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

function PartnerNav({ pathname, collapsed, count = 0 }: { pathname: string; collapsed: boolean; count?: number }) {
  const active = PARTNER_NAV.some((item) => isActive(pathname, item.href));
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <div className={`mx-2 rounded-md transition-colors ${open ? "border border-line bg-surface/70" : ""}`}>
      <button
        type="button"
        title="Partners"
        aria-label="Partners"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`group relative flex h-9 w-full items-center transition-colors duration-150 ${open ? "rounded-t-md border-b border-line" : "rounded-md"} ${collapsed ? "justify-center px-0 max-lg:justify-center" : "gap-3 px-3 max-lg:justify-center max-lg:px-0"} ${
          active ? "bg-accent-dim text-accent" : open ? "bg-surface-2 text-ink-soft" : "text-muted hover:bg-surface-2 hover:text-ink-soft"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="8" cy="8" r="3" strokeWidth="1.5" />
          <circle cx="17" cy="9" r="2.5" strokeWidth="1.5" />
          <path d="M2.5 20c0-3.5 2.4-6 5.5-6s5.5 2.5 5.5 6M13.5 15.2c1-.8 2.1-1.2 3.5-1.2 2.6 0 4.5 2 4.5 5" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {!collapsed && <span className="min-w-0 flex-1 truncate text-left text-[12px] font-medium max-lg:hidden">Partners</span>}
        {!collapsed && count > 0 && <NavCount value={count} />}
        {!collapsed && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`transition-transform max-lg:hidden ${open ? "rotate-90" : ""}`}>
            <path d="m9 5 7 7-7 7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className={`absolute left-[52px] z-50 whitespace-nowrap rounded-md border border-line-strong bg-surface-3 px-2 py-1 text-[10px] uppercase tracking-wider text-ink opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 ${collapsed ? "" : "hidden max-lg:block"}`}>
          Partners
        </span>
      </button>

      {open && (
        <div className={`relative py-1.5 ${collapsed ? "" : "before:absolute before:bottom-2 before:left-2.5 before:top-2 before:w-px before:bg-line max-lg:before:hidden"}`}>
          {PARTNER_NAV.map((item) => (
            <PartnerNavIcon
              key={item.href}
              href={item.href}
              label={item.label}
              active={isActive(pathname, item.href)}
              collapsed={collapsed}
            >
              {item.icon}
            </PartnerNavIcon>
          ))}
        </div>
      )}
    </div>
  );
}

function FundraisingNav({ pathname, collapsed, count = 0 }: { pathname: string; collapsed: boolean; count?: number }) {
  const active = FUNDRAISING_NAV.some((item) => isActive(pathname, item.href));
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <div className={`mx-2 rounded-md transition-colors ${open ? "border border-line bg-surface/70" : ""}`}>
      <button
        type="button"
        title="Fundraising"
        aria-label="Fundraising"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`group relative flex h-9 w-full items-center transition-colors duration-150 ${open ? "rounded-t-md border-b border-line" : "rounded-md"} ${collapsed ? "justify-center px-0 max-lg:justify-center" : "gap-3 px-3 max-lg:justify-center max-lg:px-0"} ${
          active ? "bg-accent-dim text-accent" : open ? "bg-surface-2 text-ink-soft" : "text-muted hover:bg-surface-2 hover:text-ink-soft"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="8.5" strokeWidth="1.5" />
          <path d="M14.8 8.8c-.6-.5-1.5-.8-2.6-.8-1.5 0-2.7.7-2.7 1.9 0 1.1.9 1.6 2.7 2 1.7.4 2.5.9 2.5 2.1 0 1.3-1.1 2.1-2.8 2.1-1.2 0-2.3-.4-3-1.1M12 6.5v11" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        {!collapsed && <span className="min-w-0 flex-1 truncate text-left text-[12px] font-medium max-lg:hidden">Fundraising</span>}
        {!collapsed && count > 0 && <NavCount value={count} />}
        {!collapsed && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`transition-transform max-lg:hidden ${open ? "rotate-90" : ""}`}>
            <path d="m9 5 7 7-7 7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className={`absolute left-[52px] z-50 whitespace-nowrap rounded-md border border-line-strong bg-surface-3 px-2 py-1 text-[10px] uppercase tracking-wider text-ink opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 ${collapsed ? "" : "hidden max-lg:block"}`}>
          Fundraising
        </span>
      </button>

      {open && (
        <div className={`relative py-1.5 ${collapsed ? "" : "before:absolute before:bottom-2 before:left-2.5 before:top-2 before:w-px before:bg-line max-lg:before:hidden"}`}>
          {FUNDRAISING_NAV.map((item) => (
            <PartnerNavIcon
              key={item.href}
              href={item.href}
              label={item.label}
              active={isActive(pathname, item.href)}
              collapsed={collapsed}
            >
              {item.icon}
            </PartnerNavIcon>
          ))}
        </div>
      )}
    </div>
  );
}

function PartnerNavIcon({
  children,
  href,
  label,
  active,
  collapsed,
}: {
  children: React.ReactNode;
  href: string;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`group relative mx-1 flex h-8 items-center rounded-md transition-colors duration-150 ${collapsed ? "justify-center px-0" : "gap-2.5 pl-7 pr-2 max-lg:justify-center max-lg:px-0"} ${
        active ? "bg-accent-dim text-accent" : "text-muted hover:bg-surface-2 hover:text-ink-soft"
      }`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        {children}
      </svg>
      {!collapsed && <span className="min-w-0 flex-1 truncate text-[11px] font-medium max-lg:hidden">{label}</span>}
      <span className={`absolute left-[46px] z-50 whitespace-nowrap rounded-md border border-line-strong bg-surface-3 px-2 py-1 text-[10px] uppercase tracking-wider text-ink opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 ${collapsed ? "" : "hidden max-lg:block"}`}>
        {label}
      </span>
    </Link>
  );
}

function NavCount({ value }: { value: number }) {
  return (
    <span className="grid h-4 min-w-4 place-items-center rounded-full bg-surface-3 px-1.5 text-[9px] font-semibold text-muted max-lg:hidden">
      {value}
    </span>
  );
}

function NavIcon({
  children,
  href,
  label,
  active = false,
  collapsed,
  badge = 0,
  count = 0,
}: {
  children: React.ReactNode;
  href: string;
  label: string;
  active?: boolean;
  collapsed: boolean;
  badge?: number;
  count?: number;
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        {children}
      </svg>
      {!collapsed && <span className="min-w-0 flex-1 truncate text-[12px] font-medium max-lg:hidden">{label}</span>}
      {!collapsed && badge === 0 && count > 0 && <NavCount value={count} />}
      {badge > 0 && <span className={`grid min-w-4 h-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-semibold text-white ${collapsed ? "absolute right-0 top-0" : "max-lg:absolute max-lg:right-0 max-lg:top-0"}`}>{badge}</span>}
      <span className={`absolute left-[52px] z-50 whitespace-nowrap rounded-md border border-line-strong bg-surface-3 px-2 py-1 text-[10px] uppercase tracking-wider text-ink opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 ${collapsed ? "" : "hidden max-lg:block"}`}>
        {label}
      </span>
    </Link>
  );
}
