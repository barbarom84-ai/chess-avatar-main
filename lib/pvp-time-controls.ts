/** Cadences PvP (stockage en base + création de partie). */

export type PvpClockMode = "unlimited" | "timed" | "correspondence";

export interface PvpTimePreset {
  id: string;
  mode: PvpClockMode;
  /** Secondes initiales par joueur (cadences en direct). */
  initialSec: number;
  /** Incrément Fischer en secondes (cadences en direct). */
  incrementSec: number;
  /** Jours accordés pour jouer chaque coup (différé). */
  daysPerMove?: number;
}

/** @deprecated Anciennes parties sans limite — conservé pour l’affichage legacy. */
const LEGACY_UNLIMITED_PRESET: PvpTimePreset = {
  id: "unlimited",
  mode: "unlimited",
  initialSec: 0,
  incrementSec: 0,
};

export const PVP_TIME_PRESETS: readonly PvpTimePreset[] = [
  { id: "correspondence_1d", mode: "correspondence", initialSec: 0, incrementSec: 0, daysPerMove: 1 },
  { id: "correspondence_3d", mode: "correspondence", initialSec: 0, incrementSec: 0, daysPerMove: 3 },
  { id: "correspondence_7d", mode: "correspondence", initialSec: 0, incrementSec: 0, daysPerMove: 7 },
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

export const PVP_LIVE_PRESETS = PVP_TIME_PRESETS.filter((p) => p.mode === "timed");
export const PVP_CORRESPONDENCE_PRESETS = PVP_TIME_PRESETS.filter(
  (p) => p.mode === "correspondence"
);

export function resolvePvpTimePreset(id: string | undefined | null): PvpTimePreset {
  if (!id) return PVP_CORRESPONDENCE_PRESETS[1] ?? PVP_TIME_PRESETS[0];
  if (id === "unlimited") return LEGACY_UNLIMITED_PRESET;
  return PRESET_BY_ID.get(id) ?? PVP_CORRESPONDENCE_PRESETS[1] ?? PVP_TIME_PRESETS[0];
}

export function isValidPvpTimePresetId(id: string): boolean {
  return PRESET_BY_ID.has(id);
}

/** Secondes stockées en base pour une cadence (budget par coup en différé). */
export function presetStorageInitialSec(preset: PvpTimePreset): number {
  if (preset.mode === "timed") return preset.initialSec;
  if (preset.mode === "correspondence" && preset.daysPerMove) {
    return preset.daysPerMove * 86_400;
  }
  return 0;
}

export function correspondenceDaysFromGame(row: {
  clock_mode?: string | null;
  clock_initial_sec?: number | null;
  time_preset?: string | null;
}): number | null {
  if (row.clock_mode === "correspondence") {
    const sec = Number(row.clock_initial_sec ?? 0);
    if (sec > 0) return Math.round(sec / 86_400);
    const preset = resolvePvpTimePreset(row.time_preset);
    return preset.daysPerMove ?? null;
  }
  return null;
}

export function usesPvpMoveClock(clockMode: string | null | undefined): boolean {
  return clockMode === "timed" || clockMode === "correspondence";
}

/** Libellé court type Chess.com : 3+0, 5+3, 15+10 */
export function formatPvpTimedControlLabel(initialSec: number, incrementSec: number): string {
  const totalSec = Math.max(0, Number(initialSec) || 0);
  const inc = Math.max(0, Number(incrementSec) || 0);
  const mins = Math.floor(totalSec / 60);
  const remSec = totalSec % 60;
  const base =
    remSec === 0 ? String(mins) : `${mins}:${remSec.toString().padStart(2, "0")}`;
  return `${base}+${inc}`;
}

export function formatPvpGameTimeControlLabel(
  row: {
    clock_mode?: string | null;
    clock_initial_sec?: number | null;
    clock_increment_sec?: number | null;
    time_preset?: string | null;
  },
  presetLabels?: Record<string, string>
): string {
  if (row.clock_mode === "timed") {
    return formatPvpTimedControlLabel(
      Number(row.clock_initial_sec ?? 0),
      Number(row.clock_increment_sec ?? 0)
    );
  }
  if (row.clock_mode === "correspondence") {
    const days = correspondenceDaysFromGame(row);
    if (days != null) return `${days}d`;
    const preset = resolvePvpTimePreset(row.time_preset);
    if (preset.daysPerMove) return `${preset.daysPerMove}d`;
  }
  if (row.time_preset && presetLabels?.[row.time_preset]) {
    return presetLabels[row.time_preset];
  }
  return row.time_preset ?? "—";
}
