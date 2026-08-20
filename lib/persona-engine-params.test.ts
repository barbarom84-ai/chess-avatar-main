import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { EngineConfig } from "./analysis";
import {
  countBotMovesPlayed,
  DEFAULT_HUMAN_BLUNDER_INTERVAL,
  pickForcedHumanBlunder,
  shouldPlayHumanBlunderMove,
} from "./bot-move-count";
import {
  arenaUciEloFromConfig,
  engineOptionsForArena,
  engineOptionsForConfig,
  javaStringHashCode,
  multiPvCountForArena,
  multiPvCountForDifficulty,
  pickPersonaBiasedMove,
  prepareArenaEngineConfig,
  skillLevelFromDifficulty,
  UCI_ELO_MAX,
  UCI_ELO_MIN,
  uciEloFromConfig,
} from "./persona-engine-params";

function fixture(overrides: Partial<EngineConfig> = {}): EngineConfig {
  return {
    name: "TestBot",
    elo: 1800,
    difficulty: 3,
    aggressiveness: 50,
    threads: 2,
    depth: 12,
    timeControl: 800,
    favoriteOpening: "italian-game",
    playStyle: "équilibré",
    openings: { "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1": "e7e5" },
    ...overrides,
  };
}

function seq(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)]!;
}

describe("persona engine params (aligned with Android)", () => {
  it("maps difficulty to Stockfish skill", () => {
    assert.equal(skillLevelFromDifficulty(1), 2);
    assert.equal(skillLevelFromDifficulty(2), 5);
    assert.equal(skillLevelFromDifficulty(3), 9);
    assert.equal(skillLevelFromDifficulty(4), 15);
    assert.equal(skillLevelFromDifficulty(5), 20);
  });

  it("clamps UCI Elo", () => {
    assert.equal(uciEloFromConfig(800), UCI_ELO_MIN);
    assert.equal(uciEloFromConfig(4000), UCI_ELO_MAX);
    assert.equal(uciEloFromConfig(2000), 2000);
  });

  it("matches Java String.hashCode for arena jitter", () => {
    assert.equal(javaStringHashCode(""), 0);
    assert.equal(javaStringHashCode("a"), 97);
    assert.equal(javaStringHashCode("Hi"), 2337);
  });

  it("compresses arena Elo so 3000+ profiles still differ", () => {
    const low = arenaUciEloFromConfig(fixture({ name: "A", elo: 2000, difficulty: 5, aggressiveness: 50 }));
    const mid = arenaUciEloFromConfig(fixture({ name: "A", elo: 3000, difficulty: 5, aggressiveness: 50 }));
    const high = arenaUciEloFromConfig(fixture({ name: "A", elo: 3500, difficulty: 5, aggressiveness: 50 }));
    assert.ok(low < mid);
    assert.ok(mid < high);
    assert.ok(high <= UCI_ELO_MAX);
    assert.ok(low >= UCI_ELO_MIN);
  });

  it("keeps MultiPV in arena even for strong bots", () => {
    assert.equal(multiPvCountForDifficulty(5), 1);
    assert.equal(multiPvCountForArena(fixture({ difficulty: 5, aggressiveness: 80 })), 3);
    assert.equal(multiPvCountForArena(fixture({ difficulty: 5, aggressiveness: 50 })), 2);
  });

  it("picks PV1 with a high rng roll", () => {
    const lines = new Map([
      [1, "e2e4"],
      [2, "d2d4"],
      [3, "c2c4"],
    ]);
    const move = pickPersonaBiasedMove("e2e4", lines, fixture({ difficulty: 1 }), seq([0.99]));
    assert.equal(move, "e2e4");
  });

  it("picks a weaker PV with a low rng roll at difficulty 1", () => {
    const lines = new Map([
      [1, "e2e4"],
      [2, "d2d4"],
      [3, "c2c4"],
      [4, "g1f3"],
    ]);
    const move = pickPersonaBiasedMove("e2e4", lines, fixture({ difficulty: 1, aggressiveness: 0 }), seq([0.0]));
    assert.equal(move, "g1f3");
  });

  it("lets strong arena bots leave PV1", () => {
    const lines = new Map([
      [1, "e2e4"],
      [2, "d2d4"],
      [3, "c2c4"],
    ]);
    const move = pickPersonaBiasedMove(
      "e2e4",
      lines,
      fixture({ difficulty: 5, aggressiveness: 80 }),
      seq([0.0]),
      true
    );
    assert.equal(move, "c2c4");
  });

  it("strips opening books for arena configs", () => {
    const prepared = prepareArenaEngineConfig(fixture());
    assert.deepEqual(prepared.openings, {});
    assert.equal(prepared.forcedLineWhite, undefined);
    assert.equal(prepared.humanBlunderInterval, DEFAULT_HUMAN_BLUNDER_INTERVAL);
  });

  it("builds arena engine options from compressed Elo", () => {
    const opts = engineOptionsForArena(fixture({ elo: 3200, difficulty: 5, aggressiveness: 90, depth: 20, timeControl: 4000 }));
    assert.equal(opts.skill, 18);
    assert.equal(opts.multiPv, 3);
    assert.equal(opts.depth, 16);
    assert.equal(opts.movetimeMs, 2500);
    assert.ok(opts.uciElo <= UCI_ELO_MAX);
  });

  it("keeps vs-human options on the difficulty curve", () => {
    const opts = engineOptionsForConfig(fixture({ difficulty: 2, elo: 1400 }));
    assert.equal(opts.skill, 5);
    assert.equal(opts.multiPv, 3);
  });
});

describe("human blunder interval", () => {
  it("counts bot plies", () => {
    assert.equal(countBotMovesPlayed(["e2e4", "e7e5", "g1f3"], true), 2);
    assert.equal(countBotMovesPlayed(["e2e4", "e7e5", "g1f3"], false), 1);
  });

  it("fires every N bot moves", () => {
    const hist = Array.from({ length: 18 }, (_, i) => (i % 2 === 0 ? "e2e4" : "e7e5"));
    assert.equal(shouldPlayHumanBlunderMove(hist, true, 10), true);
    assert.equal(shouldPlayHumanBlunderMove(hist.slice(0, 2), true, 10), false);
    assert.equal(shouldPlayHumanBlunderMove(hist, true, 0), false);
  });

  it("picks a non-best MultiPV line for forced blunders", () => {
    const lines = new Map([
      [1, "e2e4"],
      [2, "d2d4"],
    ]);
    assert.equal(pickForcedHumanBlunder("e2e4", lines, seq([0])), "d2d4");
  });
});
