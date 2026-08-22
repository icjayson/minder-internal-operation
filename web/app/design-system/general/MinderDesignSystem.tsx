"use client";

import * as React from "react";

import { useDesignSystemTheme } from "../theme-context";
import { DataSection } from "./sections-data";
import { FeedbackSection } from "./sections-feedback";
import { FormsSection } from "./sections-forms";
import { FoundationSection } from "./sections-foundation";
import { NavigationSection } from "./sections-navigation";
import { OverlaySection } from "./sections-overlay";
import { Section } from "./shell";
import styles from "./general.module.css";
import { buildTokenCss } from "./tokens";

const SECTIONS = [
  { id: "foundation", index: "01", title: "Foundation / Design Tokens", copy: "Colour ramps, surfaces, text, borders, type, spacing, radius, elevation, and breakpoints. Every value below is the one the stylesheet at the end of this page ships.", Body: FoundationSection },
  { id: "forms", index: "02", title: "Form & Input", copy: "Buttons through to labels, helper text, and error messages. Each specimen is the live component from design-system/components — not a picture of one.", Body: FormsSection },
  { id: "navigation", index: "03", title: "Navigation", copy: "Getting around: header, sidebar, breadcrumb, tabs, pagination, stepper, menus, and footer.", Body: NavigationSection },
  { id: "feedback", index: "04", title: "Feedback & Status", copy: "How the system tells you what happened — alerts, toasts, modals, tooltips, progress, and empty states.", Body: FeedbackSection },
  { id: "data", index: "05", title: "Data Display", copy: "Surfaces that carry content: cards, tables, lists, avatars, accordions, timelines, and carousels.", Body: DataSection },
  { id: "overlay", index: "06", title: "Overlay / Interaction", copy: "Layers that open on demand — dropdowns, context menus, the ⌘K palette, and destructive confirmation.", Body: OverlaySection },
] as const;

/** The stylesheet at the foot of the page: copy to clipboard, or save as a file. */
function TokenStylesheet() {
  const css = React.useMemo(() => buildTokenCss(), []);
  const [copied, setCopied] = React.useState(false);
  const [href, setHref] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    const url = URL.createObjectURL(new Blob([css], { type: "text/css" }));
    setHref(url);
    return () => URL.revokeObjectURL(url);
  }, [css]);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <section id="stylesheet" className={styles.section}>
      <header className={styles.sectionHead}>
        <p className={styles.sectionIndex}>07</p>
        <h2>The stylesheet</h2>
        <p className={styles.sectionCopy}>
          Every token on this page as plain CSS custom properties. Generated from{" "}
          <code>app/design-system/general/tokens.ts</code>, so the swatches above and this block can
          never disagree.
        </p>
      </header>

      <div className={styles.codeCard}>
        <div className={styles.codeBar}>
          <span>minder-tokens.css</span>
          <div className={styles.codeActions}>
            <button
              type="button"
              data-copied={copied || undefined}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(css);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <a href={href} download="minder-tokens.css" aria-disabled={!href}>
              Download
            </a>
          </div>
        </div>
        <pre className={styles.codeBlock}>
          <code>{css}</code>
        </pre>
      </div>
    </section>
  );
}

/**
 * The Minder general design system — the same primitives as the component
 * library, re-tokenised to the brand blue and set in Roboto.
 */
export default function MinderDesignSystem() {
  const { dark, toggleDark } = useDesignSystemTheme();


  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.heroEyebrow}>MINDER · GENERAL DESIGN SYSTEM</p>
        <h1>
          Minder Platform Design System
        </h1>
        <p className={styles.heroLead}>
          Tokens, components, and the rules that hold them together. Everything below renders the
          real component from <code>design-system/components</code>, on the palette this page has
          always used.
        </p>
        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.themeToggle}
            aria-pressed={dark}
            onClick={toggleDark}
          >
            {dark ? "☾ Dark" : "☀ Light"}
          </button>
          <span className={styles.themeHint}>
            Both skies are token swaps — no component changes underneath.
          </span>
        </div>
        <nav className={styles.heroNav} aria-label="Sections">
          {SECTIONS.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.index} · {section.title}
            </a>
          ))}
          <a href="#stylesheet">07 · The stylesheet</a>
        </nav>
      </header>

      {SECTIONS.map(({ id, index, title, copy, Body }) => (
        <Section key={id} id={id} index={index} title={title} copy={copy}>
          <Body />
        </Section>
      ))}

      <TokenStylesheet />
    </div>
  );
}
