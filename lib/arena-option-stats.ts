import type { PersonaStats } from "@/lib/analysis";
import type { ProfileOption } from "@/lib/arena-types";
import { minimalPersonaStatsFromConfig } from "@/lib/avatar-card-model";

export function statsForArenaOption(option: ProfileOption): PersonaStats {
  if (option.stats && (option.stats.gameCount ?? 0) > 0) {
    return option.stats;
  }
  return minimalPersonaStatsFromConfig(
    option.config,
    option.config.name || option.label
  );
}
