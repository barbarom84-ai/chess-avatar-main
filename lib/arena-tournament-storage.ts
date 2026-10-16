import { ARENA_LEAGUE_STORAGE } from "@/lib/arena-league";
import { PLAYOFF_BRACKET_STORAGE } from "@/lib/arena-playoff-bracket";

/**
 * Separate localStorage namespaces for avatar Playoff vs Humans-only tournaments.
 */
export const ARENA_TOURNAMENT_STORAGE = {
  avatars: {
    bracket: PLAYOFF_BRACKET_STORAGE,
    league: ARENA_LEAGUE_STORAGE,
    format: "chess-arena.playoff.format",
  },
  humans: {
    bracket: "chess-arena.humans.bracket",
    league: "chess-arena.humans.league",
    format: "chess-arena.humans.format",
  },
} as const;

export type ArenaTournamentScope = keyof typeof ARENA_TOURNAMENT_STORAGE;
