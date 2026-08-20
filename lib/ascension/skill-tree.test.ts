import { describe, expect, it } from "vitest";
import { canUnlockSkill, getSkillById, skillIdForAbility } from "@/lib/ascension/skill-tree";

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

  it("queen_split requires rook_tunnel", () => {
    const result = canUnlockSkill("queen_split", ["root", "knight_phantom", "bishop_orthogonal"], 200);
    expect(result.ok).toBe(false);
    const ok = canUnlockSkill(
      "queen_split",
      ["root", "knight_phantom", "bishop_orthogonal", "rook_tunnel"],
      200
    );
    expect(ok.ok).toBe(true);
  });

  it("king_anchor requires pawn_greedy", () => {
    const result = canUnlockSkill("king_anchor", ["root", "knight_phantom", "pawn_charge"], 200);
    expect(result.ok).toBe(false);
    const ok = canUnlockSkill(
      "king_anchor",
      ["root", "knight_phantom", "pawn_charge", "pawn_greedy"],
      200
    );
    expect(ok.ok).toBe(true);
  });

  it("blast_dodge requires king_anchor", () => {
    const result = canUnlockSkill("blast_dodge", ["root", "pawn_greedy"], 200);
    expect(result.ok).toBe(false);
  });

  it("maps ability ids to skill ids", () => {
    expect(skillIdForAbility("queen_split")).toBe("queen_split");
    expect(skillIdForAbility("king_anchor")).toBe("king_anchor");
  });
});
