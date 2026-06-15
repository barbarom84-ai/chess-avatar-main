import type { Color } from "chess.js";
import type { PvpGameRow } from "@/lib/pvp-chess";
import { correspondenceDaysFromGame } from "@/lib/pvp-time-controls";

export type PvpClockDisplay = {
  whiteMs: number;
  blackMs: number;
  active: Color | null;
  correspondence: boolean;
  daysPerMove: number | null;
};

/** Temps affiché côté client (Fischer ou délai par coup en différé). */
export function getPvpClockDisplayMs(
  game: PvpGameRow,
  sideToMove: Color,
  nowMs: number
): PvpClockDisplay {
  const daysPerMove = correspondenceDaysFromGame(game);

  if (game.clock_mode === "correspondence") {
    const budgetMs = Math.max(0, Number(game.clock_initial_sec ?? 0)) * 1000;
    const started = game.clock_turn_started_at
      ? new Date(game.clock_turn_started_at).getTime()
      : null;

    if (budgetMs <= 0 || started == null || game.status !== "playing") {
      return {
        whiteMs: budgetMs,
        blackMs: budgetMs,
        active: null,
        correspondence: true,
        daysPerMove,
      };
    }

    const elapsed = Math.max(0, nowMs - started);
    const remaining = Math.max(0, budgetMs - elapsed);

    if (sideToMove === "w") {
      return {
        whiteMs: remaining,
        blackMs: budgetMs,
        active: "w",
        correspondence: true,
        daysPerMove,
      };
    }
    return {
      whiteMs: budgetMs,
      blackMs: remaining,
      active: "b",
      correspondence: true,
      daysPerMove,
    };
  }

  if (game.clock_mode !== "timed") {
    return { whiteMs: 0, blackMs: 0, active: null, correspondence: false, daysPerMove: null };
  }

  const w = game.white_remaining_ms;
  const b = game.black_remaining_ms;
  const started = game.clock_turn_started_at
    ? new Date(game.clock_turn_started_at).getTime()
    : null;
  if (w == null || b == null || started == null || game.status !== "playing") {
    return { whiteMs: w ?? 0, blackMs: b ?? 0, active: null, correspondence: false, daysPerMove: null };
  }
  const elapsed = Math.max(0, nowMs - started);
  if (sideToMove === "w") {
    return {
      whiteMs: Math.max(0, w - elapsed),
      blackMs: b,
      active: "w",
      correspondence: false,
      daysPerMove: null,
    };
  }
  return {
    whiteMs: w,
    blackMs: Math.max(0, b - elapsed),
    active: "b",
    correspondence: false,
    daysPerMove: null,
  };
}

/** True when the side to move has no time left (client display / pre-claim). */
export function isPvpSideToMoveTimedOut(
  game: PvpGameRow,
  sideToMove: Color,
  nowMs: number
): boolean {
  if (game.status !== "playing") return false;
  if (game.clock_mode !== "timed" && game.clock_mode !== "correspondence") return false;
  const display = getPvpClockDisplayMs(game, sideToMove, nowMs);
  if (!display.active) return false;
  const activeMs = display.active === "w" ? display.whiteMs : display.blackMs;
  return activeMs <= 0;
}

export function correspondenceLowThresholdMs(budgetMs: number): number {
  if (budgetMs <= 0) return 0;
  const oneHour = 60 * 60 * 1000;
  const sixHours = 6 * oneHour;
  // Alerte uniquement dans les dernières 10 % du délai (entre 1 h et 6 h).
  return Math.max(oneHour, Math.min(sixHours, Math.floor(budgetMs * 0.1)));
}

export function isCorrespondenceTimeLow(remainingMs: number, budgetMs: number): boolean {
  if (remainingMs <= 0) return false;
  const threshold = correspondenceLowThresholdMs(budgetMs);
  return threshold > 0 && remainingMs <= threshold;
}

export function formatClockMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Horloge en direct avec millisecondes (M:SS.mmm). */
export function formatClockMsPrecise(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0:00.000";
  const totalMs = Math.max(0, Math.floor(ms));
  const m = Math.floor(totalMs / 60_000);
  const s = Math.floor((totalMs % 60_000) / 1000);
  const msPart = totalMs % 1000;
  return `${m}:${s.toString().padStart(2, "0")}.${msPart.toString().padStart(3, "0")}`;
}

export function formatCorrespondenceMs(ms: number, lang: "fr" | "en"): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return lang === "fr" ? "0 j" : "0 d";
  }
  const totalSec = Math.ceil(ms / 1000);
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);

  if (days >= 1) {
    if (hours > 0) {
      return lang === "fr" ? `${days} j ${hours} h` : `${days}d ${hours}h`;
    }
    return lang === "fr" ? `${days} j` : `${days}d`;
  }
  if (hours >= 1) {
    return lang === "fr" ? `${hours} h ${minutes} min` : `${hours}h ${minutes}m`;
  }
  if (minutes >= 1) {
    return lang === "fr" ? `${minutes} min` : `${minutes}m`;
  }
  return formatClockMs(ms);
}
