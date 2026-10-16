import type { ProfileOption } from "@/lib/arena-types";

export type PlayoffBracketSize = 4 | 8 | 16;

export const PLAYOFF_BRACKET_SIZES: readonly PlayoffBracketSize[] = [4, 8, 16];

export function isPlayoffBracketSize(value: unknown): value is PlayoffBracketSize {
  return PLAYOFF_BRACKET_SIZES.includes(value as PlayoffBracketSize);
}

export type PlayoffMatchStatus = "waiting" | "ready" | "done";

export type PlayoffMatch = {
  id: string;
  round: number;
  index: number;
  seedA?: number;
  seedB?: number;
  feedAMatchId?: string;
  feedBMatchId?: string;
  winnerKey: string | null;
  status: PlayoffMatchStatus;
  lastOutcome?: string;
};

export type PlayoffBracketState = {
  size: PlayoffBracketSize;
  seeds: (string | null)[];
  matches: PlayoffMatch[];
  championKey: string | null;
};

export function createEmptySeeds(size: PlayoffBracketSize): (string | null)[] {
  return Array.from({ length: size }, () => null);
}

export function buildBracketMatches(size: PlayoffBracketSize): PlayoffMatch[] {
  const rounds = finalRoundIndex(size) + 1;
  const matches: PlayoffMatch[] = [];
  let matchCount = size / 2;
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < matchCount; i++) {
      const id = `r${r}-m${i}`;
      const m: PlayoffMatch = {
        id,
        round: r,
        index: i,
        winnerKey: null,
        status: "waiting",
      };
      if (r === 0) {
        m.seedA = i * 2;
        m.seedB = i * 2 + 1;
      } else {
        const prev = matches.filter((x) => x.round === r - 1);
        m.feedAMatchId = prev[i * 2]?.id;
        m.feedBMatchId = prev[i * 2 + 1]?.id;
      }
      matches.push(m);
    }
    matchCount /= 2;
  }
  return matches;
}

export function createPlayoffBracket(
  size: PlayoffBracketSize
): PlayoffBracketState {
  return {
    size,
    seeds: createEmptySeeds(size),
    matches: buildBracketMatches(size),
    championKey: null,
  };
}

export function resolveMatchSideKeys(
  match: PlayoffMatch,
  state: PlayoffBracketState
): { keyA: string | null; keyB: string | null } {
  const keyFromFeed = (feedId?: string): string | null => {
    if (!feedId) return null;
    const src = state.matches.find((m) => m.id === feedId);
    return src?.winnerKey ?? null;
  };

  if (match.round === 0) {
    const a =
      match.seedA != null ? state.seeds[match.seedA] ?? null : null;
    const b =
      match.seedB != null ? state.seeds[match.seedB] ?? null : null;
    return { keyA: a, keyB: b };
  }

  return {
    keyA: keyFromFeed(match.feedAMatchId),
    keyB: keyFromFeed(match.feedBMatchId),
  };
}

export function refreshBracketStatuses(
  state: PlayoffBracketState
): PlayoffBracketState {
  const matches = state.matches.map((m) => {
    const { keyA, keyB } = resolveMatchSideKeys(m, state);
    if (m.status === "done") return m;
    if (keyA && keyB) {
      return { ...m, status: "ready" as const };
    }
    return { ...m, status: "waiting" as const };
  });

  const final = matches.find(
    (m) => m.round === finalRoundIndex(state.size) && m.index === 0
  );
  const championKey = final?.status === "done" ? final.winnerKey : null;

  return { ...state, matches, championKey };
}

export function setSeed(
  state: PlayoffBracketState,
  slotIndex: number,
  optionKey: string | null
): PlayoffBracketState {
  const seeds = [...state.seeds];
  if (slotIndex < 0 || slotIndex >= seeds.length) return state;
  if (seeds[slotIndex] === optionKey) return state;
  // A player can only hold one slot.
  if (optionKey) {
    const dup = seeds.indexOf(optionKey);
    if (dup !== -1) seeds[dup] = null;
  }
  seeds[slotIndex] = optionKey;
  // Changing a seed invalidates every played result.
  return refreshBracketStatuses({
    ...state,
    seeds,
    matches: buildBracketMatches(state.size),
    championKey: null,
  });
}

export function recordMatchResult(
  state: PlayoffBracketState,
  matchId: string,
  winnerKey: string | null,
  outcomeNote?: string
): PlayoffBracketState {
  const matches = state.matches.map((m) =>
    m.id === matchId
      ? {
          ...m,
          winnerKey,
          status: "done" as const,
          lastOutcome: outcomeNote,
        }
      : m
  );
  return refreshBracketStatuses({ ...state, matches });
}

export function getNextReadyMatch(
  state: PlayoffBracketState
): PlayoffMatch | null {
  return (
    state.matches.find((m) => m.status === "ready") ?? null
  );
}

export function getOptionByKey(
  pool: ProfileOption[],
  key: string | null
): ProfileOption | undefined {
  if (!key) return undefined;
  return pool.find((o) => o.key === key);
}

export function finalRoundIndex(size: PlayoffBracketSize): number {
  return Math.log2(size) - 1;
}

export function roundLabel(
  round: number,
  size: PlayoffBracketSize,
  labels: { final: string; semi: string; quarter: string; round16?: string }
): string {
  const finalRound = finalRoundIndex(size);
  if (round === finalRound) return labels.final;
  if (round === finalRound - 1) return labels.semi;
  if (round === finalRound - 2) return labels.quarter;
  return labels.round16 ?? labels.quarter;
}

/* ---------- Seeding ---------- */

/** Standard bracket order: slot i receives seed SEED_POSITIONS[size][i]. */
const SEED_POSITIONS: Record<PlayoffBracketSize, number[]> = {
  4: [1, 4, 2, 3],
  8: [1, 8, 4, 5, 2, 7, 3, 6],
  16: [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11],
};

/** Keys in slot order, best Elo as seed 1 (1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6). */
export function seedKeysByElo(
  pool: ProfileOption[],
  size: PlayoffBracketSize
): string[] | null {
  if (pool.length < size) return null;
  const ranked = [...pool]
    .sort((a, b) => (b.config.elo ?? 0) - (a.config.elo ?? 0))
    .slice(0, size);
  return SEED_POSITIONS[size].map((seed) => ranked[seed - 1].key);
}

export function seedKeysRandom(
  pool: ProfileOption[],
  size: PlayoffBracketSize,
  rng: () => number = Math.random
): string[] | null {
  if (pool.length < size) return null;
  const keys = pool.map((o) => o.key);
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)) % (i + 1);
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return keys.slice(0, size);
}

export function bracketFromSeedKeys(
  size: PlayoffBracketSize,
  keys: string[]
): PlayoffBracketState {
  let next = createPlayoffBracket(size);
  keys.slice(0, size).forEach((k, i) => {
    next = setSeed(next, i, k);
  });
  return next;
}

/* ---------- Tiebreak series ---------- */

/** Game 1, rematch with swapped colors, then Armageddon. */
export const PLAYOFF_SERIES_MAX_GAMES = 3;

export type PlayoffGameWinner = "white" | "black" | "draw";

export type PlayoffSeriesGame = {
  index: number;
  whiteKey: string;
  blackKey: string;
  /** A draw sends Black through. */
  armageddon: boolean;
};

/**
 * `keyA` is the upper slot of the match (the higher seed when seeded by Elo).
 * Colors alternate; in Armageddon the higher seed gets Black and draw odds.
 */
export function playoffSeriesGame(
  index: number,
  keyA: string,
  keyB: string
): PlayoffSeriesGame {
  const armageddon = index >= PLAYOFF_SERIES_MAX_GAMES - 1;
  const swapped = armageddon || index % 2 === 1;
  return {
    index,
    whiteKey: swapped ? keyB : keyA,
    blackKey: swapped ? keyA : keyB,
    armageddon,
  };
}

/** Winner key of one series game, or `null` when the series goes on. */
export function resolvePlayoffSeriesGame(
  game: PlayoffSeriesGame,
  winner: PlayoffGameWinner
): string | null {
  if (winner === "white") return game.whiteKey;
  if (winner === "black") return game.blackKey;
  return game.armageddon ? game.blackKey : null;
}

export type PlayoffSeriesResult = {
  winnerKey: string;
  note: string;
  games: number;
  decidedByArmageddonDraw: boolean;
};

/**
 * Plays a full knockout series. `playGame` returns `null` when the game was
 * interrupted, which aborts the series (returns `null`).
 */
export async function runPlayoffSeries(
  keyA: string,
  keyB: string,
  playGame: (
    game: PlayoffSeriesGame
  ) => Promise<{ winner: PlayoffGameWinner; note: string } | null>
): Promise<PlayoffSeriesResult | null> {
  for (let index = 0; index < PLAYOFF_SERIES_MAX_GAMES; index++) {
    const game = playoffSeriesGame(index, keyA, keyB);
    const played = await playGame(game);
    if (!played) return null;
    const winnerKey = resolvePlayoffSeriesGame(game, played.winner);
    if (winnerKey) {
      return {
        winnerKey,
        note: played.note,
        games: index + 1,
        decidedByArmageddonDraw: game.armageddon && played.winner === "draw",
      };
    }
  }
  // Unreachable: the Armageddon game always produces a winner.
  return null;
}

/* ---------- Persistence ---------- */

export const PLAYOFF_BRACKET_STORAGE = "chess-arena.playoff.bracket";

export function serializeBracket(state: PlayoffBracketState): string {
  return JSON.stringify({
    size: state.size,
    seeds: state.seeds,
    results: state.matches
      .filter((m) => m.status === "done")
      .map((m) => ({ id: m.id, winnerKey: m.winnerKey, lastOutcome: m.lastOutcome })),
  });
}

/** Restores a stored bracket; `null` if invalid or if a player left the pool. */
export function parseStoredBracket(
  raw: string | null,
  validKeys: Set<string>
): PlayoffBracketState | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as {
      size?: unknown;
      seeds?: unknown;
      results?: unknown;
    } | null;
    if (!data || !isPlayoffBracketSize(data.size)) return null;
    const size = data.size;
    if (!Array.isArray(data.seeds) || data.seeds.length !== size) return null;
    const seeds = data.seeds.map((s) => (typeof s === "string" ? s : null));
    if (seeds.some((s) => s != null && !validKeys.has(s))) return null;

    let state = bracketFromSeedKeys(size, []);
    seeds.forEach((k, i) => {
      if (k) state = setSeed(state, i, k);
    });
    const results = Array.isArray(data.results) ? data.results : [];
    for (const r of results as { id?: unknown; winnerKey?: unknown; lastOutcome?: unknown }[]) {
      if (!r || typeof r.id !== "string" || typeof r.winnerKey !== "string") continue;
      const match = state.matches.find((m) => m.id === r.id);
      if (!match || match.status !== "ready") continue;
      const { keyA, keyB } = resolveMatchSideKeys(match, state);
      if (r.winnerKey !== keyA && r.winnerKey !== keyB) continue;
      state = recordMatchResult(
        state,
        r.id,
        r.winnerKey,
        typeof r.lastOutcome === "string" ? r.lastOutcome : undefined
      );
    }
    return state;
  } catch {
    return null;
  }
}
