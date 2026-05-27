import { describe, expect, it } from "vitest";
import {
  normalizeLichessPuzzlePayload,
  parseLichessPuzzleResponse,
} from "./lichess-puzzle";

const VALID = {
  game: {
    id: "abc",
    pgn: "1. e4 e5 2. Nf3 *",
    players: [
      { color: "white", name: "Alice", rating: 1800 },
      { color: "black", name: "Bob", rating: 1750 },
    ],
  },
  puzzle: {
    id: "puz1",
    initialPly: 2,
    rating: 1500,
    plays: 100,
    solution: ["e7e5"],
    themes: ["mate"],
    fen: "rnbqkbnr/pppp1ppp/8/4p4/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
  },
};

describe("normalizeLichessPuzzlePayload", () => {
  it("parses a valid daily payload", () => {
    const p = normalizeLichessPuzzlePayload(VALID);
    expect(p).not.toBeNull();
    expect(p?.puzzleId).toBe("puz1");
    expect(p?.solutionUci).toEqual(["e7e5"]);
    expect(p?.players.length).toBe(2);
  });

  it("rejects malformed payloads", () => {
    expect(normalizeLichessPuzzlePayload(null)).toBeNull();
    expect(normalizeLichessPuzzlePayload({})).toBeNull();
    expect(
      normalizeLichessPuzzlePayload({
        ...VALID,
        puzzle: { ...VALID.puzzle, solution: [] },
      })
    ).toBeNull();
  });

  it("accepts already-normalized API responses", () => {
    const normalized = normalizeLichessPuzzlePayload(VALID);
    expect(normalized).not.toBeNull();
    expect(parseLichessPuzzleResponse(normalized)).toEqual(normalized);
    expect(parseLichessPuzzleResponse(VALID)).toEqual(normalized);
  });
});
