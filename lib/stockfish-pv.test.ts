import { describe, expect, it } from "vitest";
import { parseStockfishPvInfoLine } from "@/lib/stockfish-client";
import { uciPvToSan } from "@/lib/continuous-analysis-utils";
import { snapshotToEngineLines } from "@/hooks/usePositionTopLines";

describe("parseStockfishPvInfoLine", () => {
  it("reads MultiPV score and UCI principal variation", () => {
    const parsed = parseStockfishPvInfoLine(
      "info depth 10 seldepth 14 multipv 2 score cp 28 nodes 1200 nps 10000 pv d2d4 g8f6 c2c4"
    );
    expect(parsed).toMatchObject({
      depth: 10,
      multipv: 2,
      evalPawns: 0.28,
      isMate: false,
      pvUci: ["d2d4", "g8f6", "c2c4"],
    });
  });

  it("defaults multipv to 1 when the token is omitted", () => {
    expect(
      parseStockfishPvInfoLine("info depth 10 score cp 32 pv e2e4 e7e5")
    ).toMatchObject({
      depth: 10,
      multipv: 1,
      evalPawns: 0.32,
      pvUci: ["e2e4", "e7e5"],
    });
  });
});

describe("snapshotToEngineLines", () => {
  const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  it("converts a legal PV to SAN with White POV eval", () => {
    const lines = snapshotToEngineLines(start, {
      evalPawns: 0.32,
      depth: 10,
      lines: [
        {
          multipv: 1,
          evalPawns: 0.32,
          depth: 10,
          pvUci: ["g1f3", "b8c6"],
        },
      ],
    });
    expect(lines).toEqual([
      {
        rank: 1,
        san: "Nf3",
        uci: "g1f3",
        pvSan: ["Nf3", "Nc6"],
        evalWhitePov: 0.32,
        isMate: undefined,
        mateInMovesWhite: undefined,
      },
    ]);
    expect(uciPvToSan(start, ["g1f3"])).toEqual(["Nf3"]);
  });
});
