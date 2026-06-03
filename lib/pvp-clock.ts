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

export function formatClockMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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
