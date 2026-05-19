/**
 * In-memory TTL cache for Lichess / Chess.com profile proxy responses.
 */

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 200;

type CachedEntry = { payload: unknown; expiresAt: number };

const store = new Map<string, CachedEntry>();

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function profileCacheKey(
  platform: "lichess" | "chesscom",
  username: string
): string {
  return `${platform}:${normalizeUsername(username)}`;
}

export function getCachedProfileResponse(key: string): unknown | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    store.delete(key);
    return null;
  }
  return e.payload;
}

export function setCachedProfileResponse(key: string, payload: unknown): void {
  if (store.size >= MAX_ENTRIES) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
  store.set(key, { payload, expiresAt: Date.now() + TTL_MS });
}
