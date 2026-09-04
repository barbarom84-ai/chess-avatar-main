/**
 * Session keys for /review when opening analysis from other pages (e.g. /analyze).
 */

import type { EngineConfig } from "@/lib/analysis";
import { slimCoachFromConfig } from "@/lib/chess-avatar-pro-coach";

export const REVIEW_PGN_SESSION_KEY = "chess-avatar.review.pgn";
export const REVIEW_CONTEXT_SESSION_KEY = "chess-avatar.review.context";

export type ReviewSessionContext = {
  playerName: string;
  opponent?: EngineConfig;
  playerColor?: "white" | "black";
};

export function parseReviewSessionContext(raw: string | null): ReviewSessionContext | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const playerName = (o as { playerName?: unknown }).playerName;
    if (typeof playerName !== "string" || !playerName.trim()) return null;
    const opponentRaw = (o as { opponent?: unknown }).opponent;
    let opponent: EngineConfig | undefined;
    if (opponentRaw && typeof opponentRaw === "object" && opponentRaw !== null) {
      const name = (opponentRaw as { name?: unknown }).name;
      if (typeof name === "string" && name.trim()) {
        opponent = opponentRaw as EngineConfig;
      }
    }
    const colorRaw = (o as { playerColor?: unknown }).playerColor;
    const playerColor =
      colorRaw === "white" || colorRaw === "black" ? colorRaw : undefined;
    return { playerName: playerName.trim(), opponent, playerColor };
  } catch {
    return null;
  }
}

export function readReviewSessionContext(): ReviewSessionContext | null {
  if (typeof window === "undefined") return null;
  try {
    return parseReviewSessionContext(sessionStorage.getItem(REVIEW_CONTEXT_SESSION_KEY));
  } catch {
    return null;
  }
}

export function clearReviewSessionContext(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(REVIEW_CONTEXT_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function setReviewSessionFromPlay(
  pgn: string,
  opponent: EngineConfig,
  playerName = "Player",
  playerColor?: "white" | "black"
): void {
  if (typeof window === "undefined") return;
  try {
    const ctx: ReviewSessionContext = {
      playerName: playerName.trim() || "Player",
      opponent: slimCoachFromConfig(opponent),
      ...(playerColor ? { playerColor } : {}),
    };
    sessionStorage.setItem(REVIEW_CONTEXT_SESSION_KEY, JSON.stringify(ctx));
    sessionStorage.setItem(REVIEW_PGN_SESSION_KEY, pgn);
  } catch {
    // ignore
  }
}

export function setReviewSessionFromAnalyze(username: string, pgn: string): void {
  if (typeof window === "undefined") return;
  try {
    const ctx: ReviewSessionContext = { playerName: username.trim() };
    sessionStorage.setItem(REVIEW_CONTEXT_SESSION_KEY, JSON.stringify(ctx));
    sessionStorage.setItem(REVIEW_PGN_SESSION_KEY, pgn);
  } catch {
    // ignore
  }
}
