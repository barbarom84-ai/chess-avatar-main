import { describe, expect, it } from "vitest";
import type { ReviewedMove } from "@/lib/game-review";
import {
  brilliantMoveToCampaignRow,
  brilliantPuzzleSlug,
  collectBrilliantCandidates,
  playerSideFromUsernames,
  slugifyFragment,
} from "@/lib/ascension/brilliant-import";

function reviewed(
  overrides: Partial<ReviewedMove> & Pick<ReviewedMove, "ply" | "uci" | "sideToMove" | "classification">
): ReviewedMove {
  return {
    san: "Nxf7",
    evalBefore: 0,
    bestMove: overrides.uci,
    bestSan: "Nxf7",
    bestEval: 1,
    playerEval: 1,
    cpl: 0,
    ...overrides,
  };
}

describe("slugifyFragment", () => {
  it("normalizes to slug-safe lowercase", () => {
    expect(slugifyFragment(" FondueMan ")).toBe("fondueman");
    expect(slugifyFragment("Game UUID!!")).toBe("game-uuid");
  });
});

describe("brilliantPuzzleSlug", () => {
  it("is stable and prefixed", () => {
    expect(brilliantPuzzleSlug("FondueMan", "abc-123", 14)).toBe(
      "chesscom-fondueman-abc-123-p14"
    );
  });

  it("clamps negative ply", () => {
    expect(brilliantPuzzleSlug("x", "g", -3)).toBe("chesscom-x-g-p0");
  });
});

describe("playerSideFromUsernames", () => {
  it("matches white or black case-insensitively", () => {
    expect(playerSideFromUsernames("FondueMan", "fondueman", "Other")).toBe("white");
    expect(playerSideFromUsernames("FondueMan", "Other", "FONDUEMAN")).toBe("black");
  });

  it("returns null when username is not in the game", () => {
    expect(playerSideFromUsernames("FondueMan", "A", "B")).toBeNull();
  });
});

describe("collectBrilliantCandidates", () => {
  it("keeps only brilliant plies for the player side", () => {
    const fenBefore = [
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    ];
    const moves = [
      reviewed({
        ply: 0,
        uci: "e2e4",
        sideToMove: "white",
        classification: "best",
      }),
      reviewed({
        ply: 1,
        uci: "e7e5",
        sideToMove: "black",
        classification: "brilliant",
        san: "e5",
      }),
      reviewed({
        ply: 2,
        uci: "g1f3",
        sideToMove: "white",
        classification: "brilliant",
        san: "Nf3",
      }),
    ];

    const white = collectBrilliantCandidates(moves, fenBefore, "white");
    expect(white).toHaveLength(1);
    expect(white[0]).toMatchObject({
      ply: 2,
      uci: "g1f3",
      fen: fenBefore[2],
    });

    const black = collectBrilliantCandidates(moves, fenBefore, "black");
    expect(black).toHaveLength(1);
    expect(black[0]?.uci).toBe("e7e5");
  });

  it("skips book moves even if marked brilliant", () => {
    const fenBefore = ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"];
    const moves = [
      reviewed({
        ply: 0,
        uci: "e2e4",
        sideToMove: "white",
        classification: "brilliant",
        isBook: true,
      }),
    ];
    expect(collectBrilliantCandidates(moves, fenBefore, "white")).toHaveLength(0);
  });
});

describe("brilliantMoveToCampaignRow", () => {
  it("builds a standard published row with stable slug", () => {
    const fen =
      "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4";
    const row = brilliantMoveToCampaignRow({
      fen,
      uci: "H5F7",
      gameId: "game-1",
      ply: 9,
      username: "FondueMan",
      track: "brilliant",
      sortOrder: 3,
      gameUrl: "https://www.chess.com/game/live/123",
    });

    expect(row.slug).toBe("chesscom-fondueman-game-1-p9");
    expect(row.kind).toBe("standard");
    expect(row.track).toBe("brilliant");
    expect(row.fen).toBe(fen);
    expect(row.solution_ucis).toEqual(["h5f7"]);
    expect(row.sort_order).toBe(3);
    expect(row.is_published).toBe(true);
    expect(row.prompt.fr).toMatch(/brillant/i);
    expect(row.insight.en).toContain("FondueMan");
    expect(row.insight.en).toContain("chess.com/game/live/123");
  });
});
