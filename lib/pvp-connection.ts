export type PvpConnectionLevel = "excellent" | "good" | "fair" | "poor" | "offline";

export type PvpConnectionInfo = {
  level: PvpConnectionLevel;
  labelKey: "excellent" | "good" | "fair" | "poor" | "offline" | "syncing";
};

const STALE_MS = 15_000;
const FAIR_MS = 45_000;

export function localConnectionFromSignals(input: {
  online: boolean;
  realtimeSubscribed: boolean;
  lastEventAt: number | null;
  lastApiOkAt: number | null;
  nowMs?: number;
}): PvpConnectionInfo {
  const now = input.nowMs ?? Date.now();
  if (!input.online) {
    return { level: "offline", labelKey: "offline" };
  }
  if (!input.realtimeSubscribed) {
    return { level: "fair", labelKey: "syncing" };
  }
  const lastSignal = Math.max(input.lastEventAt ?? 0, input.lastApiOkAt ?? 0);
  if (lastSignal <= 0) {
    return { level: "good", labelKey: "good" };
  }
  const age = now - lastSignal;
  if (age <= STALE_MS) return { level: "excellent", labelKey: "excellent" };
  if (age <= FAIR_MS) return { level: "good", labelKey: "good" };
  return { level: "poor", labelKey: "poor" };
}

export function opponentConnectionFromLastSeen(
  lastSeenAt: number | null,
  nowMs = Date.now()
): PvpConnectionInfo {
  if (lastSeenAt == null) {
    return { level: "good", labelKey: "good" };
  }
  const age = nowMs - lastSeenAt;
  if (age <= STALE_MS) return { level: "excellent", labelKey: "excellent" };
  if (age <= FAIR_MS) return { level: "good", labelKey: "good" };
  if (age <= 120_000) return { level: "fair", labelKey: "fair" };
  return { level: "poor", labelKey: "poor" };
}

/** Combine activité jeu (coups) et présence temps réel. */
export function mergeOpponentLastSeen(
  fromMoves: number | null,
  fromPresence: number | null
): number | null {
  if (fromMoves == null) return fromPresence;
  if (fromPresence == null) return fromMoves;
  return Math.max(fromMoves, fromPresence);
}

export const PVP_CONNECTION_DOT_CLASS: Record<PvpConnectionLevel, string> = {
  excellent: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]",
  good: "bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.6)]",
  fair: "bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.5)]",
  poor: "bg-red-400 shadow-[0_0_5px_rgba(248,113,113,0.6)]",
  offline: "bg-slate-500",
};
