import type { PvpGameRow } from "@/lib/pvp-chess";

export const MAX_PVP_DRAW_OFFERS_PER_PLAYER = 3;

export function pvpDrawOffersCountForUser(game: PvpGameRow, userId: string): number {
  if (game.white_user_id === userId) {
    return Math.max(0, Number(game.white_draw_offers_count ?? 0));
  }
  if (game.black_user_id === userId) {
    return Math.max(0, Number(game.black_draw_offers_count ?? 0));
  }
  return 0;
}

export function pvpDrawOffersRemaining(game: PvpGameRow, userId: string): number {
  return Math.max(
    0,
    MAX_PVP_DRAW_OFFERS_PER_PLAYER - pvpDrawOffersCountForUser(game, userId)
  );
}

export function canUserOfferPvpDraw(game: PvpGameRow, userId: string): boolean {
  if (game.draw_offered_by === userId) return true;
  return pvpDrawOffersRemaining(game, userId) > 0;
}
