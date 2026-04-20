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
