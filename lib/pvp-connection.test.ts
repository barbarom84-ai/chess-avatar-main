import { describe, expect, it } from "vitest";
import { mergeOpponentLastSeen } from "@/lib/pvp-connection";
import { mapPvpErrorMessage } from "@/lib/pvp-errors";

describe("mergeOpponentLastSeen", () => {
  it("returns presence when moves unknown", () => {
    expect(mergeOpponentLastSeen(null, 1000)).toBe(1000);
  });

  it("returns moves when presence unknown", () => {
    expect(mergeOpponentLastSeen(500, null)).toBe(500);
  });

  it("picks the most recent signal", () => {
    expect(mergeOpponentLastSeen(500, 1200)).toBe(1200);
    expect(mergeOpponentLastSeen(900, 100)).toBe(900);
  });
});

describe("mapPvpErrorMessage", () => {
  const t = {
    notYourTurn: "Pas votre tour",
    rateLimited: "Trop de requêtes",
    generic: "Erreur",
  };

  it("maps known API errors", () => {
    expect(mapPvpErrorMessage("Not your turn", t)).toBe("Pas votre tour");
    expect(mapPvpErrorMessage("Too fast", t)).toBe("Trop de requêtes");
  });

  it("passes through short unknown messages", () => {
    expect(mapPvpErrorMessage("Custom short", t)).toBe("Custom short");
  });
});
