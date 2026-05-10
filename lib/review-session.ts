/**
 * Session keys for /review when opening analysis from other pages (e.g. /analyze).
 */

export const REVIEW_PGN_SESSION_KEY = "chess-avatar.review.pgn";
export const REVIEW_CONTEXT_SESSION_KEY = "chess-avatar.review.context";

export type ReviewSessionContext = {
  playerName: string;
};

export function parseReviewSessionContext(raw: string | null): ReviewSessionContext | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const playerName = (o as { playerName?: unknown }).playerName;
    if (typeof playerName !== "string" || !playerName.trim()) return null;
    return { playerName: playerName.trim() };
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
