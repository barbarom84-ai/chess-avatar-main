/**
 * Cache mémoire TTL pour réponses proxy explorer (réduit les appels à explorer.lichess.ovh).
 */

import { createHash } from "node:crypto";

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 800;

type CachedEntry = { payload: unknown; expiresAt: number };

const store = new Map<string, CachedEntry>();

function fenPositionKey(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  return parts.slice(0, 4).join(" ");
}

export function explorerCacheKey(fen: string, variant: string, pool: string): string {
  const normalized = fenPositionKey(fen);
  const raw = `${normalized}|${variant}|${pool}`;
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function getCachedExplorer(key: string): unknown | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    store.delete(key);
    return null;
  }
  return e.payload;
}

export function setCachedExplorer(key: string, payload: unknown): void {
  if (store.size >= MAX_ENTRIES) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
  store.set(key, { payload, expiresAt: Date.now() + TTL_MS });
}
