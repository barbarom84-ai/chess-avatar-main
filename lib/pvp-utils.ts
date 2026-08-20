import type { PvpGameRow } from "@/lib/pvp-chess";

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

export function opponentFromGame(g: PvpGameRow, myUserId: string | null) {
  if (!myUserId || !g.black_user_id) return null;
  const imWhite = g.white_user_id === myUserId;
  const oppId = imWhite ? g.black_user_id : g.white_user_id;
  const oppLabel = imWhite
    ? g.black_display_name?.trim() || fallbackPlayerLabel(oppId)
    : g.white_display_name?.trim() || fallbackPlayerLabel(oppId);
  const oppColor: "white" | "black" = imWhite ? "black" : "white";
  return { oppId, oppLabel, oppColor };
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
