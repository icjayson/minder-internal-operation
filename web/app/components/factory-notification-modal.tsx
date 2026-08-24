"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !sending) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, sending]);

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
    <div className="fixed inset-0 z-[90] grid place-items-center px-4 py-8" role="presentation">
      <button type="button" aria-label="Close create notification modal" onClick={onClose} disabled={sending} className="absolute inset-0 bg-canvas/75 backdrop-blur-sm" />
      <section role="dialog" aria-modal="true" aria-labelledby="factory-notification-title" className="relative z-10 w-full max-w-[520px] overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-drawer">
        <header className="flex items-start gap-3 border-b border-line-soft px-5 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-glow"><MegaphoneIcon /></span>
          <div className="min-w-0 flex-1">
            <h2 id="factory-notification-title" className="text-[16px] font-semibold text-ink">Create notification</h2>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">Creates an in-app alert and sends the same message to Discord.</p>
          </div>
          <button type="button" onClick={onClose} disabled={sending} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-ink"><CloseModalIcon /></button>
        </header>

        {result ? (
          <div className="px-5 py-6">
            <div className={`rounded-xl border px-4 py-4 ${result.discord === "sent" ? "border-[#8bd9bd] bg-[#eaf8f3] text-[#087454]" : "border-[#efd08a] bg-[#fff7df] text-[#8b620d]"}`}>
              <div className="flex items-center gap-2 text-[13px] font-semibold"><CheckCircleIcon /> Notification created</div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed">
                {result.discord === "sent"
                  ? `Sent to ${result.destination.type} · ${result.destination.name}.`
                  : result.discord === "not_configured"
                    ? "Saved in-app. Discord webhook is not configured, so the daily scan will retry after configuration."
                    : "Saved in-app, but Discord rejected the request. The daily scan will retry it."}
              </p>
            </div>
            <button type="button" onClick={onClose} className="mt-4 h-9 w-full rounded-full bg-primary text-[12px] font-semibold text-white hover:bg-[#3a51ff]">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 px-5 py-5">
            <div className="rounded-xl border border-line-soft bg-surface-2/60 px-3.5 py-3">
              <div className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Discord destination</div>
              <div className="mt-1 flex items-center gap-2 text-[12px] font-medium text-ink"><DiscordDestinationIcon /> {destination}</div>
              <p className="mt-1 text-[10.5px] text-muted-foreground">Routing follows the current alert mechanism for {factoryName}.</p>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Alert title <span className="text-[color:var(--color-danger)]">*</span></span>
              <input autoFocus required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Review outreach copy before sending" className="h-10 w-full rounded-lg border border-line bg-canvas px-3 text-[13px] text-ink outline-none focus:border-line-strong" />
              <span className="mt-1 block text-right text-[9.5px] tabular-nums text-muted-foreground">{title.length}/120</span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Message <span className="text-[color:var(--color-danger)]">*</span></span>
              <textarea required maxLength={2000} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add the context, requested action and owner…" className="w-full resize-y rounded-lg border border-line bg-canvas px-3 py-2.5 text-[12.5px] leading-relaxed text-ink outline-none focus:border-line-strong" />
              <span className="mt-1 block text-right text-[9.5px] tabular-nums text-muted-foreground">{message.length}/2000</span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Due date <span className="font-normal normal-case tracking-normal">· optional</span></span>
              <input type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} className="h-10 w-full rounded-lg border border-line bg-canvas px-3 text-[12px] text-ink outline-none focus:border-line-strong" />
            </label>

            {error && <div role="alert" className="rounded-lg border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/8 px-3 py-2 text-[11.5px] text-[color:var(--color-danger)]">{error}</div>}

            <div className="flex justify-end gap-2 border-t border-line-soft pt-4">
              <button type="button" onClick={onClose} disabled={sending} className="h-9 rounded-full border border-line-strong bg-surface-2 px-4 text-[11.5px] font-medium text-ink-soft hover:text-ink disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={sending || !title.trim() || !message.trim()} className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-[11.5px] font-semibold text-white hover:bg-[#3a51ff] disabled:cursor-not-allowed disabled:opacity-50">
                <SendIcon /> {sending ? "Sending…" : "Create & send"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function MegaphoneIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden><path d="M4 11v3a2 2 0 0 0 2 2h2l2 4h3l-2-4 7-3V7l-10 4H6a2 2 0 0 0-2 2Z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M18 9c1 .6 1.5 1.4 1.5 2.5S19 13.4 18 14" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function CloseModalIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden><path d="m6 6 12 12M18 6 6 18" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function SendIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden><path d="m3 11 18-8-8 18-2-8-8-2Z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="m11 13 4-4" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function DiscordDestinationIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden><path d="M7 7.5A14 14 0 0 1 12 6a14 14 0 0 1 5 1.5c1.2 2 2 4.2 2.3 6.5a12 12 0 0 1-3.8 2l-1-1.4a8 8 0 0 1-5 0L8.5 16a12 12 0 0 1-3.8-2C5 11.7 5.8 9.5 7 7.5Z" strokeWidth="1.6" strokeLinejoin="round" /><circle cx="9.5" cy="11.5" r="1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="11.5" r="1" fill="currentColor" stroke="none" /></svg>;
}

function CheckCircleIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden><circle cx="12" cy="12" r="9" strokeWidth="1.8" /><path d="m8 12 2.5 2.5L16 9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
