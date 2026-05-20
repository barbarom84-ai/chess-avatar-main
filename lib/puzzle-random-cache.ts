/**
 * Short TTL cache for Lichess random puzzle proxy (batch + detail).
 */

const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 80;

type CachedEntry = { payload: unknown; expiresAt: number };

const store = new Map<string, CachedEntry>();

export function puzzleRandomCacheKey(difficulty: string | null): string {
  return `random:${difficulty ?? "mix"}`;
}

export function getCachedRandomPuzzle(key: string): unknown | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    store.delete(key);
    return null;
  }
  return e.payload;
}

export function setCachedRandomPuzzle(key: string, payload: unknown): void {
  if (store.size >= MAX_ENTRIES) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
  store.set(key, { payload, expiresAt: Date.now() + TTL_MS });
}
