import { RealtimeClient } from "@supabase/supabase-js";

export type PresenceEntry = {
  user_id: string;
  page: string;
  last_seen: string;
};

/**
 * Dedicated Realtime socket for observers (admin dashboards).
 *
 * The app-wide client already joins `presence:app`; supabase-js returns that same
 * joined channel for an identical topic, and adding `presence` / `postgres_changes`
 * listeners to a joined channel throws. A separate socket owns its own channels.
 */
export function createObserverRealtime(accessToken: string | null): RealtimeClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const endpoint = new URL("realtime/v1", url.endsWith("/") ? url : `${url}/`);
  endpoint.protocol = endpoint.protocol.replace("http", "ws");
  const client = new RealtimeClient(endpoint.toString(), { params: { apikey: anonKey } });
  void client.setAuth(accessToken ?? anonKey);
  return client;
}

export async function closeObserverRealtime(client: RealtimeClient): Promise<void> {
  try {
    await client.removeAllChannels();
  } finally {
    client.disconnect();
  }
}

function isPresenceEntry(value: unknown): value is PresenceEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.user_id === "string" &&
    v.user_id.length > 0 &&
    typeof v.last_seen === "string" &&
    typeof v.page === "string"
  );
}

/** Latest entry per user, most recently seen first; malformed entries are ignored. */
export function latestPresenceByUser(state: Record<string, unknown[] | undefined>): PresenceEntry[] {
  const byUser = new Map<string, PresenceEntry>();
  for (const entries of Object.values(state)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!isPresenceEntry(entry)) continue;
      const prev = byUser.get(entry.user_id);
      if (!prev || entry.last_seen > prev.last_seen) byUser.set(entry.user_id, entry);
    }
  }
  return [...byUser.values()].sort((a, b) => b.last_seen.localeCompare(a.last_seen));
}
