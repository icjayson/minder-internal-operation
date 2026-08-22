"use client";

import * as React from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/design-system/components/command";

import { CodeBlock } from "../code-block";
import { useDesignSystemTheme } from "../theme-context";
import styles from "./library.module.css";
import {
  libraryByCategory,
  libraryEntries,
  libraryGeneratedAt,
  librarySource,
  libraryStyle,
  type LibraryEntry,
} from "./registry";

type SourceFile = { path: string; content: string };

const PACKAGE_MANAGERS = ["pnpm", "npm", "yarn", "bun"] as const;
type PackageManager = (typeof PACKAGE_MANAGERS)[number];

function installCommand(manager: PackageManager, dependencies: string[]) {
  if (dependencies.length === 0) return "# No runtime dependencies for this component.";
  const packages = dependencies.join(" ");
  if (manager === "npm") return `npm install ${packages}`;
  if (manager === "yarn") return `yarn add ${packages}`;
  if (manager === "bun") return `bun add ${packages}`;
  return `pnpm add ${packages}`;
}

/** Copy-to-clipboard button that reports back for ~1.5s. */
function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      className={styles.copyButton}
      data-copied={copied || undefined}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

/** A live example: the rendered component up top, its source collapsed underneath. */
function DemoBlock({ demo }: { demo: LibraryEntry["demos"][number] }) {
  const [showCode, setShowCode] = React.useState(false);
  const Demo = demo.Component;

  return (
    <div className={styles.demo}>
      <div className={styles.previewSurface}>
        <div className={styles.previewCanvas}>
          <Demo />
        </div>
      </div>
      <div className={styles.codeShell} data-open={showCode || undefined}>
        <pre className={styles.preCollapsed}>
          <code>{demo.code}</code>
        </pre>
        <div className={styles.codeShellActions}>
          <button type="button" className={styles.viewCode} onClick={() => setShowCode((value) => !value)}>
            {showCode ? "Collapse code" : "View code"}
          </button>
          {showCode ? <CopyButton value={demo.code} /> : null}
        </div>
      </div>
    </div>
  );
}

function SourcePanel({ entry }: { entry: LibraryEntry }) {
  const [files, setFiles] = React.useState<SourceFile[] | null>(null);
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const [activeFile, setActiveFile] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setFiles(null);
    setActiveFile(0);
    setStatus("loading");
    fetch(`/api/design-system/component-source?name=${encodeURIComponent(entry.name)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("unavailable"))))
      .then((payload: { files?: SourceFile[] }) => {
        if (cancelled) return;
        setFiles(payload.files ?? []);
        setStatus("idle");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [entry.name]);

  if (status === "loading") return <p className={styles.sourceNote}>Loading source…</p>;
  if (status === "error" || !files || files.length === 0) {
    return <p className={styles.sourceNote}>Source unavailable for this component.</p>;
  }

  const file = files[Math.min(activeFile, files.length - 1)];
  return (
    <div className={styles.sourcePanel}>
      {files.length > 1 ? (
        <div className={styles.fileTabs}>
          {files.map((candidate, index) => (
            <button
              key={candidate.path}
              type="button"
              className={index === activeFile ? styles.fileTabActive : styles.fileTab}
              onClick={() => setActiveFile(index)}
            >
              {candidate.path.split("/").pop()}
            </button>
          ))}
        </div>
      ) : null}
      <CodeBlock code={file.content} filename={file.path} />
    </div>
  );
}

function pageMarkdown(entry: LibraryEntry) {
  const demos = entry.demos
    .map((demo) => `### ${demo.title}\n\n${demo.description ?? ""}\n\n\`\`\`tsx\n${demo.code}\n\`\`\``)
    .join("\n\n");
  return `# ${entry.title}\n\n${entry.description}\n\n## Usage\n\n\`\`\`tsx\n${entry.usage}\n\`\`\`\n\n${demos}\n`;
}

export default function LocalComponentLibrary() {
  const { dark, toggleDark } = useDesignSystemTheme();

  const [activeName, setActiveName] = React.useState(libraryEntries[0]?.name ?? "");
  const [query, setQuery] = React.useState("");
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [manager, setManager] = React.useState<PackageManager>("pnpm");
  const [activeSection, setActiveSection] = React.useState("installation");
  const mainRef = React.useRef<HTMLDivElement>(null);
  const navRef = React.useRef<HTMLElement>(null);

  const entry = libraryEntries.find((candidate) => candidate.name === activeName) ?? libraryEntries[0];
  const index = libraryEntries.indexOf(entry);
  const previous = index > 0 ? libraryEntries[index - 1] : null;
  const next = index < libraryEntries.length - 1 ? libraryEntries[index + 1] : null;

  /* Jumping via the palette or the pager can land on an entry that is scrolled
     out of the sidebar, so keep the current one in view. */
  React.useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  }, [activeName]);

  React.useEffect(() => {
    const fromHash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (libraryEntries.some((candidate) => candidate.name === fromHash)) setActiveName(fromHash);
  }, []);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const sections = React.useMemo(
    () => [
      { id: "installation", label: "Installation" },
      { id: "usage", label: "Usage" },
      ...entry.demos.map((demo) => ({ id: demo.id, label: demo.title })),
      { id: "source", label: "Component source" },
    ],
    [entry]
  );

  /* Scroll-spy for the "On this page" rail. The observer root is the docs column,
     not the window, because the column is the element that actually scrolls. */
  React.useEffect(() => {
    const root = mainRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((record) => record.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { root, rootMargin: "0px 0px -70% 0px", threshold: 0 }
    );
    for (const section of sections) {
      const element = root.querySelector(`#${CSS.escape(section.id)}`);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [sections]);

  function select(name: string) {
    setActiveName(name);
    setActiveSection("installation");
    window.history.replaceState(null, "", `#${name}`);
    mainRef.current?.scrollTo({ top: 0 });
  }

  function scrollTo(id: string) {
    const root = mainRef.current;
    const element = root?.querySelector(`#${CSS.escape(id)}`);
    if (!root || !(element instanceof HTMLElement)) return;
    root.scrollTo({ top: element.offsetTop - 16, behavior: "smooth" });
    setActiveSection(id);
  }

  const filteredGroups = libraryByCategory
    .map((group) => ({
      ...group,
      entries: group.entries.filter((candidate) =>
        `${candidate.title} ${candidate.name}`.toLowerCase().includes(query.trim().toLowerCase())
      ),
    }))
    .filter((group) => group.entries.length > 0);

  return (
    <section className={styles.docs}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <input
            className={styles.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter components…"
            aria-label="Filter components"
          />
          <button type="button" className={styles.paletteButton} onClick={() => setPaletteOpen(true)}>
            Search <kbd>⌘K</kbd>
          </button>
        </div>
        <nav className={styles.sidebarNav} aria-label="Components" ref={navRef}>
          {filteredGroups.map((group) => (
            <div key={group.category} className={styles.navGroup}>
              <p className={styles.navGroupLabel}>{group.category}</p>
              <ul>
                {group.entries.map((candidate) => (
                  <li key={candidate.name}>
                    <button
                      type="button"
                      className={candidate.name === entry.name ? styles.navLinkActive : styles.navLink}
                      aria-current={candidate.name === entry.name ? "page" : undefined}
                      onClick={() => select(candidate.name)}
                    >
                      {candidate.title}
                      {candidate.demos.length === 0 ? <span className={styles.navHint}>src</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {filteredGroups.length === 0 ? <p className={styles.navEmpty}>No components match “{query}”.</p> : null}
        </nav>
      </aside>

      <div className={styles.main} ref={mainRef}>
        <div className={styles.mainInner}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <span>Design system</span>
            <span aria-hidden>/</span>
            <span>Components</span>
            <span aria-hidden>/</span>
            <span className={styles.breadcrumbCurrent}>{entry.title}</span>
          </nav>

          <header className={styles.header}>
            <div>
              <h1>{entry.title}</h1>
              <p>{entry.description}</p>
            </div>
            <div className={styles.headerActions}>
              <CopyButton value={pageMarkdown(entry)} label="Copy page" />
              <button
                type="button"
                className={styles.iconButton}
                aria-pressed={dark}
                onClick={toggleDark}
                title="Toggle preview theme"
              >
                {dark ? "☾ Dark" : "☀ Light"}
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => previous && select(previous.name)}
                disabled={!previous}
                aria-label="Previous component"
              >
                ←
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => next && select(next.name)}
                disabled={!next}
                aria-label="Next component"
              >
                →
              </button>
            </div>
          </header>

          <div className={styles.metaRow}>
            <span className={styles.metaPill}>registry:{entry.registryType}</span>
            <span className={styles.metaPill}>
              {entry.files.length} file{entry.files.length === 1 ? "" : "s"}
            </span>
            <span className={styles.metaPill}>{libraryStyle}</span>
            {entry.dependencies.length > 0 ? (
              <span className={styles.metaPill}>{entry.dependencies.length} dependencies</span>
            ) : null}
          </div>

          <section id="installation" className={styles.section}>
            <h2>Installation</h2>
            <p className={styles.sectionCopy}>
              Nothing to add — the source already lives at{" "}
              <code>design-system/components/{entry.name}.tsx</code>. Only install the runtime
              packages it actually imports.
            </p>
            <div className={styles.managerTabs} role="tablist" aria-label="Package manager">
              {PACKAGE_MANAGERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={manager === value}
                  className={manager === value ? styles.managerTabActive : styles.managerTab}
                  onClick={() => setManager(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <CodeBlock
              code={installCommand(manager, entry.dependencies)}
              filename="terminal"
              language="bash"
              lineNumbers={false}
            />
          </section>

          <section id="usage" className={styles.section}>
            <h2>Usage</h2>
            <CodeBlock code={entry.usage} filename={`${entry.name}.tsx`} lineNumbers={false} />
          </section>

          {entry.demos.length === 0 ? (
            <section className={styles.section}>
              <h2>Examples</h2>
              <p className={styles.sectionCopy}>
                No example written for this component yet — read the vendored source below and add
                one to <code>app/design-system/library</code>.
              </p>
            </section>
          ) : null}

          {entry.demos.map((demo) => (
            <section id={demo.id} key={demo.id} className={styles.section}>
              <h2>{demo.title}</h2>
              {demo.description ? <p className={styles.sectionCopy}>{demo.description}</p> : null}
              <DemoBlock demo={demo} />
            </section>
          ))}

          <section id="source" className={styles.section}>
            <h2>Component source</h2>
            <p className={styles.sectionCopy}>
              This is the file in your repository. Edit it directly — tokens, variants, and
              accessibility defaults are all yours.
            </p>
            <SourcePanel entry={entry} />
          </section>

          <nav className={styles.pager} aria-label="Component pagination">
            {previous ? (
              <button type="button" onClick={() => select(previous.name)}>
                ← {previous.title}
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button type="button" onClick={() => select(next.name)}>
                {next.title} →
              </button>
            ) : (
              <span />
            )}
          </nav>

          <footer className={styles.footer}>
            <span>
              {libraryEntries.length} components · {libraryStyle}
            </span>
            <span>
              Snapshot {new Date(libraryGeneratedAt).toLocaleDateString("en-US", { dateStyle: "medium" })} ·{" "}
              {librarySource.replace("https://", "")}
            </span>
          </footer>
        </div>
      </div>

      <aside className={styles.toc}>
        <p className={styles.tocLabel}>On this page</p>
        <ul>
          {sections.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                className={activeSection === section.id ? styles.tocLinkActive : styles.tocLink}
                onClick={() => scrollTo(section.id)}
              >
                {section.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Search 61 local components…" />
        <CommandList>
          <CommandEmpty>No components found.</CommandEmpty>
          {libraryByCategory.map((group) => (
            <CommandGroup key={group.category} heading={group.category}>
              {group.entries.map((candidate) => (
                <CommandItem
                  key={candidate.name}
                  value={`${candidate.title} ${candidate.name}`}
                  onSelect={() => {
                    select(candidate.name);
                    setPaletteOpen(false);
                  }}
                >
                  {candidate.title}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </section>
  );
}
