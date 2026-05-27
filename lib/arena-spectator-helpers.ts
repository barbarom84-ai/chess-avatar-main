import { Chess } from "chess.js";
import type { EngineConfig } from "@/lib/analysis";

export function replayUci(history: string[]): Chess {
  const g = new Chess();
  for (const u of history) {
    if (!u || u.length < 4) continue;
    const from = u.slice(0, 2);
    const to = u.slice(2, 4);
    const promotion =
      u.length > 4 ? (u[4] as "q" | "r" | "b" | "n") : undefined;
    const ok = g.move(
      promotion ? { from, to, promotion } : { from, to }
    );
    if (!ok) break;
  }
  return g;
}

export function applyArenaCaps(c: EngineConfig, depthCap: number): EngineConfig {
  return {
    ...c,
    depth: Math.min(Math.max(5, c.depth), depthCap),
    timeControl: Math.min(Math.max(100, c.timeControl), 2000),
    threads: Math.min(Math.max(2, c.threads), 4),
  };
}

/** Stockfish `cp` is from side-to-move POV — convert to white POV. */
export function stmEvalToWhitePov(fen: string, evalFromEngine: number): number {
  try {
    return new Chess(fen).turn() === "w" ? evalFromEngine : -evalFromEngine;
  } catch {
    return evalFromEngine;
  }
}

export type ArenaOutcome = {
  result: "win" | "loss" | "draw";
  resultType: string;
  resultMessage: string;
  pgnResult: "1-0" | "0-1" | "1/2-1/2";
};

export function classifyArenaOutcome(
  game: Chess,
  maxMovesReached: boolean,
  lang: "fr" | "en"
): ArenaOutcome {
  if (maxMovesReached && !game.isGameOver()) {
    return {
      result: "draw",
      resultType: "arena_move_limit",
      resultMessage:
        lang === "fr"
          ? "Partie arrêtée : limite de coups atteinte."
          : "Game stopped: move limit reached.",
      pgnResult: "1/2-1/2",
    };
  }
  if (game.isCheckmate()) {
    const loser = game.turn();
    if (loser === "w") {
      return {
        result: "loss",
        resultType: "arena_black_wins",
        resultMessage:
          lang === "fr"
            ? "Échec et mat — victoire des noirs."
            : "Checkmate — Black wins.",
        pgnResult: "0-1",
      };
    }
    return {
      result: "win",
      resultType: "arena_white_wins",
      resultMessage:
        lang === "fr"
          ? "Échec et mat — victoire des blancs."
          : "Checkmate — White wins.",
      pgnResult: "1-0",
    };
  }
  if (game.isStalemate()) {
    return {
      result: "draw",
      resultType: "arena_draw_stalemate",
      resultMessage: lang === "fr" ? "Pat." : "Stalemate.",
      pgnResult: "1/2-1/2",
    };
  }
  if (game.isDraw()) {
    let resultType = "arena_draw_generic";
    let msg = lang === "fr" ? "Partie nulle." : "Draw.";
    if (game.isInsufficientMaterial()) {
      resultType = "arena_draw_insufficient";
      msg =
        lang === "fr"
          ? "Nulle — matériel insuffisant."
          : "Draw — insufficient material.";
    } else if (game.isThreefoldRepetition()) {
      resultType = "arena_draw_threefold";
      msg =
        lang === "fr"
          ? "Nulle — triple répétition."
          : "Draw — threefold repetition.";
    } else if (game.isDrawByFiftyMoves()) {
      resultType = "arena_draw_fifty";
      msg =
        lang === "fr"
          ? "Nulle — règle des 50 coups."
          : "Draw — fifty-move rule.";
    }
    return {
      result: "draw",
      resultType,
      resultMessage: msg,
      pgnResult: "1/2-1/2",
    };
  }
  return {
    result: "draw",
    resultType: "arena_draw_generic",
    resultMessage: lang === "fr" ? "Partie terminée." : "Game over.",
    pgnResult: "1/2-1/2",
  };
}
