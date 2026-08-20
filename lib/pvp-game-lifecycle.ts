import type { PvpTimePreset } from "@/lib/pvp-time-controls";
import { presetStorageInitialSec } from "@/lib/pvp-time-controls";

/** Horloges au démarrage d'une partie (join ou matchmaking). */
export function initialClockFieldsForPreset(
  preset: PvpTimePreset,
  nowIso = new Date().toISOString()
): {
  white_remaining_ms: number | null;
  black_remaining_ms: number | null;
  clock_turn_started_at: string | null;
} {
  if (preset.mode === "timed") {
    const initMs = Math.max(0, presetStorageInitialSec(preset)) * 1000;
    return {
      white_remaining_ms: initMs,
      black_remaining_ms: initMs,
      clock_turn_started_at: nowIso,
    };
  }
  if (preset.mode === "correspondence") {
    return {
      white_remaining_ms: null,
      black_remaining_ms: null,
      clock_turn_started_at: nowIso,
    };
  }
  return {
    white_remaining_ms: null,
    black_remaining_ms: null,
    clock_turn_started_at: null,
  };
}
