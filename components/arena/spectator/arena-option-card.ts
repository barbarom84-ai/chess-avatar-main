import {
  buildAvatarCardModel,
  derivePlayingStyle,
  minimalPersonaStatsFromConfig,
} from "@/lib/avatar-card-model";
import { getAvatarCardLabels } from "@/lib/avatar-card-labels";
import { generateAIAnalysis } from "@/lib/ai-analysis";
import type { ProfileOption } from "@/lib/arena-types";

export function optionToCardModel(
  option: ProfileOption,
  labels: ReturnType<typeof getAvatarCardLabels>
) {
  const stats =
    option.stats && (option.stats.gameCount ?? 0) > 0
      ? option.stats
      : minimalPersonaStatsFromConfig(
          option.config,
          option.config.name || option.label
        );
  const playingStyle = derivePlayingStyle(option.config);
  const analysis = generateAIAnalysis(playingStyle, stats, stats.gameCount);
  return buildAvatarCardModel({
    stats,
    config: option.config,
    analysis,
    labels,
  });
}
