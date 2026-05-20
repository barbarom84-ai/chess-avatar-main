/** Cadences PvP (stockage en base + création de partie). */

export type PvpClockMode = "unlimited" | "timed";

export interface PvpTimePreset {
  id: string;
  mode: PvpClockMode;
  /** Secondes initiales par joueur (ignoré si unlimited). */
  initialSec: number;
  /** Incrément Fischer en secondes. */
  incrementSec: number;
}

export const PVP_TIME_PRESETS: readonly PvpTimePreset[] = [
  { id: "unlimited", mode: "unlimited", initialSec: 0, incrementSec: 0 },
  { id: "bullet_2_1", mode: "timed", initialSec: 120, incrementSec: 1 },
  { id: "blitz_3_0", mode: "timed", initialSec: 180, incrementSec: 0 },
  { id: "blitz_3_2", mode: "timed", initialSec: 180, incrementSec: 2 },
  { id: "blitz_5_0", mode: "timed", initialSec: 300, incrementSec: 0 },
  { id: "blitz_5_3", mode: "timed", initialSec: 300, incrementSec: 3 },
  { id: "blitz_10_0", mode: "timed", initialSec: 600, incrementSec: 0 },
  { id: "rapid_15_10", mode: "timed", initialSec: 900, incrementSec: 10 },
  { id: "classical_30_0", mode: "timed", initialSec: 1800, incrementSec: 0 },
] as const;

const PRESET_BY_ID = new Map(PVP_TIME_PRESETS.map((p) => [p.id, p]));

export function resolvePvpTimePreset(id: string | undefined | null): PvpTimePreset {
  if (!id) return PVP_TIME_PRESETS[0];
  return PRESET_BY_ID.get(id) ?? PVP_TIME_PRESETS[0];
}

export function isValidPvpTimePresetId(id: string): boolean {
  return PRESET_BY_ID.has(id);
}
