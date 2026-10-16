import type { EngineConfig, PersonaStats } from "@/lib/analysis";

export type ProfileOption = {
  key: string;
  label: string;
  config: EngineConfig;
  stats?: PersonaStats;
  savedAt: number;
  /** Local human player: moves come from the board, not from the engine. */
  human?: boolean;
};
