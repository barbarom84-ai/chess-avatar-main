/**
 * Offline PvP move queue — stores moves locally when disconnected and replays on reconnect.
 */

const LS_KEY = "ca_pvp_pending_moves";

export interface PendingPvpMove {
  gameId: string;
  uci: string;
  clientTimestamp: number;
}

export function getPendingPvpMoves(gameId: string): PendingPvpMove[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as PendingPvpMove[];
    return all.filter((m) => m.gameId === gameId);
  } catch {
    return [];
  }
}

export function enqueuePendingPvpMove(gameId: string, uci: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as PendingPvpMove[];
    all.push({ gameId, uci, clientTimestamp: Date.now() });
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {
    /* quota */
  }
}

export function clearPendingPvpMoves(gameId: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as PendingPvpMove[];
    localStorage.setItem(
      LS_KEY,
      JSON.stringify(all.filter((m) => m.gameId !== gameId))
    );
  } catch {
    /* ignore */
  }
}

export async function replayPendingPvpMoves(
  gameId: string,
  submitMove: (uci: string) => Promise<boolean>
): Promise<number> {
  const pending = getPendingPvpMoves(gameId);
  let replayed = 0;
  for (const move of pending) {
    const ok = await submitMove(move.uci);
    if (ok) replayed += 1;
    else break;
  }
  if (replayed === pending.length) {
    clearPendingPvpMoves(gameId);
  }
  return replayed;
}
