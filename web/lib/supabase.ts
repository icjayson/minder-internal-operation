import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in env",
  );
}

// Singleton client shared across the app (safe in single-user mode).
let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!_client) _client = createClient(url, anon);
  return _client;
}
