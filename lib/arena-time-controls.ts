import {
  PVP_TIME_PRESETS,
  resolvePvpTimePreset,
  type PvpTimePreset,
} from "@/lib/pvp-time-controls";

/** Cadence par défaut de l’arène (blitz 3+0). */
export const ARENA_DEFAULT_TIME_PRESET_ID = "blitz_3_0";

export const ARENA_TIME_PRESET_STORAGE = "chess-arena.timePresetId";

/** Bullet 1+0 — arène uniquement (absent du PvP). */
const ARENA_BULLET_1_0: PvpTimePreset = {
  id: "bullet_1_0",
  mode: "timed",
  initialSec: 60,
  incrementSec: 0,
};

/** Cadences disponibles en arène (sans illimitée). */
export const ARENA_TIME_PRESETS: readonly PvpTimePreset[] = [
  ARENA_BULLET_1_0,
  ...PVP_TIME_PRESETS.filter((p) => p.mode === "timed"),
] as const;

const PRESET_BY_ID = new Map(ARENA_TIME_PRESETS.map((p) => [p.id, p]));

export function resolveArenaTimePreset(
  id: string | null | undefined
): PvpTimePreset {
  const key = id?.trim() || ARENA_DEFAULT_TIME_PRESET_ID;
  const found = PRESET_BY_ID.get(key);
  if (found) return found;
  return PRESET_BY_ID.get(ARENA_DEFAULT_TIME_PRESET_ID)!;
}

export function isValidArenaTimePresetId(id: string): boolean {
  return PRESET_BY_ID.has(id);
}

export function getArenaInitialMs(
  preset: Pick<PvpTimePreset, "initialSec">
): number {
  return Math.max(0, preset.initialSec) * 1000;
}

export function getArenaIncrementMs(
  preset: Pick<PvpTimePreset, "incrementSec">
): number {
  return Math.max(0, preset.incrementSec) * 1000;
}

export type ArenaCadence = Pick<PvpTimePreset, "initialSec" | "incrementSec">;

export function cadenceFromPreset(preset: PvpTimePreset): ArenaCadence {
  return {
    initialSec: preset.initialSec,
    incrementSec: preset.incrementSec,
  };
}
