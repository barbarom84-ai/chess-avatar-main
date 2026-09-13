/** Win on move cap if White's eval exceeds this (strictly more than 2 pawns). */
export const ARENA_MOVE_LIMIT_WIN_PAWNS = 2;

/** Dedicated Stockfish depth when deciding a move-limit result. */
export const ARENA_MOVE_LIMIT_EVAL_DEPTH = 12;

export type ArenaMoveLimitWinner = "white" | "black" | "draw";

export function winnerFromWhitePovEval(
  evalWhitePov: number | null | undefined
): "white" | "black" | null {
  if (evalWhitePov == null || !Number.isFinite(evalWhitePov)) return null;
  if (evalWhitePov > ARENA_MOVE_LIMIT_WIN_PAWNS) return "white";
  if (evalWhitePov < -ARENA_MOVE_LIMIT_WIN_PAWNS) return "black";
  return null;
}

export function formatEvalPawns(evalWhitePov: number): string {
  const abs = Math.abs(evalWhitePov);
  const body = abs >= 10 ? abs.toFixed(0) : abs.toFixed(1);
  if (evalWhitePov > 0) return `+${body}`;
  if (evalWhitePov < 0) return `-${body}`;
  return "0.0";
}

export function moveLimitResultMessage(
  lang: "fr" | "en",
  winner: ArenaMoveLimitWinner,
  evalWhitePov?: number | null
): string {
  const ev =
    evalWhitePov != null && Number.isFinite(evalWhitePov)
      ? formatEvalPawns(evalWhitePov)
      : null;
  if (winner === "white") {
    return lang === "fr"
      ? `Limite de coups — victoire des blancs${ev ? ` (éval ${ev})` : ""}.`
      : `Move limit — White wins${ev ? ` (eval ${ev})` : ""}.`;
  }
  if (winner === "black") {
    return lang === "fr"
      ? `Limite de coups — victoire des noirs${ev ? ` (éval ${ev})` : ""}.`
      : `Move limit — Black wins${ev ? ` (eval ${ev})` : ""}.`;
  }
  return lang === "fr"
    ? "Partie arrêtée : limite de coups atteinte."
    : "Game stopped: move limit reached.";
}

export type ArenaMoveLimitOutcome = {
  winner: ArenaMoveLimitWinner;
  result: "win" | "loss" | "draw";
  resultType:
    | "arena_move_limit"
    | "arena_move_limit_white"
    | "arena_move_limit_black";
  resultMessage: string;
  pgnResult: "1-0" | "0-1" | "1/2-1/2";
};

export function classifyArenaMoveLimit(
  lang: "fr" | "en",
  evalWhitePov?: number | null
): ArenaMoveLimitOutcome {
  const side = winnerFromWhitePovEval(evalWhitePov);
  if (side === "white") {
    return {
      winner: "white",
      result: "win",
      resultType: "arena_move_limit_white",
      resultMessage: moveLimitResultMessage(lang, "white", evalWhitePov),
      pgnResult: "1-0",
    };
  }
  if (side === "black") {
    return {
      winner: "black",
      result: "loss",
      resultType: "arena_move_limit_black",
      resultMessage: moveLimitResultMessage(lang, "black", evalWhitePov),
      pgnResult: "0-1",
    };
  }
  return {
    winner: "draw",
    result: "draw",
    resultType: "arena_move_limit",
    resultMessage: moveLimitResultMessage(lang, "draw", evalWhitePov),
    pgnResult: "1/2-1/2",
  };
}

/** White/Black/draw from a saved arena `result_type` (playoff prefix allowed). */
export function arenaBotVsBotSide(
  resultType: string,
  result?: string
): ArenaMoveLimitWinner {
  const t = resultType.replace(/^arena_playoff_/, "");
  if (t === "arena_white_wins" || t === "arena_move_limit_white") {
    return "white";
  }
  if (t === "arena_black_wins" || t === "arena_move_limit_black") {
    return "black";
  }
  if (result === "win") return "white";
  if (result === "loss") return "black";
  return "draw";
}
