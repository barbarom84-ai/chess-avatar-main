import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cachedPoolSource,
  clearArenaPoolCache,
  dedupeByIdentity,
  filterByPlatform,
  filterBySearch,
  mergeFeaturedFirst,
  mergeLocalAndCloud,
  pickRandomPair,
  profileIdentityKey,
} from "./arena-profile-pool";
import { testOption } from "./arena-test-fixtures";

describe("profileIdentityKey", () => {
  it("is case-insensitive and platform-aware", () => {
    const a = testOption("x", { name: " Magnus ", platform: "lichess" }).config;
    const b = testOption("y", { name: "magnus", platform: "lichess" }).config;
    const c = testOption("z", { name: "magnus", platform: "chesscom" }).config;
    expect(profileIdentityKey(a)).toBe(profileIdentityKey(b));
    expect(profileIdentityKey(a)).not.toBe(profileIdentityKey(c));
  });
});

describe("filters", () => {
  const pool = [
    testOption("li", { name: "Alice", platform: "lichess" }),
    testOption("cc", { name: "Bob", platform: "chesscom" }),
    testOption("none", { name: "Carol" }),
  ];

  it("filters by platform (missing platform counts as Lichess)", () => {
    expect(filterByPlatform(pool, "all")).toHaveLength(3);
    expect(filterByPlatform(pool, "lichess").map((o) => o.key)).toEqual(["li", "none"]);
    expect(filterByPlatform(pool, "chesscom").map((o) => o.key)).toEqual(["cc"]);
  });

  it("searches names and labels, ignoring case and blanks", () => {
    expect(filterBySearch(pool, "  ")).toHaveLength(3);
    expect(filterBySearch(pool, "BOB").map((o) => o.key)).toEqual(["cc"]);
    expect(filterBySearch(pool, "zzz")).toEqual([]);
  });
});

describe("dedupe and merge", () => {
  it("keeps the most recent profile per identity", () => {
    const rows = dedupeByIdentity([
      testOption("old", { name: "Same" }, 1),
      testOption("new", { name: "Same" }, 5),
      testOption("other", { name: "Other" }, 3),
    ]);
    expect(rows.map((o) => o.key)).toEqual(["new", "other"]);
  });

  it("prefers local profiles over cloud duplicates", () => {
    const merged = mergeLocalAndCloud(
      [testOption("local", { name: "Dup" }, 1)],
      [testOption("cloud", { name: "Dup" }, 9), testOption("cloud2", { name: "Solo" }, 2)]
    );
    expect(merged.map((o) => o.key)).toEqual(["cloud2", "local"]);
  });

  it("puts featured profiles first without duplicates", () => {
    const merged = mergeFeaturedFirst(
      [testOption("feat", { name: "Star" })],
      [testOption("star-copy", { name: "Star" }), testOption("rest", { name: "Rest" })]
    );
    expect(merged.map((o) => o.key)).toEqual(["feat", "rest"]);
  });
});

describe("pickRandomPair", () => {
  const pool = ["a", "b", "c"].map((k) => testOption(k));

  it("returns two distinct keys", () => {
    for (const r of [0, 0.2, 0.5, 0.99]) {
      const pair = pickRandomPair(pool, () => r)!;
      expect(pair[0]).not.toBe(pair[1]);
    }
  });

  it("returns null for pools smaller than two", () => {
    expect(pickRandomPair(pool.slice(0, 1))).toBeNull();
  });
});

describe("cachedPoolSource", () => {
  beforeEach(() => clearArenaPoolCache());

  it("shares in-flight requests and reuses fresh results", async () => {
    const load = vi.fn(async () => [testOption("a")]);
    const [a, b] = await Promise.all([
      cachedPoolSource("k", load, { now: 0 }),
      cachedPoolSource("k", load, { now: 10 }),
    ]);
    expect(a).toBe(b);
    await cachedPoolSource("k", load, { now: 60_000 });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("reloads after the TTL or when forced", async () => {
    const load = vi.fn(async () => [testOption("a")]);
    await cachedPoolSource("k", load, { now: 0 });
    await cachedPoolSource("k", load, { now: 6 * 60_000 });
    await cachedPoolSource("k", load, { now: 6 * 60_000 + 1, force: true });
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("never keeps empty or failed results", async () => {
    const empty = vi.fn(async () => []);
    await cachedPoolSource("e", empty, { now: 0 });
    await cachedPoolSource("e", empty, { now: 1 });
    expect(empty).toHaveBeenCalledTimes(2);

    const failing = vi.fn(async (): Promise<ReturnType<typeof testOption>[]> => {
      throw new Error("429");
    });
    expect(await cachedPoolSource("f", failing, { now: 0 })).toEqual([]);
    await cachedPoolSource("f", failing, { now: 1 });
    expect(failing).toHaveBeenCalledTimes(2);
  });
});
