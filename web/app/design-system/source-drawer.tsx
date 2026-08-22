"use client";

import * as React from "react";
import { CheckIcon, CopyIcon, XIcon } from "lucide-react";

import { Button } from "@/design-system/components/button";

import { CodeBlock } from "./code-block";
import styles from "./source-drawer.module.css";

type SourceState = { code: string; status: "loading" | "ready" | "error" };

/** Fetches a vendored file's source once per name, then keeps it for the session. */
export function useVendoredSource(name: string | null): SourceState {
  const cache = React.useRef(new Map<string, string>());
  const [state, setState] = React.useState<SourceState>({ code: "", status: "loading" });

  React.useEffect(() => {
    if (!name) return;
    const cached = cache.current.get(name);
    if (cached !== undefined) {
      setState({ code: cached, status: "ready" });
      return;
    }
    let cancelled = false;
    setState({ code: "", status: "loading" });
    fetch(`/api/design-system/component-source?name=${encodeURIComponent(name)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("unavailable"))))
      .then((payload: { files?: Array<{ content: string }> }) => {
        const code = payload.files?.[0]?.content ?? "";
        cache.current.set(name, code);
        if (!cancelled) setState({ code, status: "ready" });
      })
      .catch(() => {
        if (!cancelled) setState({ code: "", status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  return state;
}

/** The copy-icon button that sits on a specimen's toolbar. */
export function CopySourceButton({ name, label }: { name: string; label: string }) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={styles.iconAction}
      data-copied={copied || undefined}
      title={copied ? "Copied" : "Copy source"}
      aria-label={`Copy ${label} source`}
      onClick={async () => {
        try {
          const response = await fetch(
            `/api/design-system/component-source?name=${encodeURIComponent(name)}`
          );
          const payload = (await response.json()) as { files?: Array<{ content: string }> };
          await navigator.clipboard.writeText(payload.files?.[0]?.content ?? "");
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  );
}

/** Slide-over showing one vendored file, shared by every specimen surface. */
export function SourceDrawer({
  name,
  title,
  kicker,
  onClose,
}: {
  name: string;
  title: string;
  kicker?: string;
  onClose: () => void;
}) {
  const { code, status } = useVendoredSource(name);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={`${name} source`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
            <h2>{title}</h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close code panel">
            <XIcon />
          </Button>
        </header>
        <div className={styles.body}>
          <CodeBlock
            code={
              status === "loading"
                ? "// Loading source…"
                : status === "error"
                  ? "// Source unavailable."
                  : code
            }
            filename={`${name}.tsx`}
            language="tsx"
            className={styles.code}
          />
        </div>
      </aside>
    </div>
  );
}
