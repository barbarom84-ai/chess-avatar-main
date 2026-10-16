/**
 * Local Arena leaderboard: Elo ratings and head-to-head records built from the
 * bot-vs-bot games watched in this browser (Spectator and Playoff).
 */

export const ARENA_RATING_STORAGE = "chess-arena.ratings.v1";
export const ARENA_RATING_DEFAULT = 1500;
/** Higher K while an avatar has few Arena games, so its rating settles quickly. */
export const ARENA_RATING_K_NEW = 40;
export const ARENA_RATING_K = 20;
export const ARENA_RATING_PROVISIONAL_GAMES = 10;

export type ArenaRatingEntrant = {
  key: string;
  name: string;
  /** Seeds the first Arena rating (e.g. the avatar's estimated Elo). */
  seedElo?: number | null;
};

export type ArenaRatingPlayer = {
  key: string;
  name: string;
  rating: number;
  games: number;
  wins: number;
  draws: number;
  losses: number;
};

/** Record from the point of view of the alphabetically first key of the pair. */
export type ArenaHeadToHeadRecord = { first: number; second: number; draws: number };

export type ArenaRatingsState = {
  players: Record<string, ArenaRatingPlayer>;
  h2h: Record<string, ArenaHeadToHeadRecord>;
};

export const EMPTY_ARENA_RATINGS: ArenaRatingsState = { players: {}, h2h: {} };

export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

function kFactor(games: number): number {
  return games < ARENA_RATING_PROVISIONAL_GAMES ? ARENA_RATING_K_NEW : ARENA_RATING_K;
}

function pairKey(a: string, b: string): { key: string; aFirst: boolean } {
  const aFirst = a < b;
  return { key: aFirst ? `${a}||${b}` : `${b}||${a}`, aFirst };
}

function playerOf(state: ArenaRatingsState, e: ArenaRatingEntrant): ArenaRatingPlayer {
  const existing = state.players[e.key];
  if (existing) return { ...existing, name: e.name || existing.name };
  const seed = Number.isFinite(e.seedElo) && (e.seedElo as number) > 0 ? (e.seedElo as number) : ARENA_RATING_DEFAULT;
  return { key: e.key, name: e.name, rating: Math.round(seed), games: 0, wins: 0, draws: 0, losses: 0 };
}

export function applyArenaGame(
  state: ArenaRatingsState,
  white: ArenaRatingEntrant,
  black: ArenaRatingEntrant,
  winner: "white" | "black" | "draw"
): ArenaRatingsState {
  if (!white.key || !black.key || white.key === black.key) return state;
  const w = playerOf(state, white);
  const b = playerOf(state, black);
  const scoreW = winner === "white" ? 1 : winner === "black" ? 0 : 0.5;
  const expW = expectedScore(w.rating, b.rating);
  const nextW: ArenaRatingPlayer = {
    ...w,
    rating: Math.round(w.rating + kFactor(w.games) * (scoreW - expW)),
    games: w.games + 1,
    wins: w.wins + (scoreW === 1 ? 1 : 0),
    draws: w.draws + (scoreW === 0.5 ? 1 : 0),
    losses: w.losses + (scoreW === 0 ? 1 : 0),
  };
  const nextB: ArenaRatingPlayer = {
    ...b,
    rating: Math.round(b.rating + kFactor(b.games) * (1 - scoreW - (1 - expW))),
    games: b.games + 1,
    wins: b.wins + (scoreW === 0 ? 1 : 0),
    draws: b.draws + (scoreW === 0.5 ? 1 : 0),
    losses: b.losses + (scoreW === 1 ? 1 : 0),
  };

  const { key, aFirst } = pairKey(w.key, b.key);
  const prev = state.h2h[key] ?? { first: 0, second: 0, draws: 0 };
  const firstWon = scoreW === 1 ? aFirst : scoreW === 0 ? !aFirst : null;
  const h2h: ArenaHeadToHeadRecord = {
    first: prev.first + (firstWon === true ? 1 : 0),
    second: prev.second + (firstWon === false ? 1 : 0),
    draws: prev.draws + (firstWon === null ? 1 : 0),
  };

  return {
    players: { ...state.players, [w.key]: nextW, [b.key]: nextB },
    h2h: { ...state.h2h, [key]: h2h },
  };
}

export function headToHead(
  state: ArenaRatingsState,
  aKey: string,
  bKey: string
): { aWins: number; bWins: number; draws: number } {
  const { key, aFirst } = pairKey(aKey, bKey);
  const r = state.h2h[key];
  if (!r) return { aWins: 0, bWins: 0, draws: 0 };
  return aFirst
    ? { aWins: r.first, bWins: r.second, draws: r.draws }
    : { aWins: r.second, bWins: r.first, draws: r.draws };
}

export function arenaLeaderboard(state: ArenaRatingsState): ArenaRatingPlayer[] {
  return Object.values(state.players).sort(
    (a, b) => b.rating - a.rating || b.games - a.games || a.name.localeCompare(b.name)
  );
}

function isCount(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

export function parseArenaRatings(raw: string | null): ArenaRatingsState {
  if (!raw) return EMPTY_ARENA_RATINGS;
  try {
    const data = JSON.parse(raw) as Partial<ArenaRatingsState> | null;
    if (!data || typeof data !== "object") return EMPTY_ARENA_RATINGS;
    const players: Record<string, ArenaRatingPlayer> = {};
    for (const [key, p] of Object.entries(data.players ?? {})) {
      if (!p || typeof p.name !== "string" || !Number.isFinite(p.rating)) continue;
      if (![p.games, p.wins, p.draws, p.losses].every(isCount)) continue;
      players[key] = { ...p, key };
    }
    const h2h: Record<string, ArenaHeadToHeadRecord> = {};
    for (const [key, r] of Object.entries(data.h2h ?? {})) {
      if (r && isCount(r.first) && isCount(r.second) && isCount(r.draws)) h2h[key] = r;
    }
    return { players, h2h };
  } catch {
    return EMPTY_ARENA_RATINGS;
  }
}

/* ── Browser store (localStorage + in-memory subscribers) ── */

let cache: ArenaRatingsState | null = null;
const listeners = new Set<() => void>();

export function getArenaRatings(): ArenaRatingsState {
  if (cache) return cache;
  try {
    cache = parseArenaRatings(localStorage.getItem(ARENA_RATING_STORAGE));
  } catch {
    cache = EMPTY_ARENA_RATINGS;
  }
  return cache;
}

function commit(next: ArenaRatingsState) {
  cache = next;
  try {
    localStorage.setItem(ARENA_RATING_STORAGE, JSON.stringify(next));
  } catch {
    /* quota or private mode: keep the in-memory ratings */
  }
  listeners.forEach((l) => l());
}

export function recordArenaRatedGame(
  white: ArenaRatingEntrant,
  black: ArenaRatingEntrant,
  winner: "white" | "black" | "draw"
) {
  const current = getArenaRatings();
  const next = applyArenaGame(current, white, black, winner);
  if (next !== current) commit(next);
}

export function resetArenaRatings() {
  commit(EMPTY_ARENA_RATINGS);
}

export function subscribeArenaRatings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
