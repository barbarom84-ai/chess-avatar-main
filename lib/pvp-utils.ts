import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";

export function fallbackPlayerLabel(userId: string) {
  return `Player ${userId.replace(/-/g, "").slice(0, 8)}`;
}

export function whiteBlackDisplayNames(g: PvpGameRow) {
  const white =
    g.white_display_name?.trim() || fallbackPlayerLabel(g.white_user_id);
  const black = g.black_user_id
    ? g.black_display_name?.trim() || fallbackPlayerLabel(g.black_user_id)
    : "…";
  return { white, black };
}

/** The game's stored name wins over `profileName`: the public profile API answers "Player" for accounts without a profile row. */
export function opponentFromGame(
  g: PvpGameRow,
  myUserId: string | null,
  profileName?: string | null
) {
  if (!myUserId || !g.black_user_id) return null;
  const imWhite = g.white_user_id === myUserId;
  const oppId = imWhite ? g.black_user_id : g.white_user_id;
  const gameName = imWhite ? g.black_display_name : g.white_display_name;
  const oppLabel = gameName?.trim() || profileName?.trim() || fallbackPlayerLabel(oppId);
  const oppColor: "white" | "black" = imWhite ? "black" : "white";
  return { oppId, oppLabel, oppColor };
}

/**
 * Length of a finished game from server timestamps, so it survives page reloads and navigation.
 * Starts when White began thinking about the first move; ends at the game's last update (the result).
 */
export function pvpGameDurationSec(
  g: Pick<PvpGameRow, "status" | "created_at" | "updated_at">,
  moves: Pick<PvpMoveRow, "ply" | "created_at" | "time_spent_ms">[]
): number | null {
  if (g.status !== "finished") return null;
  const end = Date.parse(g.updated_at);
  const first = moves.find((m) => m.ply === 1);
  const start = first
    ? Date.parse(first.created_at) - Math.max(0, first.time_spent_ms ?? 0)
    : Date.parse(g.created_at);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.max(0, Math.round((end - start) / 1000));
}

export function pvpResultForPlayer(
  result: string | null,
  role: "white" | "black" | null
): "win" | "loss" | "draw" {
  if (!result || !role) return "draw";
  if (result === "1/2-1/2") return "draw";
  if (result === "1-0") return role === "white" ? "win" : "loss";
  if (result === "0-1") return role === "black" ? "win" : "loss";
  return "draw";
}
