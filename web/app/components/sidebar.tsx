"use client";

export function Sidebar() {
  return (
    <aside className="sticky top-0 self-start h-screen w-14 shrink-0 border-r border-line bg-surface/60 backdrop-blur flex flex-col items-center py-3 gap-0.5">
      <div className="relative w-9 h-9 rounded-md bg-gradient-to-br from-accent to-accent-2 text-canvas grid place-items-center font-display text-[15px] font-semibold mb-3 shadow-[0_0_20px_-4px_rgba(59,255,160,0.45)]">
        m
        <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-accent ring-2 ring-canvas" />
      </div>

      <NavIcon label="Pipeline" active>
        <path d="M4 6h16M4 12h12M4 18h8" strokeWidth="1.6" strokeLinecap="round" />
      </NavIcon>
      <NavIcon label="Prospects">
        <circle cx="9" cy="8" r="3" strokeWidth="1.5" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="17" cy="7" r="2" strokeWidth="1.5" />
      </NavIcon>
      <NavIcon label="Follow-ups">
        <rect x="4" y="5" width="16" height="15" rx="2" strokeWidth="1.5" />
        <path d="M8 3v4M16 3v4M4 10h16" strokeWidth="1.5" strokeLinecap="round" />
      </NavIcon>
      <NavIcon label="Messages">
        <path
          d="M4 6c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2h-6l-4 3v-3H6c-1.1 0-2-.9-2-2V6Z"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </NavIcon>
      <NavIcon label="Analytics">
        <path d="M4 19V5M10 19v-8M16 19v-5M22 19H2" strokeWidth="1.5" strokeLinecap="round" />
      </NavIcon>

      <div className="flex-1" />

      <NavIcon label="Settings">
        <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
        <path
          d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.2.6.7 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </NavIcon>
    </aside>
  );
}

function NavIcon({
  children,
  label,
  active = false,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      className={`group relative w-9 h-9 rounded-md grid place-items-center cursor-pointer transition-colors duration-150 ${
        active
          ? "bg-surface-3 text-accent"
          : "text-muted hover:bg-surface-2 hover:text-ink-soft"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-accent" />
      )}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        {children}
      </svg>
      <span className="absolute left-11 whitespace-nowrap rounded-md bg-surface-3 border border-line-strong text-ink text-[11px] mono uppercase tracking-wider px-2 py-1 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
        {label}
      </span>
    </button>
  );
}
