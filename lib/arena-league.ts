/**
 * Round-robin and Swiss tournaments for the Arena Playoff tab: one game per
 * pairing, 1 / ½ / 0 points, standings with a tiebreak.
 */

export type ArenaLeagueFormat = "roundrobin" | "swiss";
export type ArenaLeagueResult = "1-0" | "0-1" | "1/2-1/2";

export type ArenaLeagueGame = {
  id: string;
  round: number;
  whiteKey: string;
  /** `null` = bye: White scores a point without playing. */
  blackKey: string | null;
  result: ArenaLeagueResult | null;
  note?: string;
};

export type ArenaLeagueState = {
  format: ArenaLeagueFormat;
  /** Players in seed order (best first). */
  players: string[];
  totalRounds: number;
  games: ArenaLeagueGame[];
};

export type ArenaLeagueStanding = {
  key: string;
  rank: number;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  /** Buchholz (Swiss) or Sonneborn-Berger (round-robin). */
  tiebreak: number;
};

export function swissRoundCount(players: number): number {
  return Math.max(1, Math.ceil(Math.log2(Math.max(2, players))));
}

export function leagueGameCount(format: ArenaLeagueFormat, players: number): number {
  if (format === "roundrobin") return (players * (players - 1)) / 2;
  return swissRoundCount(players) * Math.floor(players / 2);
}

function byeGame(round: number, key: string): ArenaLeagueGame {
  return { id: `l${round}-bye`, round, whiteKey: key, blackKey: null, result: "1-0" };
}

/** Circle method (Berger tables): every player meets every other once. */
export function roundRobinGames(players: string[]): ArenaLeagueGame[] {
  const ring: (string | null)[] = [...players];
  if (ring.length % 2 === 1) ring.push(null);
  const n = ring.length;
  const games: ArenaLeagueGame[] = [];
  /** Whites minus Blacks so far: the player with fewer Whites gets White. */
  const balance = new Map<string, number>();
  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const a = ring[i];
      const b = ring[n - 1 - i];
      if (!a && !b) continue;
      if (!a || !b) {
        games.push(byeGame(round, (a ?? b) as string));
        continue;
      }
      const ba = balance.get(a) ?? 0;
      const bb = balance.get(b) ?? 0;
      const aWhite = ba === bb ? (round + i) % 2 === 0 : ba < bb;
      balance.set(a, ba + (aWhite ? 1 : -1));
      balance.set(b, bb + (aWhite ? -1 : 1));
      games.push({
        id: `l${round}-g${i}`,
        round,
        whiteKey: aWhite ? a : b,
        blackKey: aWhite ? b : a,
        result: null,
      });
    }
    // Keep the first player fixed, rotate the others clockwise.
    ring.splice(1, 0, ring.pop() as string | null);
  }
  return games;
}

function pointsFor(result: ArenaLeagueResult, white: boolean): number {
  if (result === "1/2-1/2") return 0.5;
  return (result === "1-0") === white ? 1 : 0;
}

type PlayerTally = {
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  colorBalance: number;
  hadBye: boolean;
  opponents: { key: string; score: number }[];
};

function tally(state: ArenaLeagueState): Map<string, PlayerTally> {
  const map = new Map<string, PlayerTally>();
  for (const key of state.players) {
    map.set(key, {
      points: 0,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      colorBalance: 0,
      hadBye: false,
      opponents: [],
    });
  }
  for (const g of state.games) {
    if (!g.result) continue;
    const w = map.get(g.whiteKey);
    if (!w) continue;
    if (g.blackKey == null) {
      w.points += 1;
      w.hadBye = true;
      continue;
    }
    const b = map.get(g.blackKey);
    if (!b) continue;
    const ws = pointsFor(g.result, true);
    const bs = 1 - ws;
    for (const [p, score, color, opp] of [
      [w, ws, 1, g.blackKey],
      [b, bs, -1, g.whiteKey],
    ] as const) {
      p.points += score;
      p.played += 1;
      p.colorBalance += color;
      if (score === 1) p.wins += 1;
      else if (score === 0.5) p.draws += 1;
      else p.losses += 1;
      p.opponents.push({ key: opp, score });
    }
  }
  return map;
}

export function leagueStandings(state: ArenaLeagueState): ArenaLeagueStanding[] {
  const t = tally(state);
  const seed = new Map(state.players.map((k, i) => [k, i]));
  const rows = state.players.map((key) => {
    const p = t.get(key)!;
    const tiebreak =
      state.format === "swiss"
        ? p.opponents.reduce((s, o) => s + (t.get(o.key)?.points ?? 0), 0)
        : p.opponents.reduce((s, o) => s + o.score * (t.get(o.key)?.points ?? 0), 0);
    return {
      key,
      rank: 0,
      points: p.points,
      played: p.played,
      wins: p.wins,
      draws: p.draws,
      losses: p.losses,
      tiebreak,
    };
  });
  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.tiebreak - a.tiebreak ||
      b.wins - a.wins ||
      (seed.get(a.key) ?? 0) - (seed.get(b.key) ?? 0)
  );
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}

/** Pairs `order` (already ranked) without rematches when possible. */
function pairWithoutRematch(
  order: string[],
  met: (a: string, b: string) => boolean
): [string, string][] | null {
  if (order.length === 0) return [];
  const [first, ...rest] = order;
  for (let i = 0; i < rest.length; i++) {
    if (met(first, rest[i])) continue;
    const remaining = [...rest.slice(0, i), ...rest.slice(i + 1)];
    const tail = pairWithoutRematch(remaining, met);
    if (tail) return [[first, rest[i]], ...tail];
  }
  return null;
}

/** Swiss round: top half vs bottom half first, then score groups without rematches. */
export function swissRoundGames(state: ArenaLeagueState, round: number): ArenaLeagueGame[] {
  const t = tally(state);
  let order =
    round === 0 ? [...state.players] : leagueStandings(state).map((s) => s.key);
  const games: ArenaLeagueGame[] = [];

  if (order.length % 2 === 1) {
    const byeKey = [...order].reverse().find((k) => !t.get(k)?.hadBye) ?? order[order.length - 1];
    order = order.filter((k) => k !== byeKey);
    games.push(byeGame(round, byeKey));
  }

  let pairs: [string, string][];
  if (round === 0) {
    const half = order.length / 2;
    pairs = order.slice(0, half).map((k, i) => [k, order[half + i]]);
  } else {
    const met = (a: string, b: string) =>
      t.get(a)?.opponents.some((o) => o.key === b) ?? false;
    pairs = pairWithoutRematch(order, met) ?? pairWithoutRematch(order, () => false)!;
  }

  pairs.forEach(([a, b], i) => {
    const ca = t.get(a)?.colorBalance ?? 0;
    const cb = t.get(b)?.colorBalance ?? 0;
    const aWhite = ca === cb ? (round + i) % 2 === 0 : ca < cb;
    games.push({
      id: `l${round}-g${i}`,
      round,
      whiteKey: aWhite ? a : b,
      blackKey: aWhite ? b : a,
      result: null,
    });
  });
  return games;
}

export function createLeague(format: ArenaLeagueFormat, players: string[]): ArenaLeagueState {
  const unique = [...new Set(players.filter(Boolean))];
  if (format === "roundrobin") {
    return {
      format,
      players: unique,
      totalRounds: unique.length % 2 === 0 ? unique.length - 1 : unique.length,
      games: roundRobinGames(unique),
    };
  }
  const base: ArenaLeagueState = {
    format,
    players: unique,
    totalRounds: swissRoundCount(unique.length),
    games: [],
  };
  return { ...base, games: swissRoundGames(base, 0) };
}

export function nextLeagueGame(state: ArenaLeagueState): ArenaLeagueGame | null {
  return state.games.find((g) => g.result == null && g.blackKey != null) ?? null;
}

export function currentLeagueRound(state: ArenaLeagueState): number {
  return nextLeagueGame(state)?.round ?? Math.max(0, ...state.games.map((g) => g.round));
}

export function isLeagueFinished(state: ArenaLeagueState): boolean {
  if (state.games.length === 0 || nextLeagueGame(state)) return false;
  const roundsPlayed = Math.max(...state.games.map((g) => g.round)) + 1;
  return roundsPlayed >= state.totalRounds;
}

export function hasLeagueResults(state: ArenaLeagueState | null): boolean {
  return state?.games.some((g) => g.result != null && g.blackKey != null) ?? false;
}

export function recordLeagueGame(
  state: ArenaLeagueState,
  gameId: string,
  result: ArenaLeagueResult,
  note?: string
): ArenaLeagueState {
  const target = state.games.find((g) => g.id === gameId);
  if (!target || target.result != null) return state;
  let next: ArenaLeagueState = {
    ...state,
    games: state.games.map((g) => (g.id === gameId ? { ...g, result, note } : g)),
  };
  const roundDone = !next.games.some((g) => g.round === target.round && g.result == null);
  const lastRound = Math.max(...next.games.map((g) => g.round));
  if (
    next.format === "swiss" &&
    roundDone &&
    target.round === lastRound &&
    lastRound + 1 < next.totalRounds
  ) {
    next = { ...next, games: [...next.games, ...swissRoundGames(next, lastRound + 1)] };
  }
  return next;
}

export function leagueWinner(state: ArenaLeagueState): string | null {
  return isLeagueFinished(state) ? (leagueStandings(state)[0]?.key ?? null) : null;
}

/* ── Persistence ── */

export const ARENA_LEAGUE_STORAGE = "chess-arena.playoff.league";

const RESULTS: readonly ArenaLeagueResult[] = ["1-0", "0-1", "1/2-1/2"];

/** Restores a stored league; `null` if invalid or if a player left the pool. */
export function parseStoredLeague(raw: string | null, validKeys: Set<string>): ArenaLeagueState | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<ArenaLeagueState> | null;
    if (!data || (data.format !== "roundrobin" && data.format !== "swiss")) return null;
    if (!Array.isArray(data.players) || data.players.length < 2) return null;
    if (!data.players.every((k) => typeof k === "string" && validKeys.has(k))) return null;
    if (!Number.isInteger(data.totalRounds) || !Array.isArray(data.games)) return null;
    const players = new Set(data.players);
    const games: ArenaLeagueGame[] = [];
    for (const g of data.games) {
      if (!g || typeof g.id !== "string" || !Number.isInteger(g.round)) return null;
      if (!players.has(g.whiteKey)) return null;
      if (g.blackKey != null && !players.has(g.blackKey)) return null;
      if (g.result != null && !RESULTS.includes(g.result)) return null;
      games.push({
        id: g.id,
        round: g.round,
        whiteKey: g.whiteKey,
        blackKey: g.blackKey ?? null,
        result: g.result ?? null,
        ...(typeof g.note === "string" ? { note: g.note } : {}),
      });
    }
    return {
      format: data.format,
      players: data.players,
      totalRounds: data.totalRounds as number,
      games,
    };
  } catch {
    return null;
  }
}
