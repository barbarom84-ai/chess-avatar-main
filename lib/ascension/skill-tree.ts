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

export const SKILL_TREE: SkillDefinition[] = [
  {
    id: "root",
    name: { fr: "Origine", en: "Origin" },
    description: { fr: "Point de départ de votre ascension.", en: "Starting point of your ascension." },
    cost: 0,
    prerequisites: [],
    effectKind: "passive",
    branch: "utility",
    position: { x: 0, y: 0 },
  },
  {
    id: "extra_hint",
    name: { fr: "Indice supplémentaire", en: "Extra hint" },
    description: { fr: "Débloque un indice de plus par puzzle.", en: "Unlock one extra hint per puzzle." },
    cost: 50,
    prerequisites: ["root"],
    effectKind: "passive",
    branch: "utility",
    position: { x: -1, y: 1 },
  },
  {
    id: "undo_move",
    name: { fr: "Annuler un coup", en: "Undo move" },
    description: { fr: "Permet d'annuler un coup par puzzle.", en: "Allows one undo per puzzle." },
    cost: 80,
    prerequisites: ["extra_hint"],
    effectKind: "passive",
    branch: "utility",
    position: { x: -1, y: 2 },
  },
  {
    id: "knight_phantom",
    name: { fr: "Cavalier fou (Crazy Horse)", en: "Crazy Horse knight" },
    description: {
      fr: "En puzzles fantasy : le cavalier glisse en diagonale comme un fou (sur sa couleur) et peut sauter de 2 cases sur les côtés (gauche, droite, haut, bas).",
      en: "In fantasy puzzles: the knight slides diagonally like a bishop (on its square color) and may leap 2 squares orthogonally (left, right, up, down).",
    },
    cost: 60,
    prerequisites: ["root"],
    effectKind: "fantasy_ability",
    abilityId: "knight_phantom",
    branch: "fantasy",
    position: { x: 1, y: 1 },
  },
  {
    id: "bishop_orthogonal",
    name: { fr: "Fou orthogonal", en: "Orthogonal bishop" },
    description: {
      fr: "Le fou peut glisser orthogonalement une fois par puzzle.",
      en: "The bishop can slide orthogonally once per puzzle.",
    },
    cost: 90,
    prerequisites: ["knight_phantom"],
    effectKind: "fantasy_ability",
    abilityId: "bishop_orthogonal",
    branch: "fantasy",
    position: { x: 1, y: 2 },
  },
  {
    id: "rook_tunnel",
    name: { fr: "Tour tunnel", en: "Tunnel rook" },
    description: {
      fr: "La tour traverse une pièce alliée.",
      en: "The rook passes through a friendly piece.",
    },
    cost: 120,
    prerequisites: ["bishop_orthogonal"],
    effectKind: "fantasy_ability",
    abilityId: "rook_tunnel",
    branch: "fantasy",
    position: { x: 1, y: 3 },
  },
  {
    id: "pawn_charge",
    name: { fr: "Charge du pion", en: "Pawn charge" },
    description: {
      fr: "Le pion peut avancer de deux cases même bloqué.",
      en: "The pawn can advance two squares even when blocked.",
    },
    cost: 100,
    prerequisites: ["knight_phantom"],
    effectKind: "fantasy_ability",
    abilityId: "pawn_charge",
    branch: "fantasy",
    position: { x: 2, y: 2 },
  },
  {
    id: "pawn_greedy",
    name: { fr: "Pion glouton", en: "Greedy pawn" },
    description: {
      fr: "En puzzles fantasy : après une capture, le pion continue à manger tant qu'il le peut, sans passer son tour.",
      en: "In fantasy puzzles: after capturing, the pawn keeps taking as long as it can without yielding the turn.",
    },
    cost: 110,
    prerequisites: ["pawn_charge"],
    effectKind: "fantasy_ability",
    abilityId: "pawn_greedy",
    branch: "fantasy",
    position: { x: 2, y: 3 },
  },
  {
    id: "queen_split",
    name: { fr: "Reine scindée", en: "Split queen" },
    description: {
      fr: "En puzzles fantasy (1×/puzzle) : après un coup de dame, vous gardez la main et ne pouvez jouer que cette même dame encore.",
      en: "In fantasy puzzles (once per puzzle): after a queen move, keep the turn and only that same queen may move again.",
    },
    cost: 140,
    prerequisites: ["rook_tunnel"],
    effectKind: "fantasy_ability",
    abilityId: "queen_split",
    branch: "fantasy",
    position: { x: 1, y: 4 },
  },
  {
    id: "king_anchor",
    name: { fr: "Ancre du roi", en: "King anchor" },
    description: {
      fr: "En puzzles fantasy : le roi survit aux pièges sur la case d'arrivée (piège consommé).",
      en: "In fantasy puzzles: the king survives trap squares on the landing square (trap consumed).",
    },
    cost: 130,
    prerequisites: ["pawn_greedy"],
    effectKind: "fantasy_ability",
    abilityId: "king_anchor",
    branch: "terrain",
    position: { x: 3, y: 3 },
  },
  {
    id: "blast_dodge",
    name: { fr: "Esquive d'explosion", en: "Blast dodge" },
    description: {
      fr: "Passif : en puzzles fantasy, une pièce non-roi qui atterrit sur une case explosive survit (voisins toujours affectés).",
      en: "Passive: in fantasy puzzles, a non-king landing on an explosive square survives (adjacent pieces still affected).",
    },
    cost: 100,
    prerequisites: ["king_anchor"],
    effectKind: "passive",
    branch: "terrain",
    position: { x: 3, y: 4 },
  },
  {
    id: "tunnel_sense",
    name: { fr: "Sens du tunnel", en: "Tunnel sense" },
    description: {
      fr: "Passif : surlignage renforcé des sorties de tunnel (flèches et repères visuels).",
      en: "Passive: enhanced tunnel exit highlighting (arrows and visual markers).",
    },
    cost: 80,
    prerequisites: ["king_anchor"],
    effectKind: "passive",
    branch: "terrain",
    position: { x: 4, y: 4 },
  },
  {
    id: "power_sight",
    name: { fr: "Vision des pouvoirs", en: "Power sight" },
    description: {
      fr: "Sur le parcours : les quêtes bonus verrouillées indiquent quel pouvoir manque dans l'arbre.",
      en: "On the path: locked bonus quests show which power is missing in the skill tree.",
    },
    cost: 70,
    prerequisites: ["extra_hint"],
    effectKind: "passive",
    branch: "utility",
    position: { x: -2, y: 1 },
  },
  {
    id: "skip_path_anim",
    name: { fr: "Chemin express", en: "Express path" },
    description: {
      fr: "Préférence locale : désactive l'animation du jeton sur le parcours (transitions plus rapides).",
      en: "Local preference: disables the token animation on the path (faster transitions).",
    },
    cost: 60,
    prerequisites: ["root"],
    effectKind: "passive",
    branch: "utility",
    position: { x: -2, y: 2 },
  },
  {
    id: "fantasy_codex",
    name: { fr: "Codex fantasy", en: "Fantasy codex" },
    description: {
      fr: "Affiche le panneau de règles détaillé dans les puzzles fantasy.",
      en: "Shows the detailed rules panel in fantasy puzzles.",
    },
    cost: 50,
    prerequisites: ["root"],
    effectKind: "passive",
    branch: "utility",
    position: { x: -2, y: 3 },
  },
  {
    id: "card_aura",
    name: { fr: "Aura de carte", en: "Card aura" },
    description: { fr: "Renforce l'effet visuel de votre carte.", en: "Enhances your card visual aura." },
    cost: 150,
    prerequisites: ["undo_move", "rook_tunnel"],
    effectKind: "cosmetic",
    branch: "prestige",
    position: { x: 0, y: 4 },
  },
];

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
