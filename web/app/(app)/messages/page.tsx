"use client";

import { useEffect, useState } from "react";
import type { Message } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/factories-store";
import { PageHeader } from "@/app/components/page-header";

export default function MessagesPage() {
  const { contacts, openFactory } = useStore();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase().from("messages").select("*").order("created_at", { ascending: false }).limit(100);
      setMessages((data ?? []) as Message[]);
    })();
  }, []);

  const contactName = (id: string) => contacts?.find((c) => c.id === id)?.full_name ?? "Contact";
  const contactFactory = (id: string) => contacts?.find((c) => c.id === id)?.factory_id ?? null;

  async function markSent(m: Message) {
    setSendingId(m.id);
    setError(null);
    try {
      const res = await fetch("/api/messages/mark-sent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: m.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to mark sent");
      setMessages((prev) => (prev
        ? prev.map((x) => (x.id === m.id ? { ...x, status: "sent", sent_at: data.sent_at } : x))
        : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to mark sent");
    } finally {
      setSendingId(null);
    }
  }

  function editMessage(id: string, patch: Partial<Message>) {
    setMessages((prev) => (prev ? prev.map((m) => (m.id === id ? { ...m, ...patch } : m)) : prev));
  }

  async function saveDraft(id: string, patch: Partial<Message>) {
    const { error: saveError } = await supabase().from("messages").update(patch).eq("id", id);
    if (saveError) setError(saveError.message);
  }

  return (
    <>
      <PageHeader eyebrow="Messages" title="Outreach drafts"
        subtitle="AI-written messages. Copy into your inbox, then mark sent to log the touch."
        right={<><span>{messages ? `${messages.length}` : "—"}</span><span className="opacity-50">drafts</span></>} />
      <div className="px-8 py-5">
        {error && (
          <div className="mb-3 rounded-md border border-[color:var(--color-danger)]/30 tint-danger px-3 py-2 text-[12px] text-[color:var(--color-danger)]">
            {error}
          </div>
        )}
        {!messages ? (
          <div className="py-20 text-center text-muted-foreground text-sm tabular-nums uppercase tracking-wider">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 px-8 py-16 text-center text-sm text-foreground/80">
            No drafts yet. Open a factory, pick a contact and click <span className="text-primary">Draft</span>.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {messages.map((m) => (
              <div key={m.id} className="rounded-lg border border-border bg-card flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/60">
                  <button onClick={() => { const fid = contactFactory(m.contact_id); if (fid) openFactory(fid); }}
                    className="text-[13px] font-medium text-foreground hover:text-primary truncate cursor-pointer">
                    {contactName(m.contact_id)}
                  </button>
                  <span className={`text-[10px] tabular-nums uppercase tracking-wider ${m.status === "sent" ? "text-primary" : "text-muted-foreground"}`}>{m.status}</span>
                </div>
                <input
                  value={m.subject ?? ""}
                  onChange={(e) => editMessage(m.id, { subject: e.target.value })}
                  onBlur={(e) => saveDraft(m.id, { subject: e.target.value })}
                  disabled={m.status === "sent"}
                  placeholder="Subject"
                  className="mx-4 mt-2 h-8 bg-transparent border-b border-border/60 text-[12px] text-foreground/80 focus:border-primary focus:outline-none disabled:opacity-70"
                />
                <textarea
                  value={m.body ?? ""}
                  onChange={(e) => editMessage(m.id, { body: e.target.value })}
                  onBlur={(e) => saveDraft(m.id, { body: e.target.value })}
                  disabled={m.status === "sent"}
                  rows={7}
                  className="px-4 py-2 bg-transparent text-[13px] text-foreground/80 leading-relaxed resize-y flex-1 focus:outline-none disabled:opacity-70"
                />
                <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/60 bg-muted/40">
                  <button onClick={() => navigator.clipboard.writeText(m.body ?? "")}
                    className="h-7 px-3 rounded-full bg-primary hover:bg-[#3a51ff] text-white text-[11.5px] font-medium cursor-pointer">Copy</button>
                  {m.status !== "sent" && (
                    <button onClick={() => markSent(m)} disabled={sendingId === m.id}
                      className="h-7 px-3 rounded-full border border-border-strong bg-card hover:bg-accent disabled:opacity-60 text-[11.5px] font-medium text-foreground/80 cursor-pointer">
                      {sendingId === m.id ? "Saving…" : "Mark sent"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
