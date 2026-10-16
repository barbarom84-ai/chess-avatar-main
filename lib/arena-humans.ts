import type { EngineConfig } from "@/lib/analysis";
import type { ProfileOption } from "@/lib/arena-types";
import { normalizeEnginePlatform } from "@/lib/normalize-engine-platform";

/**
 * Local human players of the Arena: they play on this device (hot-seat), in
 * the Spectator and Playoff tabs next to the avatars, or among themselves.
 */

export const ARENA_HUMANS_STORAGE = "chess-arena.humans.v1";
export const HUMAN_KEY_PREFIX = "human:";
export const ARENA_HUMAN_DEFAULT_ELO = 1200;
export const ARENA_HUMAN_NAME_MAX = 24;
export const ARENA_HUMANS_MAX = 32;

export type ArenaHumanProfile = {
  id: string;
  name: string;
  elo: number;
  createdAt: number;
};

export type ArenaPlayerPlatform = "lichess" | "chesscom" | "human";

export function isHumanOption(option: ProfileOption | null | undefined): boolean {
  return Boolean(option?.human);
}

export function arenaPlatformOf(option: ProfileOption): ArenaPlayerPlatform {
  return option.human ? "human" : normalizeEnginePlatform(option.config);
}

function difficultyFromElo(elo: number): EngineConfig["difficulty"] {
  if (elo < 1000) return 1;
  if (elo < 1500) return 2;
  if (elo < 1900) return 3;
  if (elo < 2300) return 4;
  return 5;
}

export function clampHumanElo(elo: unknown): number {
  const n = typeof elo === "number" && Number.isFinite(elo) ? Math.round(elo) : ARENA_HUMAN_DEFAULT_ELO;
  return Math.min(3000, Math.max(100, n));
}

const XML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

/** Initial-letter portrait, so humans read as people (not bots) on cards, bars and brackets. */
export function humanAvatarDataUri(name: string): string {
  const initial = (Array.from(name.trim())[0] ?? "?").toUpperCase().replace(/[&<>"']/g, (c) => XML_ESCAPES[c]);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#047857"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs>` +
    `<rect width="128" height="128" fill="url(#g)"/>` +
    `<text x="64" y="64" dy=".35em" text-anchor="middle" font-family="system-ui,sans-serif" ` +
    `font-size="64" font-weight="700" fill="#d1fae5">${initial}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** The engine fields are placeholders: a human's moves never come from the engine. */
export function humanOption(profile: ArenaHumanProfile): ProfileOption {
  return {
    key: `${HUMAN_KEY_PREFIX}${profile.id}`,
    label: profile.name,
    human: true,
    savedAt: profile.createdAt,
    config: {
      name: profile.name,
      avatarUrl: humanAvatarDataUri(profile.name),
      elo: profile.elo,
      difficulty: difficultyFromElo(profile.elo),
      aggressiveness: 50,
      threads: 2,
      depth: 10,
      timeControl: 0,
      favoriteOpening: "",
      playStyle: "équilibré",
      openings: {},
    },
  };
}

/**
 * Candidates for an automatic tournament seeding: humans already placed keep
 * their seat, the remaining seats go to the strongest (or random) entrants.
 * Unplaced humans only fill seats when `fillWithHumans` (humans-only tournaments).
 */
export function seedCandidates(
  roster: ProfileOption[],
  placedKeys: ReadonlySet<string>,
  size: number,
  order: "elo" | "random",
  fillWithHumans: boolean,
  rng: () => number = Math.random
): ProfileOption[] {
  const kept = roster.filter((o) => o.human && placedKeys.has(o.key)).slice(0, size);
  const keptKeys = new Set(kept.map((o) => o.key));
  let rest = roster.filter((o) => !keptKeys.has(o.key) && (fillWithHumans || !o.human));
  if (order === "elo") {
    rest = [...rest].sort((a, b) => (b.config.elo ?? 0) - (a.config.elo ?? 0));
  } else {
    rest = [...rest];
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1)) % (i + 1);
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
  }
  return [...kept, ...rest.slice(0, size - kept.length)];
}

export type HumanNameError = "empty" | "tooLong" | "duplicate";

export function validateHumanName(
  name: string,
  existing: ArenaHumanProfile[],
  exceptId?: string
): HumanNameError | null {
  const trimmed = name.trim();
  if (!trimmed) return "empty";
  if (trimmed.length > ARENA_HUMAN_NAME_MAX) return "tooLong";
  const lower = trimmed.toLowerCase();
  if (existing.some((h) => h.id !== exceptId && h.name.toLowerCase() === lower)) return "duplicate";
  return null;
}

export function parseArenaHumans(raw: string | null): ArenaHumanProfile[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: ArenaHumanProfile[] = [];
    for (const h of data as Partial<ArenaHumanProfile>[]) {
      if (!h || typeof h.id !== "string" || !h.id || typeof h.name !== "string") continue;
      const name = h.name.trim().slice(0, ARENA_HUMAN_NAME_MAX);
      if (!name || out.some((o) => o.id === h.id)) continue;
      out.push({
        id: h.id,
        name,
        elo: clampHumanElo(h.elo),
        createdAt: typeof h.createdAt === "number" ? h.createdAt : 0,
      });
    }
    return out.slice(0, ARENA_HUMANS_MAX);
  } catch {
    return [];
  }
}

/* ── Browser store (localStorage + in-memory subscribers) ── */

const EMPTY: ArenaHumanProfile[] = [];
let cache: ArenaHumanProfile[] | null = null;
const listeners = new Set<() => void>();

export function getArenaHumans(): ArenaHumanProfile[] {
  if (cache) return cache;
  try {
    cache = parseArenaHumans(localStorage.getItem(ARENA_HUMANS_STORAGE));
  } catch {
    cache = EMPTY;
  }
  return cache;
}

export function getServerArenaHumans(): ArenaHumanProfile[] {
  return EMPTY;
}

function commit(next: ArenaHumanProfile[]) {
  cache = next;
  try {
    localStorage.setItem(ARENA_HUMANS_STORAGE, JSON.stringify(next));
  } catch {
    /* quota or private mode: keep the in-memory list */
  }
  listeners.forEach((l) => l());
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
}

export function addArenaHuman(name: string, elo?: number): ArenaHumanProfile | HumanNameError {
  const list = getArenaHumans();
  const error = validateHumanName(name, list);
  if (error) return error;
  const profile: ArenaHumanProfile = {
    id: newId(),
    name: name.trim(),
    elo: clampHumanElo(elo),
    createdAt: Date.now(),
  };
  commit([...list, profile].slice(0, ARENA_HUMANS_MAX));
  return profile;
}

export function removeArenaHuman(id: string) {
  const list = getArenaHumans();
  if (list.some((h) => h.id === id)) commit(list.filter((h) => h.id !== id));
}

export function updateArenaHuman(
  id: string,
  patch: { name?: string; elo?: number }
): ArenaHumanProfile | HumanNameError | null {
  const list = getArenaHumans();
  const idx = list.findIndex((h) => h.id === id);
  if (idx < 0) return null;
  const current = list[idx];
  const nextName = patch.name != null ? patch.name.trim() : current.name;
  if (patch.name != null) {
    const error = validateHumanName(nextName, list, id);
    if (error) return error;
  }
  const next: ArenaHumanProfile = {
    ...current,
    name: nextName,
    elo: patch.elo != null ? clampHumanElo(patch.elo) : current.elo,
  };
  const copy = [...list];
  copy[idx] = next;
  commit(copy);
  return next;
}

/** JSON export of the local roster (seed Elo, not Arena rating). */
export function exportArenaHumansJson(humans: ArenaHumanProfile[] = getArenaHumans()): string {
  return JSON.stringify(
    humans.map((h) => ({ name: h.name, elo: h.elo })),
    null,
    2
  );
}

/**
 * Imports players by name. Existing names (case-insensitive) are skipped.
 * Returns how many were added.
 */
export function importArenaHumansJson(raw: string): { added: number; skipped: number; error?: string } {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { added: 0, skipped: 0, error: "invalid" };
  }
  if (!Array.isArray(data)) return { added: 0, skipped: 0, error: "invalid" };
  let added = 0;
  let skipped = 0;
  for (const row of data as Partial<ArenaHumanProfile>[]) {
    if (!row || typeof row.name !== "string") {
      skipped++;
      continue;
    }
    const res = addArenaHuman(row.name, typeof row.elo === "number" ? row.elo : undefined);
    if (typeof res === "string") skipped++;
    else added++;
  }
  return { added, skipped };
}

export function replaceArenaHumans(humans: ArenaHumanProfile[]) {
  commit(parseArenaHumans(JSON.stringify(humans)));
}

export function subscribeArenaHumans(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
