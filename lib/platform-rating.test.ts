import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pickChessComPlatformRating, pickLichessPlatformRating } from "./platform-rating";

describe("platform rating pickers", () => {
  it("picks the Lichess pool with the most games", () => {
    const rating = pickLichessPlatformRating({
      bullet: { rating: 2200, games: 10 },
      blitz: { rating: 1800, games: 400 },
      rapid: { rating: 1900, games: 50 },
    });
    assert.equal(rating, 1800);
  });

  it("ignores missing Lichess payloads", () => {
    assert.equal(pickLichessPlatformRating(null), undefined);
    assert.equal(pickLichessPlatformRating({ puzzle: { rating: 2400, games: 9 } }), undefined);
  });

  it("picks the Chess.com pool with the most games", () => {
    const rating = pickChessComPlatformRating({
      chess_blitz: { last: { rating: 1600 }, record: { win: 10, loss: 10, draw: 0 } },
      chess_rapid: { last: { rating: 1750 }, record: { win: 80, loss: 70, draw: 10 } },
    });
    assert.equal(rating, 1750);
  });
});
