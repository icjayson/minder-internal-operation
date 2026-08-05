import { supabase } from "./supabase.ts";

export type DiscordOwnerType = "factory" | "network" | "investor" | "competition";

export type DiscordThreadOwner = {
  ownerType: DiscordOwnerType;
  ownerId: string;
  webhookKey: string;
};

export type DiscordThreadStore = {
  claim: (owner: DiscordThreadOwner) => Promise<{ claimed: boolean; threadId: string | null }>;
  complete: (owner: DiscordThreadOwner & { threadId: string; threadName: string }) => Promise<void>;
  release: (owner: DiscordThreadOwner) => Promise<void>;
};

export function supabaseDiscordThreadStore(): DiscordThreadStore {
  const sb = supabase();
  return {
    async claim(owner) {
      const { data, error } = await sb.rpc("claim_discord_entity_thread", {
        p_owner_type: owner.ownerType,
        p_owner_id: owner.ownerId,
        p_webhook_key: owner.webhookKey,
      });
      if (error) throw new Error(error.message);
      const row = (data?.[0] ?? null) as { claimed?: boolean; thread_id?: string | null } | null;
      return { claimed: row?.claimed === true, threadId: row?.thread_id ?? null };
    },
    async complete(owner) {
      const { error } = await sb.rpc("complete_discord_entity_thread", {
        p_owner_type: owner.ownerType,
        p_owner_id: owner.ownerId,
        p_webhook_key: owner.webhookKey,
        p_thread_id: owner.threadId,
        p_thread_name: owner.threadName,
      });
      if (error) throw new Error(error.message);
    },
    async release(owner) {
      const { error } = await sb.rpc("release_discord_entity_thread", {
        p_owner_type: owner.ownerType,
        p_owner_id: owner.ownerId,
        p_webhook_key: owner.webhookKey,
      });
      if (error) throw new Error(error.message);
    },
  };
}
