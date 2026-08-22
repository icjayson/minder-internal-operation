"use client";

import * as React from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { highlight } from "sugar-high";

import { Button } from "@/design-system/components/button";

import styles from "./code-block.module.css";

type Language = "tsx" | "ts" | "css" | "bash";

const BADGE: Record<Language, string> = { tsx: "TS", ts: "TS", css: "CSS", bash: "SH" };

/**
 * The one code surface for the design system — chart source, component source,
 * and the token stylesheet all render through it.
 *
 * `sugar-high` emits `style="color: var(--sh-*)"` inline, so the palette is set
 * from CSS custom properties rather than by overriding its classes; that also
 * means the theme follows the light/dark sky for free.
 */
export function CodeBlock({
  code,
  filename,
  language = "tsx",
  actions,
  lineNumbers = true,
  className,
}: {
  code: string;
  filename?: string;
  language?: Language;
  actions?: React.ReactNode;
  lineNumbers?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  // CSS handles the highlighting; only the tokenising happens here.
  const html = React.useMemo(
    () => (language === "bash" ? null : highlight(code)),
    [code, language]
  );

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <div className={className ? `${styles.block} ${className}` : styles.block}>
      <div className={styles.bar}>
        <span className={styles.badge}>{BADGE[language]}</span>
        <span className={styles.filename}>{filename ?? `snippet.${language}`}</span>
        <div className={styles.actions}>
          {actions}
          <Button
            variant="ghost"
            size="icon-sm"
            className={styles.iconButton}
            aria-label={copied ? "Copied" : "Copy code"}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </Button>
        </div>
      </div>

      <pre className={styles.pre} data-numbered={lineNumbers || undefined}>
        {html ? (
          <code className={styles.code} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code className={styles.code}>{code}</code>
        )}
      </pre>
    </div>
  );
}
