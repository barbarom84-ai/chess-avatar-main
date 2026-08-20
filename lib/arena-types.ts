import type { EngineConfig, PersonaStats } from "@/lib/analysis";

export type ProfileOption = {
  key: string;
  label: string;
  config: EngineConfig;
  stats?: PersonaStats;
  savedAt: number;
};
