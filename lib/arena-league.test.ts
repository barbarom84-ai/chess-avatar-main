import { describe, expect, it } from "vitest";
import {
  createLeague,
  isLeagueFinished,
  leagueGameCount,
  leagueStandings,
  leagueWinner,
  nextLeagueGame,
  parseStoredLeague,
  recordLeagueGame,
  roundRobinGames,
  swissRoundCount,
  type ArenaLeagueResult,
  type ArenaLeagueState,
} from "./arena-league";

const players = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

function pairKey(a: string, b: string) {
  return [a, b].sort().join("-");
}

/** Plays every remaining game, the better seed (lower index) always winning. */
function playOut(state: ArenaLeagueState, pick?: (w: string, b: string) => ArenaLeagueResult) {
  const seed = (k: string) => state.players.indexOf(k);
  let s = state;
  for (let guard = 0; guard < 500; guard++) {
    const g = nextLeagueGame(s);
    if (!g) break;
    const result = pick
      ? pick(g.whiteKey, g.blackKey!)
      : seed(g.whiteKey) < seed(g.blackKey!)
        ? "1-0"
        : "0-1";
    s = recordLeagueGame(s, g.id, result);
  }
  return s;
}

describe("round-robin", () => {
  it("pairs every player against every other exactly once", () => {
    for (const n of [4, 5, 8]) {
      const games = roundRobinGames(players(n)).filter((g) => g.blackKey);
      expect(games).toHaveLength((n * (n - 1)) / 2);
      expect(new Set(games.map((g) => pairKey(g.whiteKey, g.blackKey!))).size).toBe(games.length);
    }
  });

  it("keeps colors balanced (at most one extra White)", () => {
    const games = roundRobinGames(players(8));
    for (const p of players(8)) {
      const whites = games.filter((g) => g.whiteKey === p).length;
      const blacks = games.filter((g) => g.blackKey === p).length;
      expect(Math.abs(whites - blacks)).toBeLessThanOrEqual(1);
    }
  });

  it("gives each player one bye with an odd field and plays one game per round", () => {
    const games = roundRobinGames(players(5));
    const byes = games.filter((g) => g.blackKey == null);
    expect(new Set(byes.map((g) => g.whiteKey)).size).toBe(5);
    for (let r = 0; r < 5; r++) {
      const inRound = games.filter((g) => g.round === r).flatMap((g) => [g.whiteKey, g.blackKey]);
      expect(new Set(inRound.filter(Boolean)).size).toBe(5);
    }
  });

  it("finishes with the strongest seed on top and a Sonneborn-Berger tiebreak", () => {
    const done = playOut(createLeague("roundrobin", players(4)));
    expect(isLeagueFinished(done)).toBe(true);
    const table = leagueStandings(done);
    expect(table.map((r) => r.points)).toEqual([3, 2, 1, 0]);
    expect(leagueWinner(done)).toBe("p1");
    // p1 beat p2 (2 pts), p3 (1 pt), p4 (0 pts).
    expect(table[0].tiebreak).toBe(3);
  });
});

describe("swiss", () => {
  it("uses log2(n) rounds", () => {
    expect(swissRoundCount(8)).toBe(3);
    expect(swissRoundCount(16)).toBe(4);
    expect(leagueGameCount("swiss", 16)).toBe(32);
    expect(leagueGameCount("roundrobin", 8)).toBe(28);
  });

  it("pairs top half against bottom half in round 1", () => {
    const s = createLeague("swiss", players(8));
    expect(s.games.map((g) => pairKey(g.whiteKey, g.blackKey!))).toEqual([
      pairKey("p1", "p5"),
      pairKey("p2", "p6"),
      pairKey("p3", "p7"),
      pairKey("p4", "p8"),
    ]);
  });

  it("generates the next round only when the current one is complete, without rematches", () => {
    let s = createLeague("swiss", players(8));
    const first = nextLeagueGame(s)!;
    s = recordLeagueGame(s, first.id, "1-0");
    expect(Math.max(...s.games.map((g) => g.round))).toBe(0);

    s = playOut(s);
    expect(isLeagueFinished(s)).toBe(true);
    expect(new Set(s.games.map((g) => g.round)).size).toBe(3);
    const pairs = s.games.map((g) => pairKey(g.whiteKey, g.blackKey!));
    expect(new Set(pairs).size).toBe(pairs.length);
    expect(leagueWinner(s)).toBe("p1");
  });

  it("gives the bye to the lowest-ranked player without a bye", () => {
    const s = createLeague("swiss", players(5));
    const bye = s.games.find((g) => g.blackKey == null);
    expect(bye?.whiteKey).toBe("p5");
    expect(leagueStandings(s).find((r) => r.key === "p5")?.points).toBe(1);
    const done = playOut(s);
    const byes = done.games.filter((g) => g.blackKey == null).map((g) => g.whiteKey);
    expect(new Set(byes).size).toBe(byes.length);
  });

  it("counts draws as half points", () => {
    const done = playOut(createLeague("swiss", players(4)), () => "1/2-1/2");
    expect(leagueStandings(done).every((r) => r.points === 1)).toBe(true);
  });
});

describe("league persistence", () => {
  it("round-trips and rejects unknown players or corrupt data", () => {
    const s = recordLeagueGame(createLeague("swiss", players(8)), "l0-g0", "1-0", "note");
    const keys = new Set(players(8));
    expect(parseStoredLeague(JSON.stringify(s), keys)).toEqual(s);
    expect(parseStoredLeague(JSON.stringify(s), new Set(players(7)))).toBeNull();
    expect(parseStoredLeague("{", keys)).toBeNull();
    expect(parseStoredLeague(JSON.stringify({ ...s, format: "ko" }), keys)).toBeNull();
    expect(
      parseStoredLeague(
        JSON.stringify({ ...s, games: [{ ...s.games[0], result: "2-0" }] }),
        keys
      )
    ).toBeNull();
  });
});
