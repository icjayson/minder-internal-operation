import { NextResponse } from "next/server";
import type { SequenceStep } from "@/lib/types";
import { addDaysISO } from "@/lib/cadence";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel Cron hits this daily. Production auth: Bearer CRON_SECRET.
// Creates in-app notifications for stale/overdue items, then pushes a digest
// via Resend (email) and a Discord webhook if configured.
const STALE_DAYS = 7;
const TERMINAL = ["Closed Won", "Closed Lost", "Nurture"];

export async function GET(req: Request) {
  return scan(req);
}

export async function POST(req: Request) {
  return scan(req);
}

async function scan(req: Request) {
  const fromCron = req.headers.get("x-vercel-cron") === "1";
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const production = process.env.NODE_ENV === "production";
  if (production && !secret)
    return NextResponse.json({ error: "CRON_SECRET is required in production" }, { status: 503 });
  const authorized = production
    ? auth === `Bearer ${secret}`
    : fromCron || !secret || auth === `Bearer ${secret}`;
  if (!authorized)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = supabase();
  const now = Date.now();
  const staleCut = new Date(now - STALE_DAYS * 86400000).toISOString();
  const today = new Date(now).toISOString().slice(0, 10);

  // Existing unread notifications → de-dupe key set.
  const { data: existing } = await sb
    .from("notifications")
    .select("kind,factory_id,contact_id")
    .is("read_at", null);
  const seen = new Set((existing ?? []).map((n) => `${n.kind}:${n.factory_id ?? ""}:${n.contact_id ?? ""}`));

  const toInsert: Record<string, unknown>[] = [];
  const add = (n: Record<string, unknown>) => {
    const key = `${n.kind}:${n.factory_id ?? ""}:${n.contact_id ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    toInsert.push(n);
  };

  const [factories, contacts, stepRows] = await Promise.all([
    sb.from("factories").select("id,name,stage,last_activity_at,next_action,next_action_due").not("stage", "in", `(${TERMINAL.map((s) => `"${s}"`).join(",")})`),
    sb.from("contacts").select("id,factory_id,full_name,stage,sequence_id,sequence_step,sequence_state,last_contacted,last_activity_at,next_follow_up"),
    sb.from("sequence_steps").select("*").order("step_index"),
  ]);
  const allSteps = (stepRows.data ?? []) as SequenceStep[];

  for (const f of factories.data ?? []) {
    if (f.last_activity_at && f.last_activity_at < staleCut)
      add({ kind: "stale_factory", factory_id: f.id, title: `No update in ${STALE_DAYS}+ days`, detail: f.name });
    if (f.next_action_due && f.next_action_due <= today)
      add({ kind: "followup_due", factory_id: f.id, title: "Next action due", detail: `${f.name} — ${f.next_action ?? ""}`, due_on: f.next_action_due });
  }
  for (const c of contacts.data ?? []) {
    const stale = c.last_activity_at && c.last_activity_at < staleCut;
    if (stale && c.sequence_state === "active" && !TERMINAL.includes(c.stage))
      add({ kind: "stale_contact", contact_id: c.id, factory_id: c.factory_id, title: `No update in ${STALE_DAYS}+ days`, detail: c.full_name });
    if (c.sequence_state === "active" && c.sequence_id) {
      const sequenceSteps = allSteps.filter((s) => s.sequence_id === c.sequence_id);
      const nextStep = sequenceSteps.find((s) => s.step_index > (c.sequence_step ?? 0));
      const currentStep = sequenceSteps.find((s) => s.step_index === (c.sequence_step ?? 0));
      const derivedDue = c.next_follow_up
        ?? (c.last_contacted && currentStep && nextStep
          ? addDaysISO(
              new Date(c.last_contacted),
              Math.max(1, nextStep.day_offset - currentStep.day_offset),
            )
          : null);
      if (nextStep && derivedDue && derivedDue <= today) {
        add({
          kind: "sequence_step_due",
          contact_id: c.id,
          factory_id: c.factory_id,
          title: `Sequence Day ${nextStep.day_offset} due`,
          detail: c.full_name,
          due_on: derivedDue,
        });
      }
    } else if (c.next_follow_up && c.next_follow_up <= today) {
      add({ kind: "followup_due", contact_id: c.id, factory_id: c.factory_id, title: "Follow-up due", detail: c.full_name, due_on: c.next_follow_up });
    }
  }

  if (toInsert.length) await sb.from("notifications").insert(toInsert);

  // Push unpushed notifications as a single digest.
  const { data: unpushed } = await sb.from("notifications").select("*").is("pushed_at", null);
  let pushed = 0;
  if (unpushed && unpushed.length) {
    const lines = unpushed.map((n) => `• ${n.title}${n.detail ? ` — ${n.detail}` : ""}`);
    const text = `Minder tracker — ${unpushed.length} alert(s):\n${lines.join("\n")}`;
    const results = await Promise.all([
      pushDiscord(text),
      pushEmail(`Minder tracker: ${unpushed.length} alert(s)`, lines.join("<br>")),
    ]);
    if (results.some((result) => result === true)) {
      const nowIso = new Date(now).toISOString();
      await sb.from("notifications").update({ pushed_at: nowIso }).is("pushed_at", null);
      pushed = unpushed.length;
    }
  }

  return NextResponse.json({ ok: true, created: toInsert.length, pushed });
}

async function pushDiscord(content: string): Promise<boolean | null> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 1900) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function pushEmail(subject: string, html: string): Promise<boolean | null> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL_TO;
  const from = process.env.ALERT_EMAIL_FROM ?? "alerts@resend.dev";
  if (!key || !to) return null;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
