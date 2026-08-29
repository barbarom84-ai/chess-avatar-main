import type { EngineConfig, PersonaStats } from "@/lib/analysis";

export const CHESS_AVATAR_PRO_COACH_ID = "chess-avatar-pro";

/** Built-in house coach for game review. */
export const CHESS_AVATAR_PRO_STATS: PersonaStats = {
  username: "ChessAvatarPro",
  avatarUrl: "/knight-logo.png",
  gameCount: 0,
  winRate: 55,
  drawRate: 25,
  lossRate: 20,
  style: "Équilibré",
  topOpenings: [{ name: "Italienne", count: 1 }],
  avgMoves: 40,
};

export const CHESS_AVATAR_PRO_CONFIG: EngineConfig = {
  name: "ChessAvatarPro",
  avatarUrl: "/knight-logo.png",
  elo: 2400,
  difficulty: 4,
  aggressiveness: 55,
  threads: 2,
  depth: 16,
  timeControl: 1000,
  favoriteOpening: "Italienne",
  playStyle: "équilibré",
  openings: {},
};

export function slimCoachFromConfig(config: EngineConfig): EngineConfig {
  return {
    name: config.name,
    avatarUrl: config.avatarUrl,
    platform: config.platform,
    elo: config.elo,
    difficulty: config.difficulty,
    aggressiveness: config.aggressiveness,
    threads: 2,
    depth: config.depth,
    timeControl: config.timeControl,
    favoriteOpening: config.favoriteOpening,
    playStyle: config.playStyle,
    openings: {},
  };
}
