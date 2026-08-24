"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/design-system/components/collapsible";
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarTrigger,
} from "@/design-system/components/sidebar";
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

/** The hand-drawn glyphs are `<path>` fragments, so each needs its own frame. */
function NavIcon({ children, size = 18 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      {children}
    </svg>
  );
}

/**
 * A nav section that owns a sub-list — Partners, Fundraising.
 *
 * It opens when one of its children is the current route and stays open
 * otherwise, which is what the hand-rolled version did with an effect. As a
 * Collapsible the open state is `defaultOpen` plus the user's own clicks, so
 * no effect is needed and navigating inside the section cannot slam it shut.
 */
function NavSection({
  label,
  icon,
  items,
  pathname,
  count,
}: {
  label: string;
  icon: React.ReactNode;
  items: { href: string; label: string; icon: React.ReactNode }[];
  pathname: string;
  count: number;
}) {
  const active = items.some((item) => isActive(pathname, item.href));

  return (
    <Collapsible asChild defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={label} isActive={active}>
            <NavIcon>{icon}</NavIcon>
            <span>{label}</span>
            <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        {count > 0 && <SidebarMenuBadge className="right-7">{count}</SidebarMenuBadge>}
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((item) => (
              <SidebarMenuSubItem key={item.href}>
                <SidebarMenuSubButton asChild isActive={isActive(pathname, item.href)}>
                  <Link href={item.href}>
                    <NavIcon size={15}>{item.icon}</NavIcon>
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

/** One flat nav row. */
function NavLink({
  href,
  label,
  icon,
  pathname,
  count = 0,
  badge = 0,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  pathname: string;
  /** Quiet count, hidden when collapsed. */
  count?: number;
  /** Loud count — unread alerts — which stays visible when collapsed. */
  badge?: number;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={label} isActive={isActive(pathname, href)}>
        <Link href={href}>
          <NavIcon>{icon}</NavIcon>
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
      {badge > 0 ? (
        <SidebarMenuBadge className="bg-primary text-primary-foreground group-data-[collapsible=icon]:right-1 group-data-[collapsible=icon]:-top-0.5 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:min-w-4 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:text-[9px]">
          {badge}
        </SidebarMenuBadge>
      ) : count > 0 ? (
        <SidebarMenuBadge>{count}</SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
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

  // NAV[0] is Verticals and sits above Customers; the rest follow the two
  // collapsible sections. Slice first, then filter, so hiding Verticals leaves
  // the remaining order alone rather than promoting the next item into its slot.
  const lead = NAV.slice(0, 1).filter((item) => !HIDDEN_NAV_HREFS.has(item.href));
  const rest = NAV.slice(1).filter((item) => !HIDDEN_NAV_HREFS.has(item.href));

  return (
    <SidebarRoot collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Minder Ops Platform">
              <Link href="/" aria-label="Minder Ops Platform — home">
                <span className="relative aspect-square size-8 shrink-0 overflow-hidden rounded-lg ring-1 ring-sidebar-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/minder-lead-logo.png" alt="" className="h-full w-full object-cover" />
                  <span className="absolute right-0 bottom-0 size-2 rounded-full bg-primary ring-2 ring-sidebar" />
                </span>
                <span className="grid min-w-0 flex-1">
                  <span className="truncate text-[13px] font-semibold">Minder Ops Platform</span>
                  <span className="truncate text-[9px] tracking-[0.12em] text-muted-foreground uppercase">
                    Internal operations
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {lead.map((item) => (
                <NavLink key={item.href} {...item} pathname={pathname} />
              ))}

              <NavLink
                href="/customers"
                label="Customers"
                pathname={pathname}
                count={customerCount}
                icon={
                  <>
                    <circle cx="9" cy="8" r="3" strokeWidth="1.5" />
                    <path d="M3 20c0-3.3 2.7-6 6-6 1.4 0 2.7.5 3.7 1.3" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="m15 18 2 2 4-4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                }
              />

              <NavSection
                label="Partners"
                pathname={pathname}
                items={PARTNER_NAV}
                count={partnerCount}
                icon={
                  <>
                    <circle cx="8" cy="8" r="3" strokeWidth="1.5" />
                    <circle cx="17" cy="9" r="2.5" strokeWidth="1.5" />
                    <path d="M2.5 20c0-3.5 2.4-6 5.5-6s5.5 2.5 5.5 6M13.5 15.2c1-.8 2.1-1.2 3.5-1.2 2.6 0 4.5 2 4.5 5" strokeWidth="1.5" strokeLinecap="round" />
                  </>
                }
              />

              <NavSection
                label="Fundraising"
                pathname={pathname}
                items={FUNDRAISING_NAV}
                count={fundraisingCount}
                icon={
                  <>
                    <circle cx="12" cy="12" r="8.5" strokeWidth="1.5" />
                    <path d="M14.8 8.8c-.6-.5-1.5-.8-2.6-.8-1.5 0-2.7.7-2.7 1.9 0 1.1.9 1.6 2.7 2 1.7.4 2.5.9 2.5 2.1 0 1.3-1.1 2.1-2.8 2.1-1.2 0-2.3-.4-3-1.1M12 6.5v11" strokeWidth="1.4" strokeLinecap="round" />
                  </>
                }
              />

              {rest.map((item) => (
                <NavLink key={item.href} {...item} pathname={pathname} />
              ))}

              {/* Persistent alert history with the actionable unread badge. */}
              <NavLink
                href="/alert-log"
                label="Alert log"
                pathname={pathname}
                badge={unread}
                icon={
                  <>
                    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeWidth="1.5" strokeLinecap="round" />
                  </>
                }
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-between px-2 group-data-[collapsible=icon]:justify-center">
          <span className="text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
            Appearance
          </span>
          <ThemeToggle />
        </div>
        <SidebarMenu>
          {!HIDDEN_NAV_HREFS.has(SETTINGS.href) && (
            <NavLink {...SETTINGS} pathname={pathname} />
          )}
          <SidebarMenuItem>
            <SidebarTrigger className="w-full justify-start gap-2 px-2 text-[10.5px] text-muted-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </SidebarRoot>
  );
}
