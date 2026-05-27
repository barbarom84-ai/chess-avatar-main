import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const serviceClientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/** Server-only Supabase client with service role (bypasses RLS). Use only in API routes. */
export function createServiceSupabase(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, serviceClientOptions);
}

/** Server-only anon client (respects RLS). Optional Bearer for user context. */
export function createAnonSupabase(bearer?: string): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    ...serviceClientOptions,
    global: bearer
      ? { headers: { Authorization: `Bearer ${bearer}` } }
      : undefined,
  });
}

/** Requires service role; throws if env is missing (for routes that must not silently no-op). */
export function requireServiceSupabase(): SupabaseClient {
  const client = createServiceSupabase();
  if (!client) {
    throw new Error("Supabase service role is not configured");
  }
  return client;
}
