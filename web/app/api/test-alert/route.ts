import { NextResponse } from "next/server";
import { enrichDiscordAlert, pushDiscordEmbeds } from "@/lib/discord";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dev-only helper: pushes SAMPLE alerts that exercise the source-network routing
// rule without backdating data or running the scan.
//   GET  /api/test-alert                                   → uses env config
//   POST /api/test-alert { webhookUrl?, forum?, threadPrefix? } → override for a one-off test
// threadPrefix/threadName are legacy forum-mode hints and are not rendered.
type Opts = { webhookUrl?: string; forum?: boolean; threadPrefix?: string; threadName?: string };
export async function GET() {
  return run({});
}
export async function POST(req: Request) {
  let body: Opts = {};
  try { body = (await req.json()) as Opts; } catch { /* empty body → use env */ }
  return run(body);
}

async function run(opts: Opts) {
  if (process.env.NODE_ENV === "production")
    return NextResponse.json({ error: "Disabled in production" }, { status: 403 });

  // Back-compat: a passed threadName implies forum mode, but is not rendered.
  const forum = opts.forum ?? (opts.threadName != null ? true : undefined);
  const threadPrefix = opts.threadPrefix ?? opts.threadName;

  const today = new Date().toISOString().slice(0, 10);
  const acme = "00000000-0000-0000-0000-0000000000aa";
  const bergen = "00000000-0000-0000-0000-0000000000cc";
  const nordic = "00000000-0000-0000-0000-0000000000bb";
  const factories = new Map([
    [acme, { id: acme, name: "Acme Foods Ltd (sample)", stage: "Contacted", network_id: nordic }],
    [bergen, { id: bergen, name: "Bergen Foods AS (sample)", stage: "Replied", network_id: nordic }],
  ]);
  const networks = new Map([
    [nordic, { id: nordic, name: "Nordic Textiles Cluster (sample)" }],
  ]);

  // Every factory owns exactly one thread regardless of stage. Direct network
  // alerts continue to use the network's own thread.
  const rawSamples = [
    {
      kind: "followup_due",
      title: "Next action due",
      detail: "Acme Foods Ltd (sample)",
      due_on: today,
      summary:
        "Sample alert. This Contacted factory still owns its own durable factory thread.",
      factory_id: acme,
    },
    {
      kind: "sequence_step_due",
      title: "Sequence Day 4 due",
      detail: "Jonas Berg — Ops Director (sample)",
      summary: "Contact at Acme; this alert follows its parent factory thread.",
      factory_id: acme,
    },
    {
      kind: "stale_factory",
      title: "No update in 3+ days",
      detail: "Bergen Foods AS (sample)",
      summary:
        "Sample alert. This sourced factory has reached Replied, so it now owns a separate factory thread.",
      factory_id: bergen,
    },
    {
      kind: "followup_due",
      title: "Next action due",
      detail: "Nordic Textiles Cluster (sample)",
      due_on: today,
      network_id: nordic,
    },
  ];
  const samples = rawSamples.map((sample) =>
    enrichDiscordAlert(sample, factories, networks),
  );

  const pushed = await pushDiscordEmbeds(samples, { webhookUrl: opts.webhookUrl, forum, threadPrefix, threadStore: null });
  const forumOn = forum ?? (process.env.DISCORD_FORUM === "true" || !!process.env.DISCORD_THREAD_NAME);
  const threadCount = new Set(samples.map((s) => s._ownerId)).size;
  return NextResponse.json({
    ok: pushed === true,
    pushed, // true = sent · false = webhook errored · null = no webhook configured
    mode: forumOn ? "forum (one thread per routing owner)" : "text (one message per routing owner)",
    threads: forumOn ? threadCount : undefined,
    sent: samples.length,
  });
}
