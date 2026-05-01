import { Chess } from "chess.js";
import { parsePgnBlock, chessAtPly } from "@/lib/pgn-to-uci";

/** Normalized Lichess puzzle payload for the UI / API responses. */
export interface NormalizedLichessPuzzle {
  puzzleId: string;
  gameId: string;
  fen: string;
  solutionUci: string[];
  themes: string[];
  rating: number;
  plays: number;
  /** Raw movetext from Lichess (SAN tokens or small PGN fragment). */
  rawPgn: string;
  players: Array<{
    color: "white" | "black";
    name: string;
    rating?: number;
  }>;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== "string") return null;
    out.push(x);
  }
  return out;
}

/**
 * Build full-game UCI list from Lichess `game.pgn` (movetext with or without headers).
 */
export function uciMovesFromLichessGamePgn(rawPgn: string): string[] | null {
  const trimmed = rawPgn.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return null;

  const withHeaders = `[Event "?"]\n[Site "?"]\n[Date "?"]\n[Round "?"]\n[White "?"]\n[Black "?"]\n[Result "*"]\n\n${trimmed}`;
  const parsed = parsePgnBlock(withHeaders);
  if (parsed?.uciMoves?.length) return parsed.uciMoves;

  const chess = new Chess();
  const uciOut: string[] = [];
  const tokens = trimmed.split(/\s+/).filter((t) => {
    if (!t) return false;
    if (/^\d+\.?$/.test(t)) return false;
    if (t === "1-0" || t === "0-1" || t === "1/2-1/2" || t === "*") return false;
    return true;
  });
  for (const tok of tokens) {
    const m = chess.move(tok);
    if (!m) return null;
    uciOut.push(`${m.from}${m.to}${m.promotion ?? ""}`);
  }
  return uciOut;
}

/**
 * Replay `initialPly` half-moves from the start position using `game.pgn` movetext.
 */
export function fenAfterInitialPly(rawPgn: string, initialPly: number): string | null {
  if (initialPly < 0) return null;
  const uciMoves = uciMovesFromLichessGamePgn(rawPgn);
  if (!uciMoves || uciMoves.length < initialPly) return null;
  const chess = chessAtPly(uciMoves, initialPly);
  return chess?.fen() ?? null;
}

function parsePlayers(game: Record<string, unknown>): NormalizedLichessPuzzle["players"] {
  const raw = game.players;
  if (!Array.isArray(raw)) return [];
  const out: NormalizedLichessPuzzle["players"] = [];
  for (const p of raw) {
    if (!isRecord(p)) continue;
    const colorRaw = asString(p.color);
    const color =
      colorRaw === "white" || colorRaw === "black" ? colorRaw : null;
    const name = asString(p.name) ?? "?";
    const rating = asNumber(p.rating);
    if (!color) continue;
    out.push({ color, name, rating: rating ?? undefined });
  }
  return out;
}

/** Normalize `GET /api/puzzle/daily` or single puzzle object shape. */
export function normalizeLichessPuzzlePayload(raw: unknown): NormalizedLichessPuzzle | null {
  if (!isRecord(raw)) return null;
  const game = raw.game;
  const puzzle = raw.puzzle;
  if (!isRecord(game) || !isRecord(puzzle)) return null;

  const gameId = asString(game.id) ?? "";
  const rawPgn = asString(game.pgn) ?? "";
  const puzzleId = asString(puzzle.id) ?? "";
  const initialPly = asNumber(puzzle.initialPly);
  const rating = asNumber(puzzle.rating) ?? 0;
  const plays = asNumber(puzzle.plays) ?? 0;
  const solutionRaw = asStringArray(puzzle.solution);
  const themesRaw = asStringArray(puzzle.themes);

  if (!gameId || !puzzleId || !rawPgn || initialPly === null || !solutionRaw?.length) {
    return null;
  }

  const fen = fenAfterInitialPly(rawPgn, initialPly);
  if (!fen) return null;

  const solutionUci = solutionRaw.map((u) => u.trim().toLowerCase());

  return {
    puzzleId,
    gameId,
    fen,
    solutionUci,
    themes: themesRaw ?? [],
    rating,
    plays,
    rawPgn,
    players: parsePlayers(game),
  };
}

/** Top-level `GET /api/puzzle/batch/{angle}` response. */
export function firstPuzzleFromBatchResponse(raw: unknown): NormalizedLichessPuzzle | null {
  if (!isRecord(raw)) return null;
  const puzzles = raw.puzzles;
  if (!Array.isArray(puzzles) || puzzles.length === 0) return null;
  return normalizeLichessPuzzlePayload(puzzles[0]);
}
