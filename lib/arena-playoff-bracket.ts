import type { ProfileOption } from "@/lib/arena-types";

export type PlayoffBracketSize = 4 | 8;

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
  const rounds = size === 8 ? 3 : 2;
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
    (m) => m.round === (state.size === 8 ? 2 : 1) && m.index === 0
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
  seeds[slotIndex] = optionKey;
  return refreshBracketStatuses({ ...state, seeds });
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

export function roundLabel(
  match: PlayoffMatch,
  size: PlayoffBracketSize,
  lang: "fr" | "en"
): string {
  const finalRound = size === 8 ? 2 : 1;
  if (match.round === finalRound) {
    return lang === "fr" ? "Finale" : "Final";
  }
  if (match.round === finalRound - 1) {
    return lang === "fr" ? "Demi-finales" : "Semifinals";
  }
  return lang === "fr" ? "Quarts" : "Quarterfinals";
}
