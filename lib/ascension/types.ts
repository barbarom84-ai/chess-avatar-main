import type { EngineConfig } from "@/lib/analysis";
import type { AvatarCardElement } from "@/lib/avatar-card-model";
import type { PieceAbilityId, SquareEffect } from "@/lib/ascension/fantasy-chess/types";

export type ChampionTier =
  | "stone"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "legendary";

export type CampaignPuzzleKind = "standard" | "fantasy";

export type CampaignTrack = "main" | "fantasy";

export type LocalizedText = { fr: string; en: string };

export interface ChampionCardCustomization {
  frame?: string;
  background?: string;
  badge?: string;
  achievements?: {
    elo_cap_3000?: string;
  };
}

export interface DbPlayerChampionCard {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  class_key: EngineConfig["playStyle"];
  element: AvatarCardElement;
  elo: number;
  xp: number;
  tier: ChampionTier;
  customization: ChampionCardCustomization;
  created_at: string;
  updated_at: string;
}

export interface DbPlayerSkillAllocation {
  id: string;
  user_id: string;
  skill_id: string;
  rank: number;
  unlocked_at: string;
}

export interface DbCampaignPuzzle {
  id: string;
  slug: string;
  kind: CampaignPuzzleKind;
  min_elo: number;
  max_elo: number;
  xp_reward: number;
  elo_reward: number;
  fen: string;
  solution_ucis: string[];
  fantasy_rules: {
    enabledAbilities?: PieceAbilityId[];
    objective?: "checkmate" | "capture_piece" | "reach_square";
    objectiveSquare?: string;
    objectivePiece?: string;
    specialSquares?: SquareEffect[];
  };
  prompt: LocalizedText;
  hints: LocalizedText[];
  insight: LocalizedText;
  sort_order: number;
  track: CampaignTrack;
  is_published: boolean;
  updated_at?: string;
}

export interface DbPlayerPuzzleCompletion {
  id: string;
  user_id: string;
  puzzle_id: string;
  completed_at: string;
  attempts: number;
  best_time_ms: number | null;
}

export interface ChampionCardModel {
  displayName: string;
  avatarUrl?: string;
  classKey: EngineConfig["playStyle"];
  element: AvatarCardElement;
  elo: number;
  xp: number;
  tier: ChampionTier;
  customization: ChampionCardCustomization;
}

export interface AscensionState {
  card: ChampionCardModel;
  unlockedSkills: string[];
  completedPuzzleIds: string[];
}
