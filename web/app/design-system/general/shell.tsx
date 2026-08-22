"use client";

import * as React from "react";

import { Button } from "@/design-system/components/button";

import { CopySourceButton, SourceDrawer } from "../source-drawer";
import styles from "./general.module.css";

/**
 * A `source` of "components/button" names a real vendored file, so the specimen
 * can offer Copy and View Code. "composed · …" ones have no single file behind
 * them and get the label only.
 */
function vendoredName(source?: string) {
  const match = /^components\/([a-z0-9-]+)$/.exec(source ?? "");
  return match ? match[1] : null;
}

/** A numbered top-level section, e.g. "01 · Foundation". */
export function Section({
  id,
  index,
  title,
  copy,
  children,
}: {
  id: string;
  index: string;
  title: string;
  copy: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={styles.section}>
      <header className={styles.sectionHead}>
        <p className={styles.sectionIndex}>{index}</p>
        <h2>{title}</h2>
        <p className={styles.sectionCopy}>{copy}</p>
      </header>
      {children}
    </section>
  );
}

/** A sub-group inside a section — "Buttons", "Colors", … */
export function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className={styles.group}>
      <div className={styles.groupHead}>
        <h3>{title}</h3>
        {hint ? <code>{hint}</code> : null}
      </div>
      {children}
    </div>
  );
}

/**
 * One live specimen. `source` names the file it comes from so the page always
 * says where a thing is defined rather than just showing a picture of it.
 */
export function Spec({
  label,
  source,
  wide,
  /** Lets a specimen paint outside its card — NavigationMenu renders its panel
   *  inline rather than through a portal, so clipping would cut it off. */
  overflow,
  /** Claims two grid rows. Without it a tall specimen sets the row height for
   *  its whole row and leaves its shorter neighbours sitting over dead space. */
  tall,
  children,
}: {
  label: string;
  source?: string;
  wide?: boolean;
  overflow?: boolean;
  tall?: boolean;
  children: React.ReactNode;
}) {
  const name = vendoredName(source);
  const [open, setOpen] = React.useState(false);

  return (
    <article
      className={wide ? styles.specWide : styles.spec}
      data-overflow={overflow || undefined}
      data-tall={tall || undefined}
    >
      <div className={styles.specBar}>
        <span className={styles.specLabel}>{label}</span>
        {name ? (
          <div className={styles.specActions}>
            <CopySourceButton name={name} label={label} />
            <Button variant="outline" size="sm" className={styles.specViewCode} onClick={() => setOpen(true)}>
              View Code
            </Button>
          </div>
        ) : source ? (
          <code>{source}</code>
        ) : null}
      </div>
      <div className={styles.specStage}>{children}</div>
      {open && name ? (
        <SourceDrawer name={name} title={label} kicker={source} onClose={() => setOpen(false)} />
      ) : null}
    </article>
  );
}

export function SpecGrid({ children, columns }: { children: React.ReactNode; columns?: 2 | 3 }) {
  return (
    <div className={columns === 2 ? styles.grid2 : columns === 3 ? styles.grid3 : styles.grid}>{children}</div>
  );
}

export { styles as generalStyles };
