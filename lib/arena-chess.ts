import { Chess } from "chess.js";
import type { EngineConfig } from "@/lib/analysis";
import {
  getArenaMoveParams,
  getArenaPhase,
} from "@/lib/arena-move-timing";

/** Blitz 3+0 pour le mode playoff Arène. */
export const PLAYOFF_INITIAL_MS = 180_000;

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

/** Profil moteur pour un coup d’arène : caps + réflexion par phase. */
export function applyArenaMoveConfig(
  c: EngineConfig,
  opts: { depthCap: number; ply: number; game: Chess }
): EngineConfig {
  const phase = getArenaPhase(opts.ply, opts.game);
  const { timeControl, depth } = getArenaMoveParams(c, phase, opts.depthCap);
  return {
    ...c,
    depth,
    timeControl,
    threads: Math.min(Math.max(2, c.threads), 4),
  };
}

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
  winner: "white" | "black" | "draw";
};

export function classifyArenaOutcome(
  game: Chess,
  maxMovesReached: boolean,
  lang: "fr" | "en",
  timeoutWinner?: "white" | "black"
): ArenaOutcome {
  if (timeoutWinner === "white") {
    return {
      result: "win",
      resultType: "arena_timeout",
      resultMessage:
        lang === "fr"
          ? "Temps écoulé — victoire des blancs."
          : "Time out — White wins.",
      pgnResult: "1-0",
      winner: "white",
    };
  }
  if (timeoutWinner === "black") {
    return {
      result: "loss",
      resultType: "arena_timeout",
      resultMessage:
        lang === "fr"
          ? "Temps écoulé — victoire des noirs."
          : "Time out — Black wins.",
      pgnResult: "0-1",
      winner: "black",
    };
  }

  if (maxMovesReached && !game.isGameOver()) {
    return {
      result: "draw",
      resultType: "arena_move_limit",
      resultMessage:
        lang === "fr"
          ? "Partie arrêtée : limite de coups."
          : "Game stopped: move limit.",
      pgnResult: "1/2-1/2",
      winner: "draw",
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
        winner: "black",
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
      winner: "white",
    };
  }
  if (game.isStalemate() || game.isDraw()) {
    return {
      result: "draw",
      resultType: "arena_draw",
      resultMessage: lang === "fr" ? "Partie nulle." : "Draw.",
      pgnResult: "1/2-1/2",
      winner: "draw",
    };
  }
  return {
    result: "draw",
    resultType: "arena_draw_generic",
    resultMessage: lang === "fr" ? "Partie terminée." : "Game over.",
    pgnResult: "1/2-1/2",
    winner: "draw",
  };
}
