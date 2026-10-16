import { describe, expect, it } from "vitest";
import {
  ARENA_RATING_DEFAULT,
  EMPTY_ARENA_RATINGS,
  applyArenaGame,
  arenaLeaderboard,
  expectedScore,
  headToHead,
  parseArenaRatings,
} from "./arena-rating";

const alice = { key: "lichess:alice", name: "Alice", seedElo: 1800 };
const bob = { key: "chesscom:bob", name: "Bob", seedElo: 1800 };

describe("arena rating", () => {
  it("expected score is symmetric and 0.5 for equal ratings", () => {
    expect(expectedScore(1500, 1500)).toBe(0.5);
    expect(expectedScore(1700, 1500) + expectedScore(1500, 1700)).toBeCloseTo(1);
  });

  it("seeds new avatars from their Elo and moves ratings symmetrically", () => {
    const s = applyArenaGame(EMPTY_ARENA_RATINGS, alice, bob, "white");
    expect(s.players[alice.key]).toMatchObject({ rating: 1820, games: 1, wins: 1 });
    expect(s.players[bob.key]).toMatchObject({ rating: 1780, games: 1, losses: 1 });
  });

  it("falls back to the default rating without a seed", () => {
    const s = applyArenaGame(
      EMPTY_ARENA_RATINGS,
      { key: "a", name: "A" },
      { key: "b", name: "B", seedElo: 0 },
      "draw"
    );
    expect(s.players.a.rating).toBe(ARENA_RATING_DEFAULT);
    expect(s.players.b.draws).toBe(1);
  });

  it("tracks head-to-head regardless of colors and argument order", () => {
    let s = applyArenaGame(EMPTY_ARENA_RATINGS, alice, bob, "white"); // Alice wins
    s = applyArenaGame(s, bob, alice, "white"); // Bob wins
    s = applyArenaGame(s, bob, alice, "black"); // Alice wins
    s = applyArenaGame(s, alice, bob, "draw");
    expect(headToHead(s, alice.key, bob.key)).toEqual({ aWins: 2, bWins: 1, draws: 1 });
    expect(headToHead(s, bob.key, alice.key)).toEqual({ aWins: 1, bWins: 2, draws: 1 });
  });

  it("ignores self-play and sorts the leaderboard by rating", () => {
    expect(applyArenaGame(EMPTY_ARENA_RATINGS, alice, alice, "white")).toBe(EMPTY_ARENA_RATINGS);
    const s = applyArenaGame(EMPTY_ARENA_RATINGS, alice, bob, "black");
    expect(arenaLeaderboard(s).map((p) => p.name)).toEqual(["Bob", "Alice"]);
  });

  it("parses stored data defensively", () => {
    expect(parseArenaRatings(null)).toEqual(EMPTY_ARENA_RATINGS);
    expect(parseArenaRatings("not json")).toEqual(EMPTY_ARENA_RATINGS);
    expect(parseArenaRatings("null")).toEqual(EMPTY_ARENA_RATINGS);
    const s = applyArenaGame(EMPTY_ARENA_RATINGS, alice, bob, "white");
    const raw = JSON.stringify({
      ...s,
      players: { ...s.players, broken: { name: 3 } },
      h2h: { ...s.h2h, "x|y": { first: -1 } },
    });
    const parsed = parseArenaRatings(raw);
    expect(Object.keys(parsed.players).sort()).toEqual([bob.key, alice.key].sort());
    expect(Object.keys(parsed.h2h)).toHaveLength(1);
  });
});
