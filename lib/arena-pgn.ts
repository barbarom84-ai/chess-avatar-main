import { Chess } from "chess.js";
import type { ArenaOutcome } from "@/lib/arena-chess";

export function countArenaCapturesChecks(game: Chess): {
  captures: number;
  checks: number;
} {
  const tmp = new Chess();
  let captures = 0;
  let checks = 0;
  for (const san of game.history()) {
    const m = tmp.move(san);
    if (m?.captured) captures++;
    if (tmp.inCheck()) checks++;
  }
  return { captures, checks };
}

function escapePgnHeader(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, "'");
}

/** PGN `TimeControl` tag value, e.g. `180+2`. */
export function pgnTimeControl(cadence: {
  initialSec: number;
  incrementSec: number;
}): string {
  return `${Math.max(0, cadence.initialSec)}+${Math.max(0, cadence.incrementSec)}`;
}

export function buildArenaPgn(params: {
  whiteName: string;
  blackName: string;
  /** `*` marks a game still in progress. */
  outcome: {
    pgnResult: ArenaOutcome["pgnResult"] | "*";
    resultMessage: string;
  };
  uciMoves: string[];
  event?: string;
  round?: string;
  timeControl?: string;
  date?: Date;
}): string {
  const {
    whiteName,
    blackName,
    outcome,
    uciMoves,
    event = "Chess Avatar Arena",
    round = "1",
    timeControl = "-",
    date = new Date(),
  } = params;
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;

  const replay = new Chess();
  const sans: string[] = [];
  for (const uci of uciMoves) {
    if (!uci || uci.length < 4) continue;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion =
      uci.length > 4 ? (uci[4] as "q" | "r" | "b" | "n") : undefined;
    let m;
    try {
      m = replay.move(promotion ? { from, to, promotion } : { from, to });
    } catch {
      m = null;
    }
    if (!m) break;
    sans.push(m.san);
  }

  const headers = [
    `[Event "${escapePgnHeader(event)}"]`,
    `[Site "Chess Avatar / Arena"]`,
    `[Date "${dateStr}"]`,
    `[Time "${timeStr}"]`,
    `[Round "${escapePgnHeader(round)}"]`,
    `[White "${escapePgnHeader(whiteName)}"]`,
    `[Black "${escapePgnHeader(blackName)}"]`,
    `[Result "${outcome.pgnResult}"]`,
    `[TimeControl "${escapePgnHeader(timeControl)}"]`,
    ...(outcome.resultMessage
      ? [`[Termination "${escapePgnHeader(outcome.resultMessage)}"]`]
      : []),
  ];

  let movesStr = "";
  if (sans.length === 0) {
    movesStr = outcome.pgnResult;
  } else {
    for (let i = 0; i < sans.length; i++) {
      if (i % 2 === 0) movesStr += `${Math.floor(i / 2) + 1}. `;
      movesStr += sans[i] + " ";
      if (i % 16 === 15 && i < sans.length - 1) movesStr += "\n";
    }
    movesStr += outcome.pgnResult;
  }

  return headers.join("\n") + "\n\n" + movesStr;
}
