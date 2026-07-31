import { NextResponse } from "next/server";
import type { SequenceStep } from "@/lib/types";
import { addDaysISO } from "@/lib/cadence";
import { supabase } from "@/lib/supabase";
import { buildEntitySummary } from "@/lib/summary-server";
import { enrichDiscordAlert, pushDiscordEmbeds } from "@/lib/discord";
import { isWorkTriggerNotificationKind, isoDateInTimeZone, workTriggerReminderFor } from "@/lib/work-alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron hits this daily. Production auth: Bearer CRON_SECRET.
// Alerts v2: fires when an entity in an active-conversation stage has gone
// >3 days without an update, auto-resolves when it moves on, attaches an AI
// recap, and pushes one Discord embed per entity.
const STALE_DAYS = 3;
const ALERT_STAGES = new Set(["Replied", "Meeting Booked", "Demo"]);
const TERMINAL = new Set(["Closed Won", "Closed Lost", "Nurture"]);
const MAX_SUMMARIES = 25; // cap OpenAI calls per run

type Row = Record<string, unknown>;
const nkey = (n: { kind: string; factory_id?: unknown; contact_id?: unknown; network_id?: unknown; work_item_id?: unknown }) =>
  `${n.kind}:${n.factory_id ?? ""}:${n.contact_id ?? ""}:${n.network_id ?? ""}:${n.work_item_id ?? ""}`;

export async function GET(req: Request) { return scan(req); }
export async function POST(req: Request) { return scan(req); }

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
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = supabase();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const staleCut = new Date(now - STALE_DAYS * 86400000).toISOString();
  const today = isoDateInTimeZone(new Date(now), process.env.ALERT_TIME_ZONE ?? "Asia/Ho_Chi_Minh");

  const [factories, contacts, networks, stepRows, workItems] = await Promise.all([
    sb.from("factories").select("id,name,stage,network_id,last_activity_at,next_action,next_action_due"),
    sb.from("contacts").select("id,factory_id,network_id,full_name,stage,sequence_id,sequence_step,sequence_state,last_contacted,last_activity_at,next_follow_up"),
    sb.from("networks").select("id,name,stage,last_activity_at,next_action,next_action_due"),
    sb.from("sequence_steps").select("*").order("step_index"),
    sb.from("factory_work_items").select("id,factory_id,title,status,trigger_on"),
  ]);
  const fRows = (factories.data ?? []) as Row[];
  const cRows = (contacts.data ?? []) as Row[];
  const nRows = (networks.data ?? []) as Row[];
  const allSteps = (stepRows.data ?? []) as SequenceStep[];
  const wRows = (workItems.data ?? []) as Row[];
  const fMap = new Map(fRows.map((f) => [f.id as string, f]));
  const cMap = new Map(cRows.map((c) => [c.id as string, c]));
  const nMap = new Map(nRows.map((n) => [n.id as string, n]));
  const wMap = new Map(wRows.map((w) => [w.id as string, w]));
  const factoriesWithOpenWorkTrigger = new Set(
    wRows
      .filter((w) => w.status !== "done" && w.factory_id && w.trigger_on)
      .map((w) => String(w.factory_id)),
  );

  // ── Auto-resolve: clear stale alerts whose entity has moved on ──────────────
  const [{ data: existing }, { data: workAlertHistory }] = await Promise.all([
    sb
      .from("notifications")
      .select("id,kind,factory_id,contact_id,network_id,work_item_id,created_at")
      .is("read_at", null),
    sb
      .from("notifications")
      .select("kind,factory_id,contact_id,network_id,work_item_id")
      .like("kind", "work_trigger_%")
      .not("work_item_id", "is", null),
  ]);
  const resolveIds: string[] = [];
  for (const n of existing ?? []) {
    // Work-item trigger alerts clear once the card is moved to done, its
    // trigger is cleared/pushed to the future, or the card is deleted.
    if (isWorkTriggerNotificationKind(n.kind)) {
      const item = wMap.get(n.work_item_id as string);
      if (!item) { resolveIds.push(n.id as string); continue; } // card deleted
      if (item.status === "done" || !item.trigger_on || (item.trigger_on as string) > today)
        resolveIds.push(n.id as string);
      continue;
    }
    if (!String(n.kind).startsWith("stale_")) continue;
    const entity =
      n.kind === "stale_factory" ? fMap.get(n.factory_id as string)
      : n.kind === "stale_contact" ? cMap.get(n.contact_id as string)
      : n.kind === "stale_network" ? nMap.get(n.network_id as string)
      : null;
    if (!entity) { resolveIds.push(n.id as string); continue; } // entity deleted
    const movedOn = typeof entity.last_activity_at === "string" && entity.last_activity_at > (n.created_at as string);
    const leftStages = !ALERT_STAGES.has(entity.stage as string);
    if (movedOn || leftStages) resolveIds.push(n.id as string);
  }
  if (resolveIds.length)
    await sb.from("notifications").update({ read_at: nowIso }).in("id", resolveIds);

  // De-dupe against still-unread alerts.
  const stillUnread = (existing ?? []).filter((n) => !resolveIds.includes(n.id as string));
  const seen = new Set(stillUnread.map((n) => nkey(n as never)));
  // Work-item milestones must fire at most once even when the user manually
  // marks an earlier reminder as read while the card remains overdue.
  const historicalWorkMilestones = new Set((workAlertHistory ?? []).map((n) => nkey(n as never)));
  const toInsert: Row[] = [];
  const add = (n: Row) => {
    const k = nkey(n as never);
    if (seen.has(k) || (isWorkTriggerNotificationKind(n.kind) && historicalWorkMilestones.has(k))) return;
    seen.add(k);
    if (isWorkTriggerNotificationKind(n.kind)) historicalWorkMilestones.add(k);
    toInsert.push(n);
  };

  // ── Detect new alerts ───────────────────────────────────────────────────────
  for (const f of fRows) {
    if (ALERT_STAGES.has(f.stage as string) && (f.last_activity_at as string) < staleCut)
      add({ kind: "stale_factory", factory_id: f.id, title: `No update in ${STALE_DAYS}+ days`, detail: f.name });
    // next_action_due mirrors the nearest open Work Inventory trigger. While
    // the factory has a triggered work card, that card's milestone below is
    // the single source of alerts; do not also emit a generic factory reminder.
    const dueBackedByWork = factoriesWithOpenWorkTrigger.has(String(f.id));
    if (!TERMINAL.has(f.stage as string) && f.next_action_due && (f.next_action_due as string) <= today && !dueBackedByWork)
      add({ kind: "followup_due", factory_id: f.id, title: "Next action due", detail: `${f.name} — ${f.next_action ?? ""}`, due_on: f.next_action_due });
  }

  // Kanban work items whose trigger date has arrived but that aren't done yet.
  // Also auto-advance a triggered "not started" card into "doing".
  const promoteIds: string[] = [];
  for (const w of wRows) {
    const reminder = workTriggerReminderFor({
      triggerOn: (w.trigger_on as string | null) ?? null,
      today,
      status: String(w.status ?? "not_started"),
    });
    if (!reminder) continue;
    if (w.status === "not_started") {
      w.status = "doing"; // keep in-memory state consistent for this run
      promoteIds.push(w.id as string);
    }
    const factoryName = (fMap.get(w.factory_id as string)?.name as string) ?? "Factory";
    add({
      kind: reminder.kind,
      factory_id: w.factory_id,
      work_item_id: w.id,
      title: reminder.title,
      detail: `${factoryName} — ${w.title}`,
      due_on: w.trigger_on,
    });
  }
  if (promoteIds.length)
    await sb.from("factory_work_items").update({ status: "doing" }).in("id", promoteIds);

  for (const n of nRows) {
    if (ALERT_STAGES.has(n.stage as string) && (n.last_activity_at as string) < staleCut)
      add({ kind: "stale_network", network_id: n.id, title: `No update in ${STALE_DAYS}+ days`, detail: n.name });
    if (!TERMINAL.has(n.stage as string) && n.next_action_due && (n.next_action_due as string) <= today)
      add({ kind: "followup_due", network_id: n.id, title: "Next action due", detail: `${n.name} — ${n.next_action ?? ""}`, due_on: n.next_action_due });
  }

  for (const c of cRows) {
    if (ALERT_STAGES.has(c.stage as string) && (c.last_activity_at as string) < staleCut)
      add({ kind: "stale_contact", contact_id: c.id, factory_id: c.factory_id ?? null, network_id: c.network_id ?? null, title: `No update in ${STALE_DAYS}+ days`, detail: c.full_name });

    if (c.sequence_state === "active" && c.sequence_id) {
      const steps = allSteps.filter((s) => s.sequence_id === c.sequence_id);
      const nextStep = steps.find((s) => s.step_index > ((c.sequence_step as number) ?? 0));
      const currentStep = steps.find((s) => s.step_index === ((c.sequence_step as number) ?? 0));
      const derivedDue =
        (c.next_follow_up as string | null) ??
        (c.last_contacted && currentStep && nextStep
          ? addDaysISO(new Date(c.last_contacted as string), Math.max(1, nextStep.day_offset - currentStep.day_offset))
          : null);
      if (nextStep && derivedDue && derivedDue <= today)
        add({ kind: "sequence_step_due", contact_id: c.id, factory_id: c.factory_id ?? null, network_id: c.network_id ?? null, title: `Sequence Day ${nextStep.day_offset} due`, detail: c.full_name, due_on: derivedDue });
    } else if (c.next_follow_up && (c.next_follow_up as string) <= today) {
      add({ kind: "followup_due", contact_id: c.id, factory_id: c.factory_id ?? null, network_id: c.network_id ?? null, title: "Follow-up due", detail: c.full_name, due_on: c.next_follow_up });
    }
  }

  // ── Attach an AI recap to each new stale alert (capped) ─────────────────────
  let summaries = 0;
  for (const n of toInsert) {
    if (!String(n.kind).startsWith("stale_") || summaries >= MAX_SUMMARIES) continue;
    const target =
      n.kind === "stale_factory" ? (["factory", n.factory_id] as const)
      : n.kind === "stale_contact" ? (["contact", n.contact_id] as const)
      : (["network", n.network_id] as const);
    try {
      const summary = await buildEntitySummary(sb, target[0], target[1] as string);
      if (summary) { n.summary = summary; summaries++; }
    } catch { /* alert still fires without a recap */ }
  }

  if (toInsert.length) await sb.from("notifications").insert(toInsert);

  // ── Push unpushed alerts: Discord embeds (per entity) + email digest ────────
  const { data: unpushed } = await sb.from("notifications").select("*").is("pushed_at", null);
  let pushed = 0;
  if (unpushed && unpushed.length) {
    // Every Factory and Network owns one durable Discord thread. Contact alerts
    // inherit their parent entity's thread.
    const enriched = (unpushed as Row[]).map((n) =>
      enrichDiscordAlert(n, fMap, nMap),
    );
    const results = await Promise.all([
      pushDiscordEmbeds(enriched),
      pushEmailDigest(unpushed as Row[]),
    ]);
    if (results.some((r) => r === true)) {
      await sb.from("notifications").update({ pushed_at: nowIso }).is("pushed_at", null);
      pushed = unpushed.length;
    }
  }

  return NextResponse.json({ ok: true, created: toInsert.length, resolved: resolveIds.length, pushed });
}

async function pushEmailDigest(notifications: Row[]): Promise<boolean | null> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL_TO;
  const from = process.env.ALERT_EMAIL_FROM ?? "alerts@resend.dev";
  if (!key || !to) return null;
  const lines = notifications.map(
    (n) => `<p><b>${n.detail ?? ""}</b> — ${n.title ?? ""}${n.summary ? `<br><span style="color:#555">${n.summary}</span>` : ""}</p>`,
  );
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: `Minder tracker: ${notifications.length} alert(s)`, html: lines.join("") }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
