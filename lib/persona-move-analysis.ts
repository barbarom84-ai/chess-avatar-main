import { Chess } from "chess.js";
import type { PersonaGameInput } from "./analysis";

/** Square activity counts from a player's moves (from/to/capture). */
export interface SquareHeatMap {
  /** Square → weighted activity count (from=1, to=1, capture=+0.5). */
  squares: Record<string, number>;
  /** Max value for normalization (0–100 scale in UI). */
  maxCount: number;
  gamesAnalyzed: number;
}

/** One data point for progression timeline. */
export interface ProgressionPoint {
  /** ISO date or game id for ordering. */
  date: string;
  timestamp: number;
  result: "win" | "draw" | "loss" | "unknown";
  /** Player ELO from PGN tags if available. */
  rating: number | null;
  moveCount: number;
}

export interface PersonaMoveAnalysis {
  heatMap: SquareHeatMap;
  timeline: ProgressionPoint[];
}

function squareKey(sq: string): string {
  return sq.toLowerCase();
}

function bump(map: Record<string, number>, sq: string, amount = 1): void {
  const key = squareKey(sq);
  map[key] = (map[key] ?? 0) + amount;
}

function resolvePlayerColor(
  game: PersonaGameInput,
  username: string
): "w" | "b" | null {
  const lower = username.toLowerCase();
  const whiteName =
    game.players?.white?.user?.name ??
    game.players?.white?.username ??
    "";
  const blackName =
    game.players?.black?.user?.name ??
    game.players?.black?.username ??
    "";
  if (whiteName.toLowerCase() === lower) return "w";
  if (blackName.toLowerCase() === lower) return "b";

  const pgn = typeof game.pgn === "string" ? game.pgn : "";
  const whiteTag = pgn.match(/\[White\s+"([^"]+)"\]/i)?.[1];
  const blackTag = pgn.match(/\[Black\s+"([^"]+)"\]/i)?.[1];
  if (whiteTag?.toLowerCase() === lower) return "w";
  if (blackTag?.toLowerCase() === lower) return "b";
  return null;
}

function parsePgnTag(pgn: string, tag: string): string | null {
  const regex = new RegExp(`\\[${tag}\\s+"([^"]+)"\\]`, "i");
  return pgn.match(regex)?.[1]?.trim() ?? null;
}

function gameResult(
  game: PersonaGameInput,
  playerColor: "w" | "b"
): ProgressionPoint["result"] {
  const winner = game.winner?.toLowerCase();
  if (!winner || winner === "draw") return winner === "draw" ? "draw" : "unknown";
  if (winner === "white") return playerColor === "w" ? "win" : "loss";
  if (winner === "black") return playerColor === "b" ? "win" : "loss";
  return "unknown";
}

function playerRating(pgn: string, color: "w" | "b"): number | null {
  const tag = color === "w" ? "WhiteElo" : "BlackElo";
  const raw = parsePgnTag(pgn, tag);
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Aggregate square heat map and per-game timeline from analyzed games.
 */
export function analyzePersonaMoves(
  games: PersonaGameInput[],
  username: string
): PersonaMoveAnalysis {
  const squares: Record<string, number> = {};
  const timeline: ProgressionPoint[] = [];
  let gamesAnalyzed = 0;

  for (const game of games) {
    const pgn = typeof game.pgn === "string" ? game.pgn : "";
    if (!pgn) continue;

    const color = resolvePlayerColor(game, username);
    if (!color) continue;

    let chess: Chess;
    try {
      chess = new Chess();
      chess.loadPgn(pgn);
    } catch {
      continue;
    }

    const history = chess.history({ verbose: true });
    const playerMoves = history.filter((m) => m.color === color);
    if (playerMoves.length === 0) continue;

    gamesAnalyzed += 1;
    for (const move of playerMoves) {
      bump(squares, move.from);
      bump(squares, move.to);
      if (move.captured) bump(squares, move.to, 0.5);
    }

    const ts = game.createdAt ?? Date.now();
    timeline.push({
      date: new Date(ts).toISOString().slice(0, 10),
      timestamp: ts,
      result: gameResult(game, color),
      rating: playerRating(pgn, color),
      moveCount: playerMoves.length,
    });
  }

  timeline.sort((a, b) => a.timestamp - b.timestamp);

  const maxCount = Math.max(1, ...Object.values(squares));

  return {
    heatMap: { squares, maxCount, gamesAnalyzed },
    timeline,
  };
}

/** Normalize heat value to 0–100 for UI coloring. */
export function heatIntensity(count: number, maxCount: number): number {
  if (maxCount <= 0) return 0;
  return Math.round((count / maxCount) * 100);
}

/** Rolling win rate over last N games for timeline chart. */
export function rollingWinRate(
  timeline: ProgressionPoint[],
  windowSize = 10
): { date: string; winRate: number; gameIndex: number }[] {
  const out: { date: string; winRate: number; gameIndex: number }[] = [];
  for (let i = 0; i < timeline.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const slice = timeline.slice(start, i + 1);
    const scored = slice.filter((p) => p.result !== "unknown");
    if (scored.length === 0) continue;
    const wins = scored.filter((p) => p.result === "win").length;
    out.push({
      date: timeline[i].date,
      winRate: Math.round((wins / scored.length) * 100),
      gameIndex: i + 1,
    });
  }
  return out;
}
