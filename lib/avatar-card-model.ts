import type { EngineConfig, PersonaStats } from "@/lib/analysis";
import { clampProfileElo } from "@/lib/elo-bounds";
import {
  findImprovementAreas,
  findStrengths,
  seedFromContext,
} from "@/lib/ai-analysis";
import { createDefaultPlayingStyle } from "@/lib/profile-metadata";
import type { TraitLang } from "@/lib/avatar-trait-pools";
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
  flipHintShort: string;
  fullProfile: string;
  fullProfileHint: string;
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
  difficultyShort: string;
  abilityRepertoireWithCount: string;
  abilityRepertoire: string;
  abilityOpeningFallback: string;
  abilityAggression: string;
  eloStrengthWorld3200: string;
  eloStrengthSuperGm3000: string;
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

/** Nom d'ouverture lisible sur une carte (sans coups ni sous-variante). */
export function shortOpeningName(raw: string): string {
  const noMoves = raw.replace(/\s+\d+\.[\s\S]*$/, "").trim();
  const noFlavor = noMoves.split(/[:(\[]/)[0]?.trim() ?? noMoves;
  return noFlavor || raw;
}

function buildAbilityText(
  config: EngineConfig,
  stats: PersonaStats | undefined,
  labels: AvatarCardLabels
): string {
  const opening =
    stats?.topOpenings?.[0]?.name ||
    config.favoriteOpening ||
    "";
  if (opening) return shortOpeningName(opening);
  return labels.abilityAggression.replace(
    "{n}",
    String(config.aggressiveness)
  );
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
  analysis?: import("@/lib/ai-analysis").AIAnalysis | null;
  labels: AvatarCardLabels;
  lang?: TraitLang;
};

export function buildAvatarCardModel({
  stats,
  config,
  metadata,
  labels,
  lang = "fr",
}: BuildAvatarCardModelInput): AvatarCardModel {
  let playingStyle = derivePlayingStyle(config, metadata);
  playingStyle = applyStatsToPlayingStyle(playingStyle, stats);
  const seed = seedFromContext(playingStyle, stats);
  const classKey = resolveCardClassKey(config, playingStyle, stats);

  let strengths = findStrengths(playingStyle, seed, stats, lang).slice(0, 3);
  const weaknesses = findImprovementAreas(playingStyle, stats, seed, lang).slice(0, 3);

  if ((config.elo ?? 0) >= 3000) {
    const eloTag =
      config.elo >= 3200
        ? labels.eloStrengthWorld3200
        : labels.eloStrengthSuperGm3000;
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
    abilityText: buildAbilityText(config, stats, labels),
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
