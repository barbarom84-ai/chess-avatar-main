import type { EngineConfig, PersonaStats } from "@/lib/analysis";
import { clampProfileElo } from "@/lib/elo-bounds";
import {
  findImprovementAreas,
  findStrengths,
  seedFromContext,
} from "@/lib/ai-analysis";
import { createDefaultPlayingStyle } from "@/lib/profile-metadata";
import type { AIAnalysis } from "@/lib/ai-analysis";
import type { ProfileMetadata, PlayingStyle } from "@/types/chess";

export type AvatarCardRarity = "common" | "rare" | "epic" | "legendary";
export type AvatarCardElement = "fire" | "earth" | "water" | "air" | "neutral";

export type AvatarCardModel = {
  name: string;
  avatarUrl?: string;
  platform?: "lichess" | "chesscom";
  rarity: AvatarCardRarity;
  elo: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  classKey: EngineConfig["playStyle"];
  element: AvatarCardElement;
  abilityText: string;
  strengths: string[];
  weaknesses: string[];
  topOpening?: string;
  winRate?: number;
  drawRate?: number;
  lossRate?: number;
  gameCount?: number;
  aggressiveness: number;
  depth: number;
  timeControl?: number;
  threads?: number;
  styleTactical?: number;
  stylePositional?: number;
  styleEndgame?: number;
  styleOpening?: number;
  styleAggression?: number;
  tags?: string[];
};

export type AvatarCardLabels = {
  playStyles: Record<EngineConfig["playStyle"], string>;
  elements: Record<AvatarCardElement, string>;
  rarities: Record<AvatarCardRarity, string>;
  strengths: string;
  weaknesses: string;
  ability: string;
  games: string;
  morale: string;
  flipHint: string;
  backEngine: string;
  backTraits: string;
  backStyle: string;
  backRecord: string;
  backOpening: string;
  tactical: string;
  positional: string;
  endgame: string;
  openingTheory: string;
  timeControl: string;
  threads: string;
};

export function resolveCardRarity(
  difficulty: number,
  elo: number
): AvatarCardRarity {
  if (difficulty >= 5 || elo >= 3000) return "legendary";
  if (difficulty >= 4) return "epic";
  if (difficulty >= 3) return "rare";
  return "common";
}

export function playStyleToElement(
  playStyle: EngineConfig["playStyle"]
): AvatarCardElement {
  switch (playStyle) {
    case "tactique":
      return "fire";
    case "agressif":
      return "fire";
    case "solide":
      return "earth";
    case "positionnel":
      return "water";
    case "équilibré":
      return "air";
    default:
      return "neutral";
  }
}

/** Dérive un PlayingStyle à partir du moteur + métadonnées optionnelles. */
export function derivePlayingStyle(
  config: EngineConfig,
  metadata?: ProfileMetadata | null
): PlayingStyle {
  if (metadata?.playingStyle) {
    return { ...metadata.playingStyle };
  }
  const base = createDefaultPlayingStyle();
  base.aggression = config.aggressiveness;
  switch (config.playStyle) {
    case "agressif":
      base.tactical = Math.max(base.tactical, 75);
      base.aggression = Math.max(base.aggression, 70);
      break;
    case "tactique":
      base.tactical = Math.max(base.tactical, 85);
      break;
    case "solide":
      base.positional = Math.max(base.positional, 75);
      base.endgame = Math.max(base.endgame, 70);
      base.aggression = Math.min(base.aggression, 45);
      break;
    case "positionnel":
      base.positional = Math.max(base.positional, 85);
      base.openingTheory = Math.max(base.openingTheory, 65);
      break;
    case "équilibré":
      break;
  }
  return base;
}

function applyStatsToPlayingStyle(
  style: PlayingStyle,
  stats: PersonaStats
): PlayingStyle {
  const next = { ...style };
  if ((stats.gameCount ?? 0) < 5) return next;
  next.tactical = Math.min(
    99,
    next.tactical + Math.round((stats.winRate - 50) * 0.15)
  );
  if (stats.avgMoves >= 42) next.endgame = Math.min(99, next.endgame + 8);
  if (stats.avgMoves > 0 && stats.avgMoves <= 32) {
    next.tactical = Math.min(99, next.tactical + 6);
    next.timeManagement = Math.min(99, next.timeManagement + 5);
  }
  if (stats.drawRate >= 40) {
    next.positional = Math.min(99, next.positional + 5);
  }
  return next;
}

function resolveCardClassKey(
  config: EngineConfig,
  playingStyle: PlayingStyle,
  stats?: PersonaStats
): EngineConfig["playStyle"] {
  if ((stats?.gameCount ?? 0) < 5) return config.playStyle;
  const axes: { key: EngineConfig["playStyle"]; value: number }[] = [
    { key: "agressif", value: playingStyle.aggression },
    { key: "tactique", value: playingStyle.tactical },
    { key: "positionnel", value: playingStyle.positional },
  ];
  axes.sort((a, b) => b.value - a.value);
  if (axes[0].value - axes[1].value >= 8) return axes[0].key;
  if (playingStyle.endgame >= 82 && playingStyle.positional >= 75) {
    return "solide";
  }
  return config.playStyle;
}

function buildAbilityText(
  config: EngineConfig,
  stats?: PersonaStats
): string {
  const opening =
    stats?.topOpenings?.[0]?.name ||
    config.favoriteOpening ||
    "";
  const openingPart = opening
    ? `Répertoire : ${opening}${
        stats?.topOpenings?.[0]?.count
          ? ` (${stats.topOpenings[0].count})`
          : ""
      }`
    : config.favoriteOpening
      ? `Ouverture : ${config.favoriteOpening}`
      : "";
  const aggPart = `Agressivité ${config.aggressiveness}%`;
  return [openingPart, aggPart].filter(Boolean).join(" · ");
}

/** Stats minimales quand seul EngineConfig est disponible (Arène, play bar). */
export function minimalPersonaStatsFromConfig(
  config: EngineConfig,
  displayName?: string
): PersonaStats {
  return {
    username: displayName || config.name || "Avatar",
    avatarUrl: config.avatarUrl,
    platform: config.platform,
    gameCount: 0,
    winRate: 50,
    drawRate: 25,
    lossRate: 25,
    style: "Équilibré",
    topOpenings: config.favoriteOpening
      ? [{ name: config.favoriteOpening, count: 1 }]
      : [],
    avgMoves: 40,
  };
}

export type BuildAvatarCardModelInput = {
  stats: PersonaStats;
  config: EngineConfig;
  metadata?: ProfileMetadata | null;
  analysis?: AIAnalysis | null;
  labels: AvatarCardLabels;
};

export function buildAvatarCardModel({
  stats,
  config,
  metadata,
  analysis,
  labels,
}: BuildAvatarCardModelInput): AvatarCardModel {
  let playingStyle = derivePlayingStyle(config, metadata);
  playingStyle = applyStatsToPlayingStyle(playingStyle, stats);
  const seed = seedFromContext(playingStyle, stats);
  const classKey = resolveCardClassKey(config, playingStyle, stats);

  let strengths =
    metadata?.strengths?.length
      ? metadata.strengths.slice(0, 3)
      : analysis?.strengths?.length
        ? analysis.strengths.slice(0, 3)
        : findStrengths(playingStyle, seed, stats).slice(0, 3);

  let weaknesses =
    metadata?.weaknesses?.length
      ? metadata.weaknesses.slice(0, 3)
      : analysis?.improvementAreas?.length
        ? analysis.improvementAreas.slice(0, 3)
        : findImprovementAreas(playingStyle, stats, seed).slice(0, 3);

  if ((config.elo ?? 0) >= 3000) {
    const eloTag =
      config.elo >= 3200
        ? "Force mondiale (3200+)"
        : "Niveau super-GM (3000+)";
    if (!strengths.includes(eloTag)) {
      strengths = [eloTag, ...strengths].slice(0, 3);
    }
  }

  const topOpening =
    stats.topOpenings?.[0]?.name || config.favoriteOpening || undefined;

  return {
    name: config.name || stats.username,
    avatarUrl: config.avatarUrl || stats.avatarUrl,
    platform: config.platform || stats.platform,
    rarity: resolveCardRarity(config.difficulty, config.elo),
    elo: clampProfileElo(config.elo),
    difficulty: config.difficulty,
    classKey,
    element: playStyleToElement(config.playStyle),
    abilityText: buildAbilityText(config, stats),
    strengths,
    weaknesses,
    topOpening,
    winRate: stats.winRate,
    drawRate: stats.drawRate,
    lossRate: stats.lossRate,
    gameCount: stats.gameCount,
    aggressiveness: config.aggressiveness,
    depth: config.depth,
    timeControl: config.timeControl,
    threads: config.threads,
    styleTactical: playingStyle.tactical,
    stylePositional: playingStyle.positional,
    styleEndgame: playingStyle.endgame,
    styleOpening: playingStyle.openingTheory,
    styleAggression: playingStyle.aggression,
    tags: metadata?.tags?.slice(0, 3),
  };
}
