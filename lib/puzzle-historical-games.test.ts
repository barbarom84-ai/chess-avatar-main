import { describe, expect, it } from "vitest";
import { filterGamesWithChallenges } from "./puzzle-historical-games";
import type { HistoricalGame, MoveChallenge } from "./opening-lessons";

function challenge(id: string): MoveChallenge {
  return {
    id,
    afterMoveCount: 2,
    correctUci: "e2e4",
    wrongChoices: ["d2d4", "c2c4", "g1f3"],
    prompt: { fr: "Trouvez le coup", en: "Find the move" },
    insight: { fr: "Bon", en: "Good" },
    hints: [],
  };
}

function game(
  id: string,
  challenges?: MoveChallenge[]
): HistoricalGame {
  return {
    id,
    white: "A",
    black: "B",
    result: "1-0",
    date: "1851",
    event: { fr: "Londres", en: "London" },
    uciMoves: ["e2e4", "e7e5"],
    annotations: [],
    challenges,
  };
}

describe("filterGamesWithChallenges", () => {
  it("keeps only games with at least one challenge", () => {
    const input = [
      game("with-one", [challenge("c1")]),
      game("empty", []),
      game("missing"),
      game("with-two", [challenge("c2"), challenge("c3")]),
    ];
    const out = filterGamesWithChallenges(input);
    expect(out.map((g) => g.id)).toEqual(["with-one", "with-two"]);
  });

  it("preserves challenge ids for one-at-a-time selection", () => {
    const out = filterGamesWithChallenges([
      game("g1", [challenge("a"), challenge("b")]),
    ]);
    expect(out[0]?.challenges?.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("returns an empty list when the catalog has no quizzes", () => {
    expect(filterGamesWithChallenges([game("x"), game("y", [])])).toEqual([]);
  });
});
