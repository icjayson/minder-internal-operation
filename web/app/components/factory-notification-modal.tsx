"use client";

import { useState } from "react";
import { CheckCircle2Icon, MegaphoneIcon, SendIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/design-system/components/alert";
import { Button } from "@/design-system/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design-system/components/dialog";
import { Input } from "@/design-system/components/input";
import { Label } from "@/design-system/components/label";
import { Textarea } from "@/design-system/components/textarea";
import { cn } from "@/design-system/lib/utils";
import { DateField } from "./date-field";

type CreateResult = {
  notificationId: string;
  discord: "sent" | "failed" | "not_configured";
  destination: { type: string; id: string; name: string };
};

export function FactoryNotificationModal({
  factoryId,
  factoryName,
  destination,
  onClose,
}: {
  factoryId: string;
  factoryName: string;
  destination: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/factory-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factoryId, title: title.trim(), message: message.trim(), dueOn: dueOn || null }),
      });
      const data = await response.json() as CreateResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
      setResult(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create notification");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        // A send in flight owns the dialog until it settles.
        if (!open && !sending) onClose();
      }}
    >
      <DialogContent className="gap-0 p-0 sm:max-w-[520px]">
        <DialogHeader className="flex-row items-start gap-3 space-y-0 border-b px-5 py-4 text-left">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            <MegaphoneIcon className="size-[19px]" />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[16px]">Create notification</DialogTitle>
            <DialogDescription className="mt-0.5 text-[11.5px] leading-relaxed">
              Creates an in-app alert and sends the same message to Discord.
            </DialogDescription>
          </div>
        </DialogHeader>

        {result ? (
          <div className="px-5 py-6">
            <div
              className={cn(
                "rounded-xl border px-4 py-4",
                result.discord === "sent"
                  ? "border-success/35 bg-success-light text-success-dark dark:bg-success/15 dark:text-success"
                  : "border-warning/35 bg-warning-light text-warning-dark dark:bg-warning/15 dark:text-warning",
              )}
            >
              <div className="flex items-center gap-2 text-[13px] font-semibold">
                <CheckCircle2Icon className="size-4" /> Notification created
              </div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed">
                {result.discord === "sent"
                  ? `Sent to ${result.destination.type} · ${result.destination.name}.`
                  : result.discord === "not_configured"
                    ? "Saved in-app. Discord webhook is not configured, so the daily scan will retry after configuration."
                    : "Saved in-app, but Discord rejected the request. The daily scan will retry it."}
              </p>
            </div>
            <Button className="mt-4 w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 px-5 py-5">
            <div className="rounded-xl border bg-muted/50 px-3.5 py-3">
              <div className="text-[9.5px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Discord destination
              </div>
              <div className="mt-1 flex items-center gap-2 text-[12px] font-medium">
                <DiscordDestinationIcon /> {destination}
              </div>
              <p className="mt-1 text-[10.5px] text-muted-foreground">
                Routing follows the current alert mechanism for {factoryName}.
              </p>
            </div>

            <label className="block">
              <Label className="mb-1.5 block text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                Alert title <span className="text-destructive">*</span>
              </Label>
              <Input
                autoFocus
                required
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Review outreach copy before sending"
              />
              <span className="mt-1 block text-right text-[9.5px] tabular-nums text-muted-foreground">
                {title.length}/120
              </span>
            </label>

            <label className="block">
              <Label className="mb-1.5 block text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                required
                maxLength={2000}
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Add the context, requested action and owner…"
              />
              <span className="mt-1 block text-right text-[9.5px] tabular-nums text-muted-foreground">
                {message.length}/2000
              </span>
            </label>

            <label className="block">
              <Label className="mb-1.5 block text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                Due date{" "}
                <span className="font-normal tracking-normal normal-case">· optional</span>
              </Label>
              <DateField value={dueOn} onChange={setDueOn} placeholder="No due date" />
            </label>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" disabled={sending} onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending || !title.trim() || !message.trim()}>
                <SendIcon /> {sending ? "Sending…" : "Create & send"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* Discord has no lucide glyph, so this one stays hand-drawn. */
function DiscordDestinationIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden><path d="M7 7.5A14 14 0 0 1 12 6a14 14 0 0 1 5 1.5c1.2 2 2 4.2 2.3 6.5a12 12 0 0 1-3.8 2l-1-1.4a8 8 0 0 1-5 0L8.5 16a12 12 0 0 1-3.8-2C5 11.7 5.8 9.5 7 7.5Z" strokeWidth="1.6" strokeLinejoin="round" /><circle cx="9.5" cy="11.5" r="1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="11.5" r="1" fill="currentColor" stroke="none" /></svg>;
}
