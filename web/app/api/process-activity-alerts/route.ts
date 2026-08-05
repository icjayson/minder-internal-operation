import { NextResponse } from "next/server";
import { activityDiscordNotification } from "@/lib/activity-alerts";
import { enrichDiscordAlert, pushDiscordEmbeds } from "@/lib/discord";
import { supabase } from "@/lib/supabase";
import type { Activity, Contact, Factory, Network } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type QueueRow = {
  id: string;
  activity_id: string;
  attempts: number;
};

type ActivityWithNetwork = Activity & {
  network_id: string | null;
  investor_id: string | null;
  competition_id: string | null;
};

export async function GET(req: Request) { return processQueue(req); }
export async function POST(req: Request) { return processQueue(req); }

async function processQueue(req: Request) {
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
  const { data: claimed, error: claimError } = await sb.rpc("claim_due_activity_alerts", { batch_size: 50 });
  if (claimError) {
    return NextResponse.json({
      error: claimError.message,
      hint: "Run supabase/027_activity_discord_outbox.sql before enabling this worker.",
    }, { status: 503 });
  }

  const jobs = (claimed ?? []) as QueueRow[];
  if (!jobs.length) return NextResponse.json({ ok: true, claimed: 0, sent: 0, cancelled: 0, retrying: 0 });

  const activityIds = jobs.map((job) => job.activity_id);
  const { data: activityRows, error: activitiesError } = await sb
    .from("activities")
    .select("id,factory_id,network_id,contact_id,investor_id,competition_id,type,body,evidence_level,taxonomy_tags,created_at")
    .in("id", activityIds);
  if (activitiesError) {
    await releaseJobs(sb, jobs, activitiesError.message);
    return NextResponse.json({ error: activitiesError.message }, { status: 500 });
  }

  const activities = (activityRows ?? []) as ActivityWithNetwork[];
  const activityMap = new Map(activities.map((activity) => [activity.id, activity]));
  const contactIds = [...new Set(activities.map((activity) => activity.contact_id).filter(Boolean))] as string[];
  const { data: contactRows } = contactIds.length
    ? await sb.from("contacts").select("*").in("id", contactIds)
    : { data: [] };
  const contacts = (contactRows ?? []) as Contact[];
  const contactMap = new Map(contacts.map((contact) => [contact.id, contact]));

  const factoryIds = [...new Set([
    ...activities.map((activity) => activity.factory_id),
    ...contacts.map((contact) => contact.factory_id),
  ].filter(Boolean))] as string[];
  const { data: factoryRows } = factoryIds.length
    ? await sb.from("factories").select("id,name,stage,network_id").in("id", factoryIds)
    : { data: [] };
  const factories = (factoryRows ?? []) as Pick<Factory, "id" | "name" | "stage" | "network_id">[];
  const factoryMap = new Map<string, Record<string, unknown>>(factories.map((factory) => [factory.id, factory]));

  const networkIds = [...new Set([
    ...activities.map((activity) => activity.network_id),
    ...contacts.map((contact) => contact.network_id),
    ...factories.map((factory) => factory.network_id),
  ].filter(Boolean))] as string[];
  const { data: networkRows } = networkIds.length
    ? await sb.from("networks").select("id,name").in("id", networkIds)
    : { data: [] };
  const networks = (networkRows ?? []) as Pick<Network, "id" | "name">[];
  const networkMap = new Map<string, Record<string, unknown>>(networks.map((network) => [network.id, network]));

  const investorIds = [...new Set(activities.map((a) => a.investor_id).filter(Boolean))] as string[];
  const { data: investorRows } = investorIds.length
    ? await sb.from("investors").select("id,name").in("id", investorIds)
    : { data: [] };
  const investors = (investorRows ?? []) as { id: string; name: string }[];
  const investorMap = new Map<string, Record<string, unknown>>(investors.map((i) => [i.id, i]));

  const competitionIds = [...new Set(activities.map((a) => a.competition_id).filter(Boolean))] as string[];
  const { data: competitionRows } = competitionIds.length
    ? await sb.from("competitions").select("id,name").in("id", competitionIds)
    : { data: [] };
  const competitions = (competitionRows ?? []) as { id: string; name: string }[];
  const competitionMap = new Map<string, Record<string, unknown>>(competitions.map((c) => [c.id, c]));

  let sent = 0;
  let cancelled = 0;
  let retrying = 0;
  for (const job of jobs) {
    const activity = activityMap.get(job.activity_id);
    if (!activity) {
      await sb.from("activity_alert_outbox").delete().eq("id", job.id);
      cancelled++;
      continue;
    }

    // Final existence check immediately before Discord: deleting/withdrawing
    // the activity during the grace period cancels the queue via FK cascade.
    const { data: stillExists } = await sb.from("activities").select("id").eq("id", activity.id).maybeSingle();
    if (!stillExists) {
      await sb.from("activity_alert_outbox").delete().eq("id", job.id);
      cancelled++;
      continue;
    }

    const contact = activity.contact_id ? contactMap.get(activity.contact_id) : undefined;
    const factoryId = activity.factory_id ?? contact?.factory_id ?? null;
    const networkId = factoryId ? null : activity.network_id ?? contact?.network_id ?? null;
    const factory = factoryId ? factoryMap.get(factoryId) as Pick<Factory, "id" | "name" | "stage" | "network_id"> | undefined : undefined;
    const network = networkId ? networkMap.get(networkId) as Pick<Network, "id" | "name"> | undefined : undefined;
    const investor = activity.investor_id ? investorMap.get(activity.investor_id) as { id: string; name: string } | undefined : undefined;
    const competition = activity.competition_id ? competitionMap.get(activity.competition_id) as { id: string; name: string } | undefined : undefined;
    const rawNotification = activityDiscordNotification({ activity, contact, factory, network, investor, competition });
    if (!rawNotification) {
      await retryJob(sb, job.id, "Activity has no routable parent", 15);
      retrying++;
      continue;
    }

    const enriched = enrichDiscordAlert(rawNotification, factoryMap, networkMap, new Map(), new Map(), investorMap, competitionMap);
    const pushed = await pushDiscordEmbeds([enriched]);
    if (pushed === true) {
      await sb.from("activity_alert_outbox").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        locked_at: null,
        last_error: null,
      }).eq("id", job.id);
      sent++;
    } else {
      await retryJob(sb, job.id, pushed === null ? "Discord webhook is not configured" : "Discord request failed", pushed === null ? 15 : 5);
      retrying++;
    }
  }

  return NextResponse.json({ ok: true, claimed: jobs.length, sent, cancelled, retrying });
}

async function retryJob(sb: ReturnType<typeof supabase>, id: string, error: string, delayMinutes: number) {
  await sb.from("activity_alert_outbox").update({
    status: "pending",
    send_after: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
    locked_at: null,
    last_error: error.slice(0, 500),
  }).eq("id", id);
}

async function releaseJobs(sb: ReturnType<typeof supabase>, jobs: QueueRow[], error: string) {
  if (!jobs.length) return;
  await sb.from("activity_alert_outbox").update({
    status: "pending",
    send_after: new Date(Date.now() + 5 * 60_000).toISOString(),
    locked_at: null,
    last_error: error.slice(0, 500),
  }).in("id", jobs.map((job) => job.id));
}
