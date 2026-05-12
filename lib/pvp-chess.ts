import { Chess } from "chess.js";
import { applyUciMove } from "@/lib/learn-chess-utils";

export type PvpGameStatus = "waiting" | "playing" | "finished" | "aborted";

export interface PvpGameRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  white_user_id: string;
  black_user_id: string | null;
  status: PvpGameStatus;
  result: string | null;
  result_reason: string | null;
  draw_offered_by: string | null;
  /** unlimited | timed */
  clock_mode?: string | null;
  clock_initial_sec?: number | null;
  clock_increment_sec?: number | null;
  time_preset?: string | null;
  white_remaining_ms?: number | null;
  black_remaining_ms?: number | null;
  clock_turn_started_at?: string | null;
  /** Libellé public enregistré à la création du salon. */
  white_display_name?: string | null;
  /** Libellé public enregistré quand les noirs rejoignent. */
  black_display_name?: string | null;
}

export interface PvpMoveRow {
  id: number;
  game_id: string;
  ply: number;
  uci: string;
  played_by: string;
  created_at: string;
}

export function replayGameFromUcis(ucis: string[]): Chess {
  const game = new Chess();
  for (const uci of ucis) {
    const ok = applyUciMove(game, uci);
    if (!ok) break;
  }
  return game;
}

export function normalizeUci(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (s.length < 4 || s.length > 5) return null;
  if (!/^[a-h][1-8][a-h][1-8][qrnb]?$/.test(s)) return null;
  return s;
}

/** Returns PGN with minimal headers (chess.js). */
export function buildPgnFromUcis(
  ucis: string[],
  headers: { white: string; black: string; result: string }
): string {
  const game = replayGameFromUcis(ucis);
  game.header("Event", "Chess Avatar Online PvP");
  game.header("White", headers.white);
  game.header("Black", headers.black);
  game.header("Result", headers.result);
  return game.pgn();
}
