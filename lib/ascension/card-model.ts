import type { DbPlayerChampionCard } from "@/lib/ascension/types";
import type { ChampionCardModel } from "@/lib/ascension/types";
import type { EngineConfig } from "@/lib/analysis";
import type { AvatarCardElement } from "@/lib/avatar-card-model";

export function dbCardToModel(card: DbPlayerChampionCard): ChampionCardModel {
  return {
    displayName: card.display_name,
    avatarUrl: card.avatar_url ?? undefined,
    classKey: card.class_key as EngineConfig["playStyle"],
    element: card.element as AvatarCardElement,
    elo: card.elo,
    xp: card.xp,
    tier: card.tier,
    customization: card.customization ?? {},
  };
}
