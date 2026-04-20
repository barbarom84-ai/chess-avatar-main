import { Chess, type Move } from "chess.js";

function moveToUci(m: Move): string {
  const promo = m.promotion ?? "";
  return `${m.from}${m.to}${promo}`;
}

/** Extrait la liste des coups UCI (ex. e2e4) d’un bloc PGN d’une seule partie. */
export function pgnBlockToUciMoves(pgnBlock: string): string[] | null {
  const trimmed = pgnBlock.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return null;
  try {
    const chess = new Chess();
    chess.loadPgn(trimmed);
    const verbose = chess.history({ verbose: true });
    return verbose.map(moveToUci);
  } catch {
    return null;
  }
}

export interface PgnMoveComment {
  /** 1-based count of plies already played when this comment appears (matches `HistoricalGame.annotations.afterMoveIndex`). */
  afterMoveIndex: number;
  text: string;
}

export interface ParsedPgn {
  headers: Record<string, string>;
  uciMoves: string[];
  moveComments: PgnMoveComment[];
  /** Result tag from the headers when present (e.g. "1-0", "0-1", "1/2-1/2", "*"). */
  result: string;
}

function normalizeComment(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Parse a single-game PGN block: headers, UCI moves, and inline `{ ... }` comments.
 * Comments are aligned with plies via the FEN-after-move that chess.js records.
 */
export function parsePgnBlock(pgnBlock: string): ParsedPgn | null {
  const trimmed = pgnBlock.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return null;
  try {
    const chess = new Chess();
    chess.loadPgn(trimmed);
    const verbose = chess.history({ verbose: true });
    const uciMoves = verbose.map(moveToUci);
    const headers = chess.getHeaders();
    const rawComments = chess.getComments();
    const moveComments: PgnMoveComment[] = [];
    if (rawComments.length > 0) {
      const fenToPly = new Map<string, number>();
      for (let i = 0; i < verbose.length; i++) {
        fenToPly.set(verbose[i].after, i + 1);
      }
      for (const c of rawComments) {
        const text = normalizeComment(c.comment ?? "");
        if (!text) continue;
        const ply = fenToPly.get(c.fen);
        if (typeof ply === "number") {
          moveComments.push({ afterMoveIndex: ply, text });
        }
      }
      moveComments.sort((a, b) => a.afterMoveIndex - b.afterMoveIndex);
    }
    return {
      headers,
      uciMoves,
      moveComments,
      result: headers.Result ?? "*",
    };
  } catch {
    return null;
  }
}

function uciToFromTo(uci: string): { from: string; to: string; promotion?: string } | null {
  const m = uci.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/i);
  if (!m) return null;
  return { from: m[1], to: m[2], promotion: m[3]?.toLowerCase() };
}

/**
 * Replay a UCI sequence and return the SAN of every move (parallel array). Stops early
 * and returns whatever was successfully replayed if a move turns out illegal.
 */
export function uciSequenceToSan(uciMoves: string[]): string[] {
  const chess = new Chess();
  const out: string[] = [];
  for (const uci of uciMoves) {
    const parts = uciToFromTo(uci);
    if (!parts) break;
    try {
      const move = chess.move(parts);
      if (!move) break;
      out.push(move.san);
    } catch {
      break;
    }
  }
  return out;
}

/**
 * Build a Chess instance positioned after the first `afterMoveCount` plies of `uciMoves`.
 * Returns `null` if the replay fails (illegal move, etc.).
 */
export function chessAtPly(uciMoves: string[], afterMoveCount: number): Chess | null {
  const chess = new Chess();
  const limit = Math.max(0, Math.min(afterMoveCount, uciMoves.length));
  for (let i = 0; i < limit; i++) {
    const parts = uciToFromTo(uciMoves[i]);
    if (!parts) return null;
    try {
      const ok = chess.move(parts);
      if (!ok) return null;
    } catch {
      return null;
    }
  }
  return chess;
}

/**
 * Pick up to `count` plausible wrong UCI moves from the position after `afterMoveCount`
 * plies of `uciMoves`, excluding the actual game move (`correctUci`). Selection is
 * deterministic (alphabetical by `from+to`) so the admin sees a stable suggestion list.
 */
export function suggestWrongMoves(
  uciMoves: string[],
  afterMoveCount: number,
  correctUci: string,
  count = 3,
): string[] {
  const chess = chessAtPly(uciMoves, afterMoveCount);
  if (!chess) return [];
  const verbose = chess.moves({ verbose: true });
  const candidates = verbose
    .map((m) => `${m.from}${m.to}${m.promotion ?? ""}`)
    .filter((u) => u !== correctUci);
  candidates.sort();
  return candidates.slice(0, Math.max(0, count));
}

/**
 * Convenience: SAN of the move at index `afterMoveCount` (i.e. the move played from the
 * "after `afterMoveCount` plies" position). Returns `null` if out of range or replay fails.
 */
export function sanOfMoveAt(uciMoves: string[], afterMoveCount: number): { san: string; uci: string } | null {
  if (afterMoveCount < 0 || afterMoveCount >= uciMoves.length) return null;
  const chess = chessAtPly(uciMoves, afterMoveCount);
  if (!chess) return null;
  const parts = uciToFromTo(uciMoves[afterMoveCount]);
  if (!parts) return null;
  try {
    const move = chess.move(parts);
    return move ? { san: move.san, uci: uciMoves[afterMoveCount] } : null;
  } catch {
    return null;
  }
}

/**
 * Split a multi-game PGN string into individual game blocks.
 * Heuristic: a new game begins at a `[Event "..."]` tag preceded by a blank line or start of text.
 */
export function splitPgnGames(pgn: string): string[] {
  const normalized = pgn.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const stripped = normalized.replace(/^\s+/, "");
  if (!stripped) return [];
  const SENTINEL = "\u0000\u0000GAME\u0000\u0000";
  const tagged = stripped.replace(/\n\s*\n+(?=\[Event\b)/g, SENTINEL);
  return tagged
    .split(SENTINEL)
    .map((b) => b.trim())
    .filter(Boolean);
}
