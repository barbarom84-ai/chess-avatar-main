import type { DbGame } from "@/lib/supabase-storage";
import {
  isArenaBotVsBotGame,
  isPvpOnlineGame,
} from "@/lib/supabase-storage";
import {
  parsePgnTagInBlock,
  splitPgnDatabase,
} from "@/lib/pgn-import";

/** Readable « White vs Black » title from stored PGN tags. */
export function matchupTitleFromStoredGame(game: DbGame): string {
  const raw = game.pgn?.trim();
  if (!raw) return game.opponent_name;
  const block = splitPgnDatabase(raw)[0];
  if (!block) return game.opponent_name;
  const w = parsePgnTagInBlock(block, "White")?.trim();
  const b = parsePgnTagInBlock(block, "Black")?.trim();
  if (w && b && w !== "?" && b !== "?") {
    return `${w} vs ${b}`;
  }
  return game.opponent_name;
}

export function isHumanVsBotOnly(game: DbGame): boolean {
  return !isArenaBotVsBotGame(game) && !isPvpOnlineGame(game);
}
