import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Delete a single Discord alert message via the webhook. Webhook messages are
// deletable with just the webhook token (no server-admin rights), so this runs
// server-side with DISCORD_WEBHOOK_URL — the client never sees the secret.
export async function POST(req: Request) {
  let body: { id?: string };
  try {
    body = (await req.json()) as { id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const id = body.id;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ error: "DISCORD_WEBHOOK_URL is not configured" }, { status: 503 });

  const sb = supabase();
  const { data: row, error } = await sb
    .from("discord_alert_log")
    .select("id,message_id,thread_id,deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  if (row.deleted_at) return NextResponse.json({ ok: true, alreadyDeleted: true });
  const messageId = row.message_id as string | null;
  if (!messageId) return NextResponse.json({ error: "No Discord message id stored for this alert" }, { status: 400 });

  const base = webhook.split("?")[0].replace(/\/$/, "");
  const endpoint = new URL(`${base}/messages/${messageId}`);
  const threadId = row.thread_id as string | null;
  if (threadId) endpoint.searchParams.set("thread_id", threadId);

  const res = await fetch(endpoint.toString(), { method: "DELETE" });
  // 204 = deleted, 404 = already gone on Discord's side — both are success.
  if (!res.ok && res.status !== 404) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Discord delete failed (${res.status})`, detail: detail.slice(0, 200) },
      { status: 502 },
    );
  }

  const { error: updateError } = await sb
    .from("discord_alert_log")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) {
    return NextResponse.json(
      { error: "Discord message was deleted, but the log status could not be saved", detail: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
