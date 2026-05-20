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
  };
}
