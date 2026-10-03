import { describe, expect, it } from "vitest";
import {
  estimatedEloFromAccuracy,
  estimatedGameElos,
  winnerFromPlayerResult,
} from "@/lib/game-result-elo";

describe("estimatedEloFromAccuracy", () => {
  it("maps mid-70% accuracy to club level, not 3000+", () => {
    const elo = estimatedEloFromAccuracy(72.5);
    expect(elo).toBeGreaterThanOrEqual(1400);
    expect(elo).toBeLessThanOrEqual(1600);
    expect(elo).toBe(1450);
  });

  it("ranks higher accuracy as a higher rating", () => {
    expect(estimatedEloFromAccuracy(91.8)).toBeGreaterThan(
      estimatedEloFromAccuracy(72.5)
    );
    expect(estimatedEloFromAccuracy(91.8)).toBeGreaterThanOrEqual(2200);
    expect(estimatedEloFromAccuracy(91.8)).toBeLessThan(2500);
  });

  it("does not treat 72.5% as a 3200 performance", () => {
    expect(estimatedEloFromAccuracy(72.5)).toBeLessThan(2000);
  });
});

describe("estimatedGameElos", () => {
  it("keeps a loss with 72.5% far below the opponent-minus-200 GM trick", () => {
    const { eloWhite, eloBlack } = estimatedGameElos({
      accuracyWhite: 72.5,
      accuracyBlack: 91.8,
      winner: "black",
    });
    expect(eloWhite).toBe(1400);
    expect(eloBlack).toBeGreaterThan(eloWhite!);
    expect(eloWhite).toBeLessThan(2000);
    expect(eloBlack).toBeLessThan(2600);
  });

  it("does not assign the human GM Elo for losing to a 2700+ bot", () => {
    const humanLostAsWhite = estimatedGameElos({
      accuracyWhite: 72.5,
      accuracyBlack: 88,
      winner: "black",
    });
    expect(humanLostAsWhite.eloWhite).toBeLessThan(1800);
  });

  it("leaves Elo empty until accuracy exists", () => {
    expect(
      estimatedGameElos({
        accuracyWhite: null,
        accuracyBlack: null,
        winner: "draw",
      })
    ).toEqual({ eloWhite: null, eloBlack: null });
  });

  it("maps player result to the winning side", () => {
    expect(winnerFromPlayerResult("white", "loss")).toBe("black");
    expect(winnerFromPlayerResult("black", "win")).toBe("black");
    expect(winnerFromPlayerResult("white", "draw")).toBe("draw");
  });
});
