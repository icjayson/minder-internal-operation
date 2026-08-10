import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CompleteTaskBody = {
  logId?: string | null;
  notificationId?: string | null;
};

export async function POST(req: Request) {
  let body: CompleteTaskBody;
  try {
    body = (await req.json()) as CompleteTaskBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const logId = body.logId?.trim() || null;
  const notificationId = body.notificationId?.trim() || null;
  if (!logId && !notificationId)
    return NextResponse.json({ error: "logId or notificationId is required" }, { status: 400 });
  if ((logId && !UUID.test(logId)) || (notificationId && !UUID.test(notificationId)))
    return NextResponse.json({ error: "Invalid alert id" }, { status: 400 });

  const sb = supabase();
  let { data, error } = logId
    ? await sb.rpc("complete_alert_log_task", { p_log_id: logId })
    : await sb.rpc("complete_notification_alert_task", { p_notification_id: notificationId! });

  // During a migration-first rollout the old notifications table is still a
  // valid fallback for in-app-only rows. The trigger in migration 038 will
  // mirror this timestamp to linked logs once the new schema is present.
  const missingNotificationRpc =
    !logId && !!error &&
    (error.code === "PGRST202" || error.code === "42883" || /complete_notification_alert_task/.test(error.message));
  if (missingNotificationRpc) {
    const { data: notification, error: loadError } = await sb
      .from("notifications")
      .select("read_at")
      .eq("id", notificationId!)
      .maybeSingle();
    if (loadError)
      return NextResponse.json({ error: loadError.message }, { status: 500 });
    if (!notification)
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    if (typeof notification.read_at === "string") {
      data = notification.read_at;
      error = null;
    } else {
      const { data: updated, error: updateError } = await sb
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId!)
        .select("read_at")
        .single();
      data = updated?.read_at ?? null;
      error = updateError;
    }
  }

  if (error) {
    const missing = error.code === "P0002";
    return NextResponse.json(
      { error: missing ? "Alert not found" : error.message },
      { status: missing ? 404 : 500 },
    );
  }

  if (typeof data !== "string")
    return NextResponse.json({ error: "Task completion did not return a timestamp" }, { status: 500 });

  return NextResponse.json({ ok: true, taskDoneAt: data });
}
