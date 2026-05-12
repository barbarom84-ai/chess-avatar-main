import type { Color } from "chess.js";
import type { PvpGameRow } from "@/lib/pvp-chess";

/** Temps affiché côté client (Fischer, horloge du camp au trait qui décrémente). */
export function getPvpClockDisplayMs(
  game: PvpGameRow,
  sideToMove: Color,
  nowMs: number
): { whiteMs: number; blackMs: number; active: Color | null } {
  if (game.clock_mode !== "timed") {
    return { whiteMs: 0, blackMs: 0, active: null };
  }
  const w = game.white_remaining_ms;
  const b = game.black_remaining_ms;
  const started = game.clock_turn_started_at
    ? new Date(game.clock_turn_started_at).getTime()
    : null;
  if (w == null || b == null || started == null || game.status !== "playing") {
    return { whiteMs: w ?? 0, blackMs: b ?? 0, active: null };
  }
  const elapsed = Math.max(0, nowMs - started);
  if (sideToMove === "w") {
    return { whiteMs: Math.max(0, w - elapsed), blackMs: b, active: "w" };
  }
  return { whiteMs: w, blackMs: Math.max(0, b - elapsed), active: "b" };
}

export function formatClockMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
