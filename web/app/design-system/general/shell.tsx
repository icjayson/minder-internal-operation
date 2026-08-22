"use client";

import * as React from "react";

import styles from "./general.module.css";

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
  return (
    <article
      className={wide ? styles.specWide : styles.spec}
      data-overflow={overflow || undefined}
      data-tall={tall || undefined}
    >
      <div className={styles.specBar}>
        <span>{label}</span>
        {source ? <code>{source}</code> : null}
      </div>
      <div className={styles.specStage}>{children}</div>
    </article>
  );
}

export function SpecGrid({ children, columns }: { children: React.ReactNode; columns?: 2 | 3 }) {
  return (
    <div className={columns === 2 ? styles.grid2 : columns === 3 ? styles.grid3 : styles.grid}>{children}</div>
  );
}

export { styles as generalStyles };
