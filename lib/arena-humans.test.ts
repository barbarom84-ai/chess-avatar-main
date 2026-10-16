import { describe, expect, it } from "vitest";
import {
  arenaPlatformOf,
  clampHumanElo,
  exportArenaHumansJson,
  humanAvatarDataUri,
  humanOption,
  importArenaHumansJson,
  isHumanOption,
  parseArenaHumans,
  seedCandidates,
  validateHumanName,
  type ArenaHumanProfile,
} from "./arena-humans";
import { dedupeByIdentity, filterByPlatform } from "./arena-profile-pool";
import { testEngineConfig } from "./arena-test-fixtures";
import type { ProfileOption } from "./arena-types";

const alice: ArenaHumanProfile = { id: "a1", name: "Alice", elo: 1400, createdAt: 1 };

function avatar(name: string, platform: "lichess" | "chesscom", savedAt: number): ProfileOption {
  return {
    key: `saved:${name}:${savedAt}`,
    label: name,
    config: testEngineConfig({ name, platform }),
    savedAt,
  };
}

describe("arena humans", () => {
  it("builds a human option with a stable key", () => {
    const opt = humanOption(alice);
    expect(opt.key).toBe("human:a1");
    expect(opt.label).toBe("Alice");
    expect(opt.config.elo).toBe(1400);
    expect(isHumanOption(opt)).toBe(true);
    expect(arenaPlatformOf(opt)).toBe("human");
    expect(arenaPlatformOf(avatar("Bot", "chesscom", 1))).toBe("chesscom");
    expect(decodeURIComponent(opt.config.avatarUrl!)).toContain(">A</text>");
    expect(decodeURIComponent(humanAvatarDataUri("<b>"))).toContain(">&lt;</text>");
  });

  it("validates names", () => {
    expect(validateHumanName("  ", [alice])).toBe("empty");
    expect(validateHumanName("x".repeat(25), [alice])).toBe("tooLong");
    expect(validateHumanName(" alice ", [alice])).toBe("duplicate");
    expect(validateHumanName("Alice", [alice], "a1")).toBeNull();
    expect(validateHumanName("Bob", [alice])).toBeNull();
  });

  it("parses stored players defensively", () => {
    expect(parseArenaHumans(null)).toEqual([]);
    expect(parseArenaHumans("{")).toEqual([]);
    expect(parseArenaHumans('{"id":"x"}')).toEqual([]);
    const parsed = parseArenaHumans(
      JSON.stringify([alice, { id: "a1", name: "Dup" }, { id: "b", name: "  " }, { id: "c", name: "Cid", elo: 99999 }])
    );
    expect(parsed.map((h) => h.name)).toEqual(["Alice", "Cid"]);
    expect(parsed[1].elo).toBe(3000);
    expect(clampHumanElo("x")).toBe(1200);
  });

  it("keeps placed humans when auto-seeding and fills with avatars", () => {
    const bob = humanOption({ id: "b2", name: "Bob", elo: 900, createdAt: 2 });
    const roster = [
      humanOption(alice),
      bob,
      avatar("Weak", "lichess", 1),
      { ...avatar("Strong", "lichess", 2), config: testEngineConfig({ name: "Strong", elo: 2500 }) },
      { ...avatar("Mid", "lichess", 3), config: testEngineConfig({ name: "Mid", elo: 1800 }) },
    ];
    roster[2].config.elo = 1000;
    const mixed = seedCandidates(roster, new Set(["human:b2"]), 3, "elo", false);
    expect(mixed.map((o) => o.label)).toEqual(["Bob", "Strong", "Mid"]);

    const humansOnly = seedCandidates(roster.slice(0, 2), new Set(), 2, "elo", true);
    expect(humansOnly.map((o) => o.label)).toEqual(["Alice", "Bob"]);

    const random = seedCandidates(roster, new Set(["human:a1"]), 4, "random", false, () => 0.5);
    expect(random[0].label).toBe("Alice");
    expect(random.slice(1).every((o) => !o.human)).toBe(true);
    expect(random).toHaveLength(4);
  });

  it("keeps humans first and under every platform filter", () => {
    const pool = dedupeByIdentity([
      avatar("Bot", "lichess", 1),
      avatar("Bot", "lichess", 5),
      humanOption(alice),
      avatar("Other", "chesscom", 3),
    ]);
    expect(pool.map((o) => o.label)).toEqual(["Alice", "Bot", "Other"]);
    expect(pool[1].savedAt).toBe(5);
    expect(filterByPlatform(pool, "chesscom").map((o) => o.label)).toEqual(["Alice", "Other"]);
    expect(filterByPlatform(pool, "human").map((o) => o.label)).toEqual(["Alice"]);
  });

  it("exports roster JSON for backup", () => {
    expect(JSON.parse(exportArenaHumansJson([alice]))).toEqual([{ name: "Alice", elo: 1400 }]);
    expect(importArenaHumansJson("{").error).toBe("invalid");
  });
});
