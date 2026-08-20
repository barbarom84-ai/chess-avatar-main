import { formatClockMs, formatCorrespondenceMs } from "@/lib/pvp-clock";
import type { PvpMoveRow } from "@/lib/pvp-chess";

/** Temps passé sur le coup en cours (ms), d'après l'horloge serveur. */
export function computeMoveTimeSpentMs(
  clockTurnStartedAt: string | null | undefined,
  nowMs: number
): number {
  const t0 = clockTurnStartedAt ? new Date(clockTurnStartedAt).getTime() : nowMs;
  return Math.max(0, nowMs - t0);
}

/** Temps affichable par ply (stocké serveur ou dérivé des horodatages). */
export function pvpMoveTimeMsByPly(
  moves: PvpMoveRow[],
  clockMode: string | null | undefined
): Map<number, number> {
  const out = new Map<number, number>();
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const stored = move.time_spent_ms;
    if (typeof stored === "number" && stored >= 0) {
      out.set(move.ply, stored);
      continue;
    }
    const cur = Date.parse(move.created_at);
    if (!Number.isFinite(cur)) continue;
    const prevTs =
      i > 0 ? Date.parse(moves[i - 1]!.created_at) : Number.NaN;
    if (Number.isFinite(prevTs)) {
      out.set(move.ply, Math.max(0, cur - prevTs));
    }
  }
  return out;
}

/** Libellé compact pour l'historique des coups PvP. */
export function formatPvpMoveListTimeMs(
  ms: number,
  clockMode: string | null | undefined,
  lang: "fr" | "en"
): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms === 0 && (clockMode === "unlimited" || !clockMode)) return "";

  if (clockMode === "correspondence") {
    return formatCorrespondenceMs(ms, lang);
  }

  if (ms < 10_000) {
    const sec = ms / 1000;
    return sec < 10 ? `${sec.toFixed(1)}s` : `${Math.round(sec)}s`;
  }
  if (ms < 60_000) {
    return `${Math.round(ms / 1000)}s`;
  }
  return formatClockMs(ms);
}
