import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PARITY } from "@/lib/parity-contract";

function errorCodesIn(relPath: string): string[] {
  const src = readFileSync(join(process.cwd(), relPath), "utf8");
  return [...src.matchAll(/(?:error|reason): "([A-Z][A-Z_]+)"/g)].map((m) => m[1]);
}

describe("parity contract", () => {
  it("declares every coach error code returned by the route", () => {
    for (const code of errorCodesIn("app/api/coach/chat/route.ts")) {
      expect(PARITY.coach.errorCodes).toContain(code);
    }
  });

  it("declares every skill unlock reason", () => {
    const reasons = errorCodesIn("lib/ascension/skill-tree.ts");
    expect(reasons.length).toBeGreaterThan(0);
    for (const code of reasons) {
      expect(PARITY.ascension.errorCodes).toContain(code);
    }
  });

  it("has a consistent skill tree", () => {
    const ids = PARITY.ascension.skillTree.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const skill of PARITY.ascension.skillTree) {
      for (const prereq of skill.prerequisites) expect(ids).toContain(prereq);
      expect(skill.effectKind === "fantasy_ability").toBe(skill.abilityId !== undefined);
    }
  });

  it("has consistent PvP presets", () => {
    const ids = PARITY.pvp.timePresets.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PARITY.pvp.timePresets) {
      if (p.mode === "correspondence") {
        expect(p.category).toBe("correspondence");
        expect(p.daysPerMove).toBeGreaterThan(0);
      } else {
        expect(p.category).not.toBe("correspondence");
        expect(p.initialSec).toBeGreaterThan(0);
      }
    }
  });

  it("keeps accuracy anchors strictly increasing", () => {
    const anchors = PARITY.gameElo.accuracyAnchors;
    for (let i = 1; i < anchors.length; i++) {
      expect(anchors[i][0]).toBeGreaterThan(anchors[i - 1][0]);
      expect(anchors[i][1]).toBeGreaterThan(anchors[i - 1][1]);
    }
  });
});
