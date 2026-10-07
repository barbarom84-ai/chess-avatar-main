import type { AccountStats, Achievement, AchievementId } from "@/lib/account-types";
import { TIER_ORDER } from "@/lib/ascension/tiers";
import type { ChampionTier } from "@/lib/ascension/types";

type StatsWithoutAchievements = Omit<AccountStats, "achievements">;

function tierRank(tier: string | null | undefined): number {
  const idx = TIER_ORDER.indexOf((tier ?? "stone") as ChampionTier);
  return idx < 0 ? 0 : idx;
}

const RULES: { id: AchievementId; target: number; value: (s: StatsWithoutAchievements) => number }[] = [
  { id: "first_game", target: 1, value: (s) => s.overview.totalGames },
  { id: "first_win", target: 1, value: (s) => s.overview.wins },
  { id: "games_10", target: 10, value: (s) => s.overview.totalGames },
  { id: "games_50", target: 50, value: (s) => s.overview.totalGames },
  { id: "games_100", target: 100, value: (s) => s.overview.totalGames },
  { id: "win_streak_5", target: 5, value: (s) => s.overview.bestWinStreak },
  { id: "regular", target: 7, value: (s) => s.activity.bestDayStreak },
  { id: "collector", target: 5, value: (s) => s.avatars },
  { id: "duelist", target: 10, value: (s) => s.pvp.total },
  { id: "pvp_winner", target: 1, value: (s) => s.pvp.wins },
  { id: "ascension_bronze", target: tierRank("bronze"), value: (s) => tierRank(s.ascension?.tier) },
  { id: "ascension_gold", target: tierRank("gold"), value: (s) => tierRank(s.ascension?.tier) },
  { id: "night_owl", target: 1, value: (s) => (s.activity.playedAtNight ? 1 : 0) },
];

export const ACHIEVEMENT_IDS: AchievementId[] = RULES.map((r) => r.id);

export function computeAchievements(stats: StatsWithoutAchievements): Achievement[] {
  return RULES.map(({ id, target, value }) => {
    const raw = Math.max(0, value(stats));
    return { id, target, progress: Math.min(raw, target), unlocked: raw >= target };
  });
}
