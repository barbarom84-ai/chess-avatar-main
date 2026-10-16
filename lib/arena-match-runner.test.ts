import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  playArenaMatch,
  playArenaPly,
  type ArenaEngineDeps,
  type ArenaMatchSettings,
} from "./arena-match-runner";
import { replayUci } from "./arena-chess";
import { buildArenaPgn } from "./arena-pgn";
import { createPlayoffClock } from "./arena-playoff-clock";
import {
  bracketFromSeedKeys,
  getNextReadyMatch,
  recordMatchResult,
  resolveMatchSideKeys,
  runPlayoffSeries,
} from "./arena-playoff-bracket";
import { testEngineConfig } from "./arena-test-fixtures";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Side-to-move material balance, in pawns. */
function materialStm(fen: string): number {
  const g = new Chess(fen);
  let white = 0;
  for (const row of g.board()) {
    for (const sq of row) {
      if (!sq) continue;
      white += (sq.color === "w" ? 1 : -1) * PIECE_VALUES[sq.type];
    }
  }
  return g.turn() === "w" ? white : -white;
}

type FakeEngineOptions = {
  seed?: number;
  thinkMs?: number;
  evalMs?: number;
  evaluate?: (fen: string) => number;
  move?: (fen: string, rng: () => number) => string | null;
};

function fakeEngine(opts: FakeEngineOptions = {}) {
  const rng = mulberry32(opts.seed ?? 1);
  const state = { now: 0, moveCalls: 0, evalCalls: 0 };
  const deps: ArenaEngineDeps = {
    getMove: async (fen) => {
      state.moveCalls++;
      state.now += opts.thinkMs ?? 0;
      if (opts.move) return opts.move(fen, rng);
      const moves = new Chess(fen).moves({ verbose: true });
      if (moves.length === 0) return null;
      const m = moves[Math.floor(rng() * moves.length)];
      return `${m.from}${m.to}${m.promotion ?? ""}`;
    },
    evaluate: async (fen) => {
      state.evalCalls++;
      state.now += opts.evalMs ?? 0;
      return (opts.evaluate ?? materialStm)(fen);
    },
    sleep: async (ms) => {
      state.now += ms;
    },
    now: () => state.now,
  };
  return { deps, state };
}

function settings(patch: Partial<ArenaMatchSettings> = {}): ArenaMatchSettings {
  return {
    white: testEngineConfig({ name: "White bot" }),
    black: testEngineConfig({ name: "Black bot" }),
    depthCap: 12,
    cadence: { initialSec: 180, incrementSec: 0 },
    forcedOpeningId: null,
    speed: "normal",
    maxPlies: 150,
    lang: "en",
    ...patch,
  };
}

describe("playArenaMatch — random games", () => {
  it("always terminates with a legal, consistent game (50 seeded games)", async () => {
    const counts = { white: 0, black: 0, draw: 0 };
    for (let seed = 1; seed <= 50; seed++) {
      const { deps } = fakeEngine({ seed });
      const res = await playArenaMatch(settings(), deps);

      expect(res.status).toBe("finished");
      expect(res.outcome).not.toBeNull();
      expect(res.history.length).toBeLessThanOrEqual(150);

      const replay = replayUci(res.history);
      expect(replay.history()).toHaveLength(res.history.length);
      expect(replay.fen()).toBe(res.fen);

      if (replay.isCheckmate()) {
        expect(res.outcome!.winner).toBe(replay.turn() === "w" ? "black" : "white");
      } else if (replay.isDraw()) {
        expect(res.outcome!.winner).toBe("draw");
      }

      const pgn = buildArenaPgn({
        whiteName: "W",
        blackName: "B",
        outcome: res.outcome!,
        uciMoves: res.history,
      });
      const check = new Chess();
      check.loadPgn(pgn);
      expect(check.fen()).toBe(res.fen);
      counts[res.outcome!.winner]++;
    }
    expect(counts.white + counts.black + counts.draw).toBe(50);
  }, 60_000);

  it("reports each ply through onPly", async () => {
    const { deps } = fakeEngine({ seed: 7 });
    const plies: number[] = [];
    const res = await playArenaMatch(settings({ maxPlies: 12 }), deps, {
      onPly: (p) => plies.push(p.history.length),
    });
    expect(plies).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(res.maxMovesReached).toBe(true);
  });
});

describe("playArenaPly — end conditions", () => {
  it("ends on a crushing referee eval", async () => {
    const { deps } = fakeEngine({ evaluate: () => -15 });
    const res = await playArenaPly(settings(), { history: [], clock: null }, deps);
    expect(res.status).toBe("finished");
    expect(res.evalWhitePov).toBe(15);
    expect(res.outcome).toMatchObject({ winner: "white", resultType: "arena_eval_white" });
  });

  it("decides the move limit on eval", async () => {
    const { deps } = fakeEngine({ seed: 3, evaluate: () => 0 });
    const res = await playArenaMatch(settings({ maxPlies: 6 }), deps);
    expect(res.history).toHaveLength(6);
    expect(res.maxMovesReached).toBe(true);
    expect(res.outcome?.winner).toBe("draw");
  });

  it("forfeits a side that plays an illegal move", async () => {
    const { deps } = fakeEngine({ move: () => "e2e5" });
    const res = await playArenaPly(settings(), { history: [], clock: null }, deps);
    expect(res.status).toBe("finished");
    expect(res.history).toEqual([]);
    expect(res.outcome).toMatchObject({ winner: "black", resultType: "arena_forfeit" });
  });

  it("aborts without a move when the engine gives up", async () => {
    const { deps } = fakeEngine({ move: () => null });
    const res = await playArenaPly(settings(), { history: [], clock: null }, deps);
    expect(res).toMatchObject({ status: "aborted", error: "engine", history: [] });
  });

  it("drops the move when paused while thinking", async () => {
    const { deps } = fakeEngine();
    const res = await playArenaPly(
      settings(),
      { history: ["e2e4"], clock: null, shouldContinue: () => false },
      deps
    );
    expect(res.status).toBe("aborted");
    expect(res.history).toEqual(["e2e4"]);
    expect(res.error).toBeUndefined();
  });

  it("plays a single legal move instantly without asking the engine", async () => {
    // 1. e4 f5 2. Qh5+ — only ...g6 parries the check.
    const history = ["e2e4", "f7f5", "d1h5"];
    expect(replayUci(history).moves()).toEqual(["g6"]);
    const { deps, state } = fakeEngine();
    const res = await playArenaPly(settings(), { history, clock: null }, deps);
    expect(res.move?.uci).toBe("g7g6");
    expect(state.moveCalls).toBe(0);
    expect(state.now).toBe(0);
  });

  it("does not move a finished game", async () => {
    const { deps, state } = fakeEngine();
    const res = await playArenaPly(
      settings(),
      { history: ["f2f3", "e7e5", "g2g4", "d8h4"], clock: null },
      deps
    );
    expect(res.status).toBe("finished");
    expect(res.outcome?.winner).toBe("black");
    expect(state.moveCalls).toBe(0);
  });
});

describe("playArenaPly — clocks", () => {
  it("charges only the thinking time, not the referee evaluation", async () => {
    const { deps } = fakeEngine({ seed: 2, thinkMs: 100, evalMs: 5_000 });
    const clock = { ...createPlayoffClock({ initialSec: 60, incrementSec: 1 }), turnStartedAt: 0 };
    const w = await playArenaPly(settings(), { history: [], clock }, deps);
    // Theoretical opening budget (350 ms) + 1 s increment; the 5 s eval is free.
    expect(w.clock!.whiteMs).toBe(60_000 - 350 + 1_000);
    expect(w.clock!.blackMs).toBe(60_000);

    const b = await playArenaPly(settings(), { history: w.history, clock: w.clock }, deps);
    expect(b.clock!.blackMs).toBe(60_000 - 350 + 1_000);
    expect(b.clock!.whiteMs).toBe(w.clock!.whiteMs);
  });

  it("evaluates the new position while waiting out the think budget", async () => {
    const { deps, state } = fakeEngine({ seed: 2, thinkMs: 0, evalMs: 0 });
    await playArenaPly(settings(), { history: [], clock: null }, deps);
    expect(state.evalCalls).toBe(1);
    expect(state.now).toBe(350);
  });

  it("flags a side whose engine overruns the clock", async () => {
    const { deps } = fakeEngine({ seed: 5, thinkMs: 10_000 });
    const res = await playArenaMatch(settings({ cadence: { initialSec: 60, incrementSec: 0 } }), deps, {
      clock: { ...createPlayoffClock({ initialSec: 60, incrementSec: 0 }), turnStartedAt: 0 },
    });
    expect(res.status).toBe("finished");
    expect(res.outcome?.resultType).toBe("arena_timeout");
    const flagged = res.outcome?.winner === "white" ? res.clock!.blackMs : res.clock!.whiteMs;
    expect(flagged).toBe(0);
  });

  it("never flags when engines respect the budget (bullet 1+0)", async () => {
    for (let seed = 1; seed <= 5; seed++) {
      const { deps } = fakeEngine({ seed, thinkMs: 0 });
      const res = await playArenaMatch(
        settings({ cadence: { initialSec: 60, incrementSec: 0 }, maxPlies: 200, speed: "realistic" }),
        deps,
        { clock: { ...createPlayoffClock({ initialSec: 60, incrementSec: 0 }), turnStartedAt: 0 } }
      );
      expect(res.outcome?.resultType).not.toBe("arena_timeout");
      expect(res.clock!.whiteMs).toBeGreaterThan(0);
      expect(res.clock!.blackMs).toBeGreaterThan(0);
    }
  }, 30_000);
});

describe("tournament simulations", () => {
  async function simulateTournament(size: 4 | 8, engine: FakeEngineOptions, maxPlies: number) {
    const keys = Array.from({ length: size }, (_, i) => `p${i}`);
    let state = bracketFromSeedKeys(size, keys);
    const seriesLengths: number[] = [];
    for (let guard = 0; guard < size; guard++) {
      const next = getNextReadyMatch(state);
      if (!next) break;
      const { keyA, keyB } = resolveMatchSideKeys(next, state);
      const result = await runPlayoffSeries(keyA!, keyB!, async (game) => {
        const { deps } = fakeEngine({ ...engine, seed: (engine.seed ?? 1) + guard * 10 + game.index });
        const res = await playArenaMatch(
          settings({
            white: testEngineConfig({ name: game.whiteKey }),
            black: testEngineConfig({ name: game.blackKey }),
            maxPlies,
          }),
          deps
        );
        if (res.status !== "finished" || !res.outcome) return null;
        return { winner: res.outcome.winner, note: res.outcome.resultMessage };
      });
      expect(result).not.toBeNull();
      seriesLengths.push(result!.games);
      state = recordMatchResult(state, next.id, result!.winnerKey, result!.note);
    }
    return { state, seriesLengths };
  }

  it.each([4, 8] as const)("crowns a champion with random engines (%i players)", async (size) => {
    const { state } = await simulateTournament(size, { seed: 11 }, 80);
    expect(state.championKey).not.toBeNull();
    expect(state.matches.every((m) => m.status === "done")).toBe(true);
  }, 60_000);

  it.each([4, 8] as const)(
    "still crowns a champion when every game is drawn (%i players)",
    async (size) => {
      const { state, seriesLengths } = await simulateTournament(size, { evaluate: () => 0 }, 4);
      expect(state.championKey).not.toBeNull();
      expect(seriesLengths.every((n) => n === 3)).toBe(true);
      // Armageddon gives Black (the upper slot) the draw odds: p0 wins every time.
      expect(state.championKey).toBe("p0");
    },
    30_000
  );
});

describe("playArenaPly � referee evaluation", () => {
  /** 1. e4 then the engine reports `score` for its chosen line. */
  function scoredEngine(score: number) {
    const base = fakeEngine({ seed: 3 });
    const deps: ArenaEngineDeps = {
      ...base.deps,
      getMove: async (fen, cfg, o) => {
        const uci = (await base.deps.getMove(fen, cfg, o)) as string;
        return { uci, scoreStm: score };
      },
    };
    return { deps, state: base.state };
  }

  it("trusts a modest search score and skips the referee", async () => {
    const { deps, state } = scoredEngine(0.4);
    const w = await playArenaPly(settings(), { history: [], clock: null }, deps);
    expect(state.evalCalls).toBe(0);
    expect(w.evalWhitePov).toBe(0.4);

    const b = await playArenaPly(settings(), { history: w.history, clock: null }, deps);
    expect(state.evalCalls).toBe(0);
    // Black's +0.4 is -0.4 from White's point of view.
    expect(b.evalWhitePov).toBe(-0.4);
  });

  it("confirms a decisive search score with the referee before adjudicating", async () => {
    const { deps, state } = scoredEngine(12);
    const res = await playArenaPly(settings(), { history: [], clock: null }, deps);
    expect(state.evalCalls).toBe(1);
    // The referee (material = 0) overrules the bogus +12: no crushing win.
    expect(res.status).toBe("continue");
    expect(res.evalWhitePov).toBe(0);
  });

  it("falls back to the referee when the engine gives no score", async () => {
    const { deps, state } = fakeEngine({ seed: 3 });
    await playArenaPly(settings(), { history: [], clock: null }, deps);
    expect(state.evalCalls).toBe(1);
  });
});

describe("playArenaPly — local human players", () => {
  function humanDeps(answers: (string | "timeout" | null)[], humanMs = 2_000) {
    const base = fakeEngine({ seed: 4, thinkMs: 100 });
    const calls: { color: "w" | "b"; timeLimitMs: number | null }[] = [];
    const deps: ArenaEngineDeps = {
      ...base.deps,
      getHumanMove: async (_fen, opts) => {
        calls.push(opts);
        base.state.now += humanMs;
        return answers.shift() ?? null;
      },
    };
    return { deps, state: base.state, calls };
  }

  it("asks the human for White's move and charges only the real thinking time", async () => {
    const { deps, state, calls } = humanDeps(["e2e4"]);
    const clock = { ...createPlayoffClock({ initialSec: 60, incrementSec: 0 }), turnStartedAt: 0 };
    const res = await playArenaPly(settings({ humanSides: { w: true } }), { history: [], clock }, deps);
    expect(res.status).toBe("continue");
    expect(res.history).toEqual(["e2e4"]);
    expect(res.move?.san).toBe("e4");
    expect(calls).toEqual([{ color: "w", timeLimitMs: 60_000 }]);
    expect(state.moveCalls).toBe(0);
    // No artificial think pad for humans: exactly the 2 s spent.
    expect(res.clock!.whiteMs).toBe(58_000);
  });

  it("lets the engine play the side that is not human", async () => {
    const { deps, state, calls } = humanDeps(["e2e4"]);
    const s = settings({ humanSides: { w: true } });
    const w = await playArenaPly(s, { history: [], clock: null }, deps);
    const b = await playArenaPly(s, { history: w.history, clock: null }, deps);
    expect(calls).toHaveLength(1);
    expect(state.moveCalls).toBe(1);
    expect(b.history).toHaveLength(2);
  });

  it("flags the human who runs out of time", async () => {
    const { deps } = humanDeps(["timeout"]);
    const clock = { ...createPlayoffClock({ initialSec: 60, incrementSec: 0 }), turnStartedAt: 0 };
    const res = await playArenaPly(settings({ humanSides: { w: true } }), { history: [], clock }, deps);
    expect(res.status).toBe("finished");
    expect(res.clock!.whiteMs).toBe(0);
    expect(res.outcome?.winner).toBe("black");
    expect(res.outcome?.resultType).toBe("arena_timeout");
  });

  it("aborts without a move when the wait is cancelled", async () => {
    const { deps } = humanDeps([null]);
    const res = await playArenaPly(settings({ humanSides: { b: true } }), { history: ["e2e4"], clock: null }, deps);
    expect(res.status).toBe("aborted");
    expect(res.error).toBeUndefined();
    expect(res.history).toEqual(["e2e4"]);
  });

  it("plays a whole human vs bot game to the end", async () => {
    const base = fakeEngine({ seed: 9 });
    const rng = mulberry32(42);
    const deps: ArenaEngineDeps = {
      ...base.deps,
      getHumanMove: async (fen) => {
        const moves = new Chess(fen).moves({ verbose: true });
        const m = moves[Math.floor(rng() * moves.length)];
        return `${m.from}${m.to}${m.promotion ?? ""}`;
      },
    };
    const res = await playArenaMatch(settings({ humanSides: { b: true }, maxPlies: 80 }), deps);
    expect(res.status).toBe("finished");
    expect(res.outcome).not.toBeNull();
    expect(replayUci(res.history).history()).toHaveLength(res.history.length);
  });
});

describe("playArenaPly — human resign / draw", () => {
  it("ends when the human resigns", async () => {
    const base = fakeEngine({ seed: 1 });
    const deps: ArenaEngineDeps = {
      ...base.deps,
      getHumanMove: async () => "resign",
    };
    const res = await playArenaPly(settings({ humanSides: { w: true } }), { history: [], clock: null }, deps);
    expect(res.status).toBe("finished");
    expect(res.outcome?.resultType).toBe("arena_resign");
    expect(res.outcome?.winner).toBe("black");
  });

  it("ends when humans agree to a draw", async () => {
    const base = fakeEngine({ seed: 1 });
    const deps: ArenaEngineDeps = {
      ...base.deps,
      getHumanMove: async () => "draw",
    };
    const res = await playArenaPly(settings({ humanSides: { w: true } }), { history: [], clock: null }, deps);
    expect(res.status).toBe("finished");
    expect(res.outcome?.winner).toBe("draw");
    expect(res.outcome?.pgnResult).toBe("1/2-1/2");
  });
});

describe("arenaRefereeEvalDepth", () => {
  it("is shallower on fast", async () => {
    const { arenaRefereeEvalDepth, ARENA_FAST_EVAL_DEPTH, ARENA_MOVE_LIMIT_EVAL_DEPTH } = await import(
      "./arena-move-limit"
    );
    expect(arenaRefereeEvalDepth("fast")).toBe(ARENA_FAST_EVAL_DEPTH);
    expect(arenaRefereeEvalDepth("normal")).toBe(ARENA_MOVE_LIMIT_EVAL_DEPTH);
  });
});
