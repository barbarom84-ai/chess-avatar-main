import { describe, expect, it } from "vitest";
import {
  PLAYOFF_SERIES_MAX_GAMES,
  bracketFromSeedKeys,
  createPlayoffBracket,
  getNextReadyMatch,
  parseStoredBracket,
  playoffSeriesGame,
  recordMatchResult,
  resolveMatchSideKeys,
  resolvePlayoffSeriesGame,
  roundLabel,
  runPlayoffSeries,
  seedKeysByElo,
  seedKeysRandom,
  serializeBracket,
  setSeed,
  type PlayoffBracketState,
  type PlayoffGameWinner,
} from "./arena-playoff-bracket";
import { testOption } from "./arena-test-fixtures";

const keys8 = ["a", "b", "c", "d", "e", "f", "g", "h"];

function playAll(state: PlayoffBracketState, pickA = true): PlayoffBracketState {
  let s = state;
  for (let guard = 0; guard < 16; guard++) {
    const next = getNextReadyMatch(s);
    if (!next) break;
    const { keyA, keyB } = resolveMatchSideKeys(next, s);
    s = recordMatchResult(s, next.id, (pickA ? keyA : keyB)!, "note");
  }
  return s;
}

describe("bracket structure", () => {
  it("builds 7 matches over 3 rounds for 8 players", () => {
    const b = createPlayoffBracket(8);
    expect(b.matches).toHaveLength(7);
    expect(new Set(b.matches.map((m) => m.round))).toEqual(new Set([0, 1, 2]));
    expect(b.matches.every((m) => m.status === "waiting")).toBe(true);
  });

  it("builds 3 matches over 2 rounds for 4 players", () => {
    const b = createPlayoffBracket(4);
    expect(b.matches).toHaveLength(3);
  });

  it("marks first-round matches ready once both seeds are set", () => {
    let b = createPlayoffBracket(4);
    b = setSeed(b, 0, "a");
    expect(b.matches[0].status).toBe("waiting");
    b = setSeed(b, 1, "b");
    expect(b.matches[0].status).toBe("ready");
  });

  it("propagates winners and crowns a champion (8 players)", () => {
    const done = playAll(bracketFromSeedKeys(8, keys8));
    expect(done.matches.every((m) => m.status === "done")).toBe(true);
    expect(done.championKey).toBe("a");
  });

  it("crowns the lower-slot player when B always wins (4 players)", () => {
    const done = playAll(bracketFromSeedKeys(4, ["a", "b", "c", "d"]), false);
    expect(done.championKey).toBe("d");
  });
});

describe("setSeed", () => {
  it("moves a player instead of duplicating it", () => {
    let b = bracketFromSeedKeys(4, ["a", "b", "c", "d"]);
    b = setSeed(b, 3, "a");
    expect(b.seeds).toEqual([null, "b", "c", "a"]);
  });

  it("clears played results when a seed changes", () => {
    let b = bracketFromSeedKeys(4, ["a", "b", "c", "d"]);
    b = recordMatchResult(b, "r0-m0", "a");
    b = setSeed(b, 3, "e");
    expect(b.matches.every((m) => m.status !== "done")).toBe(true);
    expect(b.championKey).toBeNull();
  });

  it("ignores out-of-range slots", () => {
    const b = createPlayoffBracket(4);
    expect(setSeed(b, 9, "a")).toBe(b);
  });
});

describe("seeding", () => {
  const pool = [
    testOption("p1500", { elo: 1500 }),
    testOption("p2400", { elo: 2400 }),
    testOption("p1800", { elo: 1800 }),
    testOption("p2100", { elo: 2100 }),
    testOption("p1200", { elo: 1200 }),
    testOption("p2700", { elo: 2700 }),
    testOption("p1000", { elo: 1000 }),
    testOption("p2000", { elo: 2000 }),
  ];

  it("pairs 1v8, 4v5, 2v7, 3v6 by Elo", () => {
    expect(seedKeysByElo(pool, 8)).toEqual([
      "p2700", "p1000",
      "p2000", "p1800",
      "p2400", "p1200",
      "p2100", "p1500",
    ]);
  });

  it("pairs 1v4, 2v3 for 4 players", () => {
    expect(seedKeysByElo(pool, 4)).toEqual(["p2700", "p2000", "p2400", "p2100"]);
  });

  it("returns null when the pool is too small", () => {
    expect(seedKeysByElo(pool.slice(0, 3), 4)).toBeNull();
    expect(seedKeysRandom(pool.slice(0, 7), 8)).toBeNull();
  });

  it("random seeding yields distinct keys and is deterministic with a seeded rng", () => {
    let x = 42;
    const rng = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    const a = seedKeysRandom(pool, 8, rng)!;
    expect(new Set(a).size).toBe(8);
    x = 42;
    expect(seedKeysRandom(pool, 8, rng)).toEqual(a);
  });
});

describe("tiebreak series", () => {
  it("alternates colors, then gives the higher seed Black in Armageddon", () => {
    expect(playoffSeriesGame(0, "A", "B")).toMatchObject({ whiteKey: "A", blackKey: "B", armageddon: false });
    expect(playoffSeriesGame(1, "A", "B")).toMatchObject({ whiteKey: "B", blackKey: "A", armageddon: false });
    expect(playoffSeriesGame(2, "A", "B")).toMatchObject({ whiteKey: "B", blackKey: "A", armageddon: true });
  });

  it("only an Armageddon draw produces a winner", () => {
    expect(resolvePlayoffSeriesGame(playoffSeriesGame(0, "A", "B"), "draw")).toBeNull();
    expect(resolvePlayoffSeriesGame(playoffSeriesGame(2, "A", "B"), "draw")).toBe("A");
    expect(resolvePlayoffSeriesGame(playoffSeriesGame(1, "A", "B"), "white")).toBe("B");
  });

  it("stops at the first decisive game", async () => {
    const played: number[] = [];
    const r = await runPlayoffSeries("A", "B", async (g) => {
      played.push(g.index);
      return { winner: g.index === 1 ? "black" : "draw", note: `g${g.index}` };
    });
    expect(played).toEqual([0, 1]);
    expect(r).toEqual({ winnerKey: "A", note: "g1", games: 2, decidedByArmageddonDraw: false });
  });

  it("always ends with a winner after repeated draws", async () => {
    const r = await runPlayoffSeries("A", "B", async () => ({ winner: "draw" as PlayoffGameWinner, note: "=" }));
    expect(r?.games).toBe(PLAYOFF_SERIES_MAX_GAMES);
    expect(r?.winnerKey).toBe("A");
    expect(r?.decidedByArmageddonDraw).toBe(true);
  });

  it("aborts when a game is interrupted", async () => {
    const r = await runPlayoffSeries("A", "B", async (g) =>
      g.index === 0 ? { winner: "draw", note: "" } : null
    );
    expect(r).toBeNull();
  });
});

describe("persistence", () => {
  const valid = new Set(keys8);

  it("round-trips seeds and results", () => {
    let b = bracketFromSeedKeys(8, keys8);
    b = recordMatchResult(b, "r0-m0", "b", "Mat");
    b = recordMatchResult(b, "r0-m1", "c", "Temps");
    b = recordMatchResult(b, "r1-m0", "c", "Nulle puis Armageddon");
    const restored = parseStoredBracket(serializeBracket(b), valid)!;
    expect(restored.seeds).toEqual(b.seeds);
    expect(restored.matches.find((m) => m.id === "r1-m0")).toMatchObject({
      status: "done",
      winnerKey: "c",
      lastOutcome: "Nulle puis Armageddon",
    });
    expect(restored.matches.find((m) => m.id === "r0-m2")?.status).toBe("ready");
  });

  it("restores the champion of a finished bracket", () => {
    const done = playAll(bracketFromSeedKeys(4, ["a", "b", "c", "d"]));
    expect(parseStoredBracket(serializeBracket(done), valid)?.championKey).toBe("a");
  });

  it("rejects corrupt data and unknown players", () => {
    expect(parseStoredBracket(null, valid)).toBeNull();
    expect(parseStoredBracket("{oops", valid)).toBeNull();
    expect(parseStoredBracket("null", valid)).toBeNull();
    expect(parseStoredBracket(JSON.stringify({ size: 6, seeds: [] }), valid)).toBeNull();
    const b = bracketFromSeedKeys(4, ["a", "b", "c", "zz"]);
    expect(parseStoredBracket(serializeBracket(b), valid)).toBeNull();
  });

  it("ignores results whose winner did not play the match", () => {
    const raw = JSON.stringify({
      size: 4,
      seeds: ["a", "b", "c", "d"],
      results: [{ id: "r0-m0", winnerKey: "c" }],
    });
    expect(parseStoredBracket(raw, valid)?.matches[0].status).toBe("ready");
  });
});

describe("roundLabel", () => {
  const labels = { final: "F", semi: "S", quarter: "Q" };
  it("names rounds from the end of the bracket", () => {
    expect(roundLabel(0, 8, labels)).toBe("Q");
    expect(roundLabel(1, 8, labels)).toBe("S");
    expect(roundLabel(2, 8, labels)).toBe("F");
    expect(roundLabel(0, 4, labels)).toBe("S");
    expect(roundLabel(1, 4, labels)).toBe("F");
    expect(roundLabel(0, 16, { ...labels, round16: "R16" })).toBe("R16");
    expect(roundLabel(1, 16, labels)).toBe("Q");
  });
});

describe("16-player bracket", () => {
  const keys16 = Array.from({ length: 16 }, (_, i) => `k${i + 1}`);

  it("builds 15 matches over 4 rounds and crowns a champion", () => {
    const b = createPlayoffBracket(16);
    expect(b.matches).toHaveLength(15);
    expect(new Set(b.matches.map((m) => m.round))).toEqual(new Set([0, 1, 2, 3]));
    let s = bracketFromSeedKeys(16, keys16);
    for (let guard = 0; guard < 20; guard++) {
      const next = getNextReadyMatch(s);
      if (!next) break;
      s = recordMatchResult(s, next.id, resolveMatchSideKeys(next, s).keyA!, "note");
    }
    expect(s.championKey).toBe("k1");
  });

  it("seeds 1 vs 16 and keeps seeds 1 and 2 in opposite halves", () => {
    const pool = keys16.map((k, i) => testOption(k, { elo: 2400 - i * 50 }));
    const slots = seedKeysByElo(pool, 16)!;
    expect(slots.slice(0, 2)).toEqual(["k1", "k16"]);
    expect(slots.indexOf("k1")).toBeLessThan(8);
    expect(slots.indexOf("k2")).toBeGreaterThanOrEqual(8);
  });

  it("restores a stored 16-player bracket", () => {
    const s = bracketFromSeedKeys(16, keys16);
    const restored = parseStoredBracket(serializeBracket(s), new Set(keys16));
    expect(restored?.size).toBe(16);
    expect(restored?.seeds).toEqual(keys16);
  });
});
