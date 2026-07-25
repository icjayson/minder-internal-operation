// Shared page header — the "live" eyebrow + title + subtitle strip used at the
// top of every route. `children` renders inside the header (chevrons, stat
// cards); `right` renders the top-right meta line.

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="px-8 pt-7 pb-4 border-b border-line">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1 text-[11px] mono uppercase tracking-[0.14em] text-accent">
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-accent">
              <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-60" />
            </span>
            {eyebrow}
          </div>
          <h1 className="text-[26px] leading-tight tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-[13px] text-ink-soft mt-1">{subtitle}</p>
          )}
        </div>
        {right && (
          <div className="flex items-center gap-2 text-[11px] mono text-muted uppercase tracking-wider">
            {right}
          </div>
        )}
      </div>
      {children}
    </header>
  );
}
