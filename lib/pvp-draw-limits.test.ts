import { describe, expect, it } from "vitest";
import type { PvpGameRow } from "@/lib/pvp-chess";
import {
  canUserOfferPvpDraw,
  MAX_PVP_DRAW_OFFERS_PER_PLAYER,
  pvpDrawOffersRemaining,
} from "@/lib/pvp-draw-limits";

function game(partial: Partial<PvpGameRow> = {}): PvpGameRow {
  return {
    id: "g1",
    white_user_id: "w",
    black_user_id: "b",
    white_draw_offers_count: 0,
    black_draw_offers_count: 0,
    draw_offered_by: null,
    ...partial,
  } as PvpGameRow;
}

describe("pvp draw offer limits", () => {
  it("allows up to three offers per player", () => {
    const g = game({ white_draw_offers_count: MAX_PVP_DRAW_OFFERS_PER_PLAYER });
    expect(canUserOfferPvpDraw(g, "w")).toBe(false);
    expect(pvpDrawOffersRemaining(g, "w")).toBe(0);
  });

  it("allows cancel while an offer is pending", () => {
    const g = game({
      white_draw_offers_count: MAX_PVP_DRAW_OFFERS_PER_PLAYER,
      draw_offered_by: "w",
    });
    expect(canUserOfferPvpDraw(g, "w")).toBe(true);
  });
});
