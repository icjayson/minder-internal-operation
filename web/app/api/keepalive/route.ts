import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Vercel Cron pings this twice a week. Any real Supabase query — even a count
// — resets the inactivity timer that would otherwise auto-pause the free-tier
// project (~7 days of no traffic). We do both a count and a tiny select so
// PostgREST logs it as a real request.

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // never cache

export async function GET(req: Request) {
  // Reject if not a Vercel-issued cron request and no shared secret matches.
  // Vercel attaches `Authorization: Bearer ${CRON_SECRET}` automatically when
  // CRON_SECRET is configured; we let it through with or without (idempotent),
  // but log anything unusual.
  const auth = req.headers.get("authorization") ?? "";
  const fromVercelCron = req.headers.get("x-vercel-cron") === "1";
  const secret = process.env.CRON_SECRET;
  const authorized =
    fromVercelCron ||
    (secret ? auth === `Bearer ${secret}` : true);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const sb = supabase();

    // 1. Lightweight count — works even when leads table is empty.
    const { count, error: countErr } = await sb
      .from("leads")
      .select("id", { head: true, count: "exact" });
    if (countErr) throw countErr;

    // 2. Fetch a single id for good measure (so PostgREST writes a real query
    //    log entry, not just a HEAD).
    await sb.from("leads").select("id").limit(1);

    return NextResponse.json({
      ok: true,
      leads: count ?? 0,
      ms: Date.now() - startedAt,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: msg, ms: Date.now() - startedAt },
      { status: 500 },
    );
  }
}
