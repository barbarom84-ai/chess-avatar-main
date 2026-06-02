import type { AvatarCardLabels } from "@/lib/avatar-card-model";
import type { TranslationKey } from "@/lib/translations";

export function getAvatarCardLabels(t: TranslationKey): AvatarCardLabels {
  const ac = t.avatarCard;
  return {
    playStyles: ac.playStyles,
    elements: ac.elements,
    rarities: ac.rarities,
    strengths: ac.strengths,
    weaknesses: ac.weaknesses,
    ability: ac.ability,
    games: ac.games,
    morale: ac.morale,
    flipHint: ac.flipHint,
    backEngine: ac.backEngine,
    backTraits: ac.backTraits,
    backStyle: ac.backStyle,
    backRecord: ac.backRecord,
    backOpening: ac.backOpening,
    tactical: ac.tactical,
    positional: ac.positional,
    endgame: ac.endgame,
    openingTheory: ac.openingTheory,
    timeControl: ac.timeControl,
    threads: ac.threads,
    difficultyShort: ac.difficultyShort,
    abilityRepertoireWithCount: ac.abilityRepertoireWithCount,
    abilityRepertoire: ac.abilityRepertoire,
    abilityOpeningFallback: ac.abilityOpeningFallback,
    abilityAggression: ac.abilityAggression,
    eloStrengthWorld3200: ac.eloStrengthWorld3200,
    eloStrengthSuperGm3000: ac.eloStrengthSuperGm3000,
  };
}
