import type { ArenaOutcome } from "@/lib/arena-chess";

/**
 * Multi-game Spectator match between avatar A (picked as White) and avatar B.
 * Colors alternate every game so both avatars get the same number of Whites.
 */
export const ARENA_SERIES_LENGTHS = [1, 2, 4, 6] as const;
export type ArenaSeriesLength = (typeof ARENA_SERIES_LENGTHS)[number];

export type ArenaSeriesGameResult = {
  aWhite: boolean;
  winner: "a" | "b" | "draw";
  pgnResult: ArenaOutcome["pgnResult"];
};

export type ArenaSeriesState = {
  length: ArenaSeriesLength;
  games: ArenaSeriesGameResult[];
};

export function createArenaSeries(length: ArenaSeriesLength): ArenaSeriesState {
  return { length, games: [] };
}

export function isArenaSeriesLength(value: unknown): value is ArenaSeriesLength {
  return ARENA_SERIES_LENGTHS.includes(value as ArenaSeriesLength);
}

/** Avatar A has White in games 1, 3, 5… */
export function seriesGameAWhite(gameIndex: number): boolean {
  return gameIndex % 2 === 0;
}

export function seriesScore(state: ArenaSeriesState): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (const g of state.games) {
    if (g.winner === "a") a += 1;
    else if (g.winner === "b") b += 1;
    else {
      a += 0.5;
      b += 0.5;
    }
  }
  return { a, b };
}

/** One side already has more than half of the points: remaining games can't change the winner. */
export function isSeriesClinched(state: ArenaSeriesState): boolean {
  const { a, b } = seriesScore(state);
  return a > state.length / 2 || b > state.length / 2;
}

export function isSeriesOver(state: ArenaSeriesState): boolean {
  return state.games.length >= state.length || isSeriesClinched(state);
}

export function recordSeriesGame(
  state: ArenaSeriesState,
  outcome: Pick<ArenaOutcome, "winner" | "pgnResult">
): ArenaSeriesState {
  if (isSeriesOver(state)) return state;
  const aWhite = seriesGameAWhite(state.games.length);
  const winner =
    outcome.winner === "draw"
      ? "draw"
      : (outcome.winner === "white") === aWhite
        ? "a"
        : "b";
  return {
    ...state,
    games: [...state.games, { aWhite, winner, pgnResult: outcome.pgnResult }],
  };
}

export function seriesWinner(state: ArenaSeriesState): "a" | "b" | "draw" | null {
  if (!isSeriesOver(state)) return null;
  const { a, b } = seriesScore(state);
  return a > b ? "a" : b > a ? "b" : "draw";
}
