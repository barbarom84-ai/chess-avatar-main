import { describe, expect, it } from "vitest";
import { puzzleDifficultyFromElo } from "@/lib/ascension/difficulty";

describe("puzzleDifficultyFromElo", () => {
  it("maps low bands to easy", () => {
    expect(puzzleDifficultyFromElo(0, 800)).toBe("easy");
  });

  it("maps mid bands to medium", () => {
    expect(puzzleDifficultyFromElo(1000, 1400)).toBe("medium");
  });

  it("maps high bands to hard", () => {
    expect(puzzleDifficultyFromElo(1800, 2200)).toBe("hard");
  });
});
