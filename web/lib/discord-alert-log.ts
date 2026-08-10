import { discordAlertLogRow, type DiscordDelivery } from "./discord";
import type { supabase } from "./supabase";

// Persist delivered Discord messages to discord_alert_log so the platform can
// show a log and delete individual messages. Best-effort: a failure here (e.g.
// the migration not yet applied) must never break the alert-sending path.
export async function logDiscordDeliveries(
  sb: ReturnType<typeof supabase>,
  deliveries: DiscordDelivery[],
  source: string,
): Promise<void> {
  if (!deliveries.length) return;
  const rows = deliveries.map((delivery) => discordAlertLogRow(delivery, source));
  try {
    await sb.from("discord_alert_log").insert(rows);
  } catch {
    /* best-effort */
  }
}
