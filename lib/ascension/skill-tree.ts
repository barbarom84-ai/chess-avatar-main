import { PARITY } from "@/lib/parity-contract";
import type { PieceAbilityId } from "@/lib/ascension/fantasy-chess/types";
import type { LocalizedText } from "@/lib/ascension/types";

export type SkillEffectKind = "passive" | "fantasy_ability" | "cosmetic";

export interface SkillDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  cost: number;
  prerequisites: string[];
  effectKind: SkillEffectKind;
  abilityId?: PieceAbilityId;
  branch: "utility" | "fantasy" | "prestige" | "terrain";
  position: { x: number; y: number };
}

export const SKILL_TREE: SkillDefinition[] = PARITY.ascension.skillTree.map((s) => ({
  ...s,
  prerequisites: [...s.prerequisites],
  abilityId: s.abilityId as PieceAbilityId | undefined,
}));

export function getSkillById(id: string): SkillDefinition | undefined {
  return SKILL_TREE.find((s) => s.id === id);
}

export function canUnlockSkill(
  skillId: string,
  unlockedIds: string[],
  currentXp: number
): { ok: boolean; reason?: string } {
  const skill = getSkillById(skillId);
  if (!skill) return { ok: false, reason: "UNKNOWN_SKILL" };
  if (unlockedIds.includes(skillId)) return { ok: false, reason: "ALREADY_UNLOCKED" };
  if (skill.cost > 0 && currentXp < skill.cost) return { ok: false, reason: "INSUFFICIENT_XP" };
  for (const prereq of skill.prerequisites) {
    if (!unlockedIds.includes(prereq)) {
      return { ok: false, reason: "MISSING_PREREQUISITE" };
    }
  }
  return { ok: true };
}

export function playerFantasyAbilities(unlockedIds: string[]): PieceAbilityId[] {
  const abilities: PieceAbilityId[] = [];
  for (const id of unlockedIds) {
    const skill = getSkillById(id);
    if (skill?.effectKind === "fantasy_ability" && skill.abilityId) {
      abilities.push(skill.abilityId);
    }
  }
  return abilities;
}

export function playerHasPassive(unlockedIds: string[], passiveId: string): boolean {
  return unlockedIds.includes(passiveId);
}

export function playerPassiveSkills(unlockedIds: string[]): string[] {
  const passives: string[] = [];
  for (const id of unlockedIds) {
    const skill = getSkillById(id);
    if (skill?.effectKind === "passive") passives.push(id);
  }
  return passives;
}

export function skillIdForAbility(abilityId: PieceAbilityId): string | undefined {
  return SKILL_TREE.find((s) => s.abilityId === abilityId)?.id;
}
