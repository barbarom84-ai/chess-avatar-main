import { describe, expect, it } from "vitest";
import { canUnlockSkill, getSkillById } from "@/lib/ascension/skill-tree";

describe("skill-tree", () => {
  it("auto root is free prerequisite", () => {
    const root = getSkillById("root");
    expect(root?.cost).toBe(0);
  });

  it("blocks unlock without prerequisites", () => {
    const result = canUnlockSkill("bishop_orthogonal", ["root"], 200);
    expect(result.ok).toBe(false);
  });

  it("allows unlock when prerequisites and xp met", () => {
    const result = canUnlockSkill(
      "extra_hint",
      ["root"],
      100
    );
    expect(result.ok).toBe(true);
  });

  it("rejects insufficient xp", () => {
    const result = canUnlockSkill("extra_hint", ["root"], 10);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("INSUFFICIENT_XP");
  });
});
