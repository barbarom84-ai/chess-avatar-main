import { describe, expect, it } from "vitest";
import {
  createBestMoveAndEvalCollector,
  parseStockfishPvInfoLine,
} from "@/lib/stockfish-client";
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

describe("createBestMoveAndEvalCollector", () => {
  function run(lines: string[]) {
    const collect = createBestMoveAndEvalCollector();
    let result: ReturnType<typeof collect>;
    for (const line of lines) result = collect(line);
    return result;
  }

  it("keeps line 1 as the main eval and exposes line 2 under MultiPV 2", () => {
    const result = run([
      "info depth 12 multipv 1 score cp 45 nodes 1 pv e2e4 e7e5",
      "info depth 12 multipv 2 score cp -120 nodes 1 pv a2a4 e7e5",
      "bestmove e2e4 ponder e7e5",
    ]);
    expect(result).toEqual({
      move: "e2e4",
      evalPawns: 0.45,
      isMate: undefined,
      mateInMoves: undefined,
      second: {
        move: "a2a4",
        evalPawns: -1.2,
        isMate: undefined,
        mateInMoves: undefined,
      },
    });
  });

  it("omits the second line when Stockfish only reports one", () => {
    const result = run([
      "info depth 10 score cp 20 pv g1f3",
      "bestmove g1f3",
    ]);
    expect(result?.evalPawns).toBe(0.2);
    expect(result?.second).toBeUndefined();
  });

  it("reads mate scores per line", () => {
    const result = run([
      "info depth 8 multipv 1 score mate 2 pv d1h5 g7g6",
      "info depth 8 multipv 2 score cp 30 pv g1f3",
      "bestmove d1h5",
    ]);
    expect(result).toMatchObject({
      evalPawns: 10,
      isMate: true,
      mateInMoves: 2,
      second: { move: "g1f3", evalPawns: 0.3 },
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
