import {
  buildAvatarCardModel,
  minimalPersonaStatsFromConfig,
} from "@/lib/avatar-card-model";
import { getAvatarCardLabels } from "@/lib/avatar-card-labels";
import type { TraitLang } from "@/lib/avatar-trait-pools";
import type { ProfileOption } from "@/lib/arena-types";

export function optionToCardModel(
  option: ProfileOption,
  labels: ReturnType<typeof getAvatarCardLabels>,
  lang: TraitLang = "fr"
) {
  const stats =
    option.stats && (option.stats.gameCount ?? 0) > 0
      ? option.stats
      : minimalPersonaStatsFromConfig(
          option.config,
          option.config.name || option.label
        );
  return buildAvatarCardModel({
    stats,
    config: option.config,
    labels,
    lang,
  });
}
