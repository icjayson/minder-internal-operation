"use client";

import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/design-system/components/alert";
import { Button } from "@/design-system/components/button";
import { Label } from "@/design-system/components/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/design-system/components/sheet";
import { cn } from "@/design-system/lib/utils";

/**
 * The shell behind every "add a …" side panel.
 *
 * The four of them were the same forty lines of hand-rolled panel — a fixed
 * backdrop button, a fixed `<aside>`, an Escape listener, and a footer — copied
 * once per entity. Sheet supplies all of that plus the focus trap, the scroll
 * lock, and the dialog semantics none of the copies had.
 *
 * The form stays outside the footer and is reached by `formId`, so the submit
 * button can sit in the footer while the fields scroll independently.
 */
export function FormDrawer({
  eyebrow,
  title,
  description,
  formId,
  submitLabel,
  saving,
  error,
  onClose,
  onSubmit,
  className,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  formId: string;
  submitLabel: string;
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  /** Width override; the default is the 520px the panels were drawn at. */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        // A save in flight owns the panel until it settles, the same rule the
        // hand-rolled Escape listener enforced.
        if (!open && !saving) onClose();
      }}
    >
      <SheetContent
        side="right"
        className={cn("w-full gap-0 p-0 sm:max-w-[520px]", className)}
      >
        <SheetHeader className="relative gap-1 border-b px-6 pt-5 pb-4">
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="text-[10px] tracking-[0.14em] text-primary uppercase">{eyebrow}</div>
          <SheetTitle className="text-heading-3">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-[12px]">{description}</SheetDescription>
          )}
        </SheetHeader>

        <form id={formId} onSubmit={onSubmit} className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {error && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {children}
        </form>

        <SheetFooter className="flex-row items-center gap-2 border-t bg-muted/40 px-6 py-3">
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <div className="flex-1" />
          <Button type="submit" form={formId} disabled={saving}>
            {saving ? "Saving…" : submitLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** A labelled row. The label is the system's, the layout is the panel's. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <Label className="mb-1 block text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </Label>
      {children}
    </label>
  );
}

/**
 * The shell behind the read/edit side panels — factory, network, fundraising.
 *
 * Unlike FormDrawer this one supplies only the panel: each of these draws its
 * own header, with an editable title, a score chip, and its own close control,
 * so Sheet's built-in close button is off. The Title and Description are still
 * rendered for the accessibility tree, since Radix requires them and the
 * visible heading is an <input> the panel owns.
 */
export function DetailDrawer({
  title,
  description,
  onClose,
  className,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn("w-full gap-0 bg-card p-0 sm:max-w-[560px]", className)}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description ?? title}</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

/**
 * The factory and fundraising panels render either as a side drawer or as a
 * full page at their own route, from one body of markup. This picks the
 * wrapper so the body does not have to know which it is in.
 */
export function PanelShell({
  variant,
  title,
  description,
  width,
  onClose,
  children,
}: {
  variant: "drawer" | "page";
  title: string;
  description?: string;
  /** Drawer width; ignored on the page variant. */
  width?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (variant === "page") {
    return <section className="min-h-screen w-full bg-card">{children}</section>;
  }
  return (
    <DetailDrawer title={title} description={description} onClose={onClose} className={width}>
      {children}
    </DetailDrawer>
  );
}
