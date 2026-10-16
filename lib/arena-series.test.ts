import { describe, expect, it } from "vitest";
import {
  createArenaSeries,
  isSeriesClinched,
  isSeriesOver,
  recordSeriesGame,
  seriesGameAWhite,
  seriesScore,
  seriesWinner,
} from "./arena-series";

const whiteWins = { winner: "white", pgnResult: "1-0" } as const;
const blackWins = { winner: "black", pgnResult: "0-1" } as const;
const draw = { winner: "draw", pgnResult: "1/2-1/2" } as const;

describe("arena series", () => {
  it("alternates colors starting with avatar A as White", () => {
    expect([0, 1, 2, 3].map(seriesGameAWhite)).toEqual([true, false, true, false]);
  });

  it("attributes wins to the avatar, not the color", () => {
    let s = createArenaSeries(4);
    s = recordSeriesGame(s, whiteWins); // A white wins
    s = recordSeriesGame(s, whiteWins); // B white wins
    expect(s.games.map((g) => g.winner)).toEqual(["a", "b"]);
    expect(seriesScore(s)).toEqual({ a: 1, b: 1 });
  });

  it("counts draws as half points and ends a level match as a draw", () => {
    let s = createArenaSeries(2);
    s = recordSeriesGame(s, draw);
    s = recordSeriesGame(s, draw);
    expect(seriesScore(s)).toEqual({ a: 1, b: 1 });
    expect(isSeriesOver(s)).toBe(true);
    expect(seriesWinner(s)).toBe("draw");
  });

  it("stops once the match is clinched and ignores extra results", () => {
    let s = createArenaSeries(4);
    s = recordSeriesGame(s, whiteWins); // A
    s = recordSeriesGame(s, blackWins); // A (black)
    expect(isSeriesClinched(s)).toBe(false);
    s = recordSeriesGame(s, whiteWins); // A → 3/4
    expect(isSeriesClinched(s)).toBe(true);
    expect(seriesWinner(s)).toBe("a");
    expect(recordSeriesGame(s, blackWins)).toBe(s);
  });

  it("a single game series ends after one game", () => {
    const s = recordSeriesGame(createArenaSeries(1), blackWins);
    expect(isSeriesOver(s)).toBe(true);
    expect(seriesWinner(s)).toBe("b");
  });
});
