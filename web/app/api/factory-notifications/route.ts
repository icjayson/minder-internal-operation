import { NextResponse } from "next/server";
import { enrichDiscordAlert, pushDiscordEmbeds, type DiscordDelivery } from "@/lib/discord";
import { logDiscordDeliveries } from "@/lib/discord-alert-log";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateFactoryNotificationBody = {
  factoryId?: string;
  title?: string;
  message?: string;
  dueOn?: string | null;
};

export async function POST(req: Request) {
  let body: CreateFactoryNotificationBody;
  try {
    body = (await req.json()) as CreateFactoryNotificationBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const factoryId = body.factoryId?.trim();
  const title = body.title?.trim();
  const message = body.message?.trim();
  const dueOn = body.dueOn?.trim() || null;
  if (!factoryId || !title || !message)
    return NextResponse.json({ error: "Factory, alert title and message are required" }, { status: 400 });
  if (title.length > 120)
    return NextResponse.json({ error: "Alert title must be 120 characters or fewer" }, { status: 400 });
  if (message.length > 2000)
    return NextResponse.json({ error: "Message must be 2,000 characters or fewer" }, { status: 400 });
  if (dueOn && !/^\d{4}-\d{2}-\d{2}$/.test(dueOn))
    return NextResponse.json({ error: "Due date must use YYYY-MM-DD" }, { status: 400 });

  const sb = supabase();
  const { data: factory, error: factoryError } = await sb
    .from("factories")
    .select("id,name,stage,network_id")
    .eq("id", factoryId)
    .single();
  if (factoryError || !factory)
    return NextResponse.json({ error: "Factory not found" }, { status: 404 });

  const networkId = typeof factory.network_id === "string" ? factory.network_id : null;
  const { data: network } = networkId
    ? await sb.from("networks").select("id,name").eq("id", networkId).maybeSingle()
    : { data: null };

  const { data: notification, error: insertError } = await sb
    .from("notifications")
    .insert({
      kind: "manual_factory",
      factory_id: factory.id,
      title,
      detail: factory.name,
      summary: message,
      due_on: dueOn,
    })
    .select("*")
    .single();
  if (insertError || !notification)
    return NextResponse.json({ error: insertError?.message ?? "Could not create notification" }, { status: 500 });

  const factoryMap = new Map<string, Record<string, unknown>>([[factory.id, factory]]);
  const networkMap = new Map<string, Record<string, unknown>>(
    network ? [[network.id, network]] : [],
  );
  const enriched = enrichDiscordAlert(notification, factoryMap, networkMap);
  const delivered: DiscordDelivery[] = [];
  const pushed = await pushDiscordEmbeds([enriched], { onDelivered: (d) => delivered.push(d) });
  const pushedAt = pushed === true ? new Date().toISOString() : null;
  if (pushedAt) {
    await sb.from("notifications").update({ pushed_at: pushedAt }).eq("id", notification.id);
    await logDiscordDeliveries(sb, delivered, "manual");
  }

  return NextResponse.json({
    ok: true,
    notificationId: notification.id,
    discord: pushed === true ? "sent" : pushed === null ? "not_configured" : "failed",
    destination: {
      type: enriched._ownerType ?? "factory",
      id: enriched._ownerId ?? factory.id,
      name: enriched._ownerName ?? factory.name,
    },
  }, { status: 201 });
}
