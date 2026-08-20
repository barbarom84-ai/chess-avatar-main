import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";

const STORAGE_KEY = "chess-avatar.pvp.bootstrap";
const MAX_AGE_MS = 120_000;

export type PvpGameBootstrap = {
  gameId: string;
  game: PvpGameRow;
  role: "white" | "black";
  moves?: PvpMoveRow[];
  at: number;
};

export function writePvpGameBootstrap(payload: PvpGameBootstrap): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readPvpGameBootstrap(gameId: string): PvpGameBootstrap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PvpGameBootstrap;
    if (data.gameId !== gameId) return null;
    if (!data.game || !data.role) return null;
    if (Date.now() - data.at > MAX_AGE_MS) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearPvpGameBootstrap(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function consumePvpGameBootstrap(gameId: string): PvpGameBootstrap | null {
  const seed = readPvpGameBootstrap(gameId);
  if (seed) clearPvpGameBootstrap();
  return seed;
}
