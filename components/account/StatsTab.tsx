"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Bot,
  CalendarCheck,
  Clock,
  Flame,
  Hourglass,
  ListOrdered,
  Sparkles,
  Sunrise,
  Target,
  Trophy,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fill, formatPlayTime, formatStreak } from "@/lib/account-format";
import type { AccountStats } from "@/lib/account-types";
import { StatTile, StatTileSkeleton } from "./StatTile";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { PvpSummaryCard } from "./PvpSummaryCard";
import { AchievementsGrid } from "./AchievementsGrid";
import { AscensionProgressCard } from "./AscensionProgressCard";
import type { AccountCopy } from "./types";

const ResultsCharts = dynamic(() => import("./ResultsCharts"), {
  ssr: false,
  loading: () => <div className="account-card account-skeleton h-64" />,
});

type StatsTabProps = {
  copy: AccountCopy;
  lang: string;
  stats: AccountStats | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

export function StatsTab({ copy, lang, stats, loading, error, onRetry }: StatsTabProps) {
  if (!stats) {
    if (error && !loading) return <StatsError copy={copy} onRetry={onRetry} />;
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => (
          <StatTileSkeleton key={i} />
        ))}
      </div>
    );
  }

  const { bots, overview, activity } = stats;
  const hasGames = overview.totalGames > 0;
  const tiles = [
    { icon: Bot, label: copy.stats.botGames, value: String(bots.total) },
    { icon: Target, label: copy.stats.botWinRate, value: `${Math.round(bots.winRate)} %` },
    { icon: Flame, label: copy.stats.currentStreak, value: formatStreak(overview.currentStreak, copy.streakShort, copy.stats.none) },
    { icon: Trophy, label: copy.stats.bestStreak, value: overview.bestWinStreak > 0 ? fill(copy.stats.bestStreakValue, { n: overview.bestWinStreak }) : copy.stats.none },
    { icon: Hourglass, label: copy.stats.playTime, value: formatPlayTime(bots.totalPlaySeconds) },
    { icon: ListOrdered, label: copy.stats.avgMoves, value: bots.avgMoves === null ? copy.stats.none : String(bots.avgMoves) },
    { icon: CalendarCheck, label: copy.stats.activeDays, value: String(activity.activeDays) },
    { icon: Sparkles, label: copy.stats.avatars, value: String(stats.avatars) },
  ];

  return (
    <div className="space-y-4">
      {!hasGames && (
        <section className="account-card text-center py-8">
          <p className="text-lg font-semibold text-slate-100">{copy.stats.emptyTitle}</p>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">{copy.stats.emptyBody}</p>
          <Button asChild className="mt-4 min-h-11 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold">
            <Link href="/avatars">{copy.stats.emptyCta}</Link>
          </Button>
        </section>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {tiles.map((tile) => (
          <StatTile key={tile.label} {...tile} />
        ))}
        <StatTile
          icon={UserRound}
          label={copy.stats.favoriteOpponent}
          value={bots.favoriteOpponent ? bots.favoriteOpponent.name : copy.stats.none}
          hint={bots.favoriteOpponent ? fill(copy.stats.gamesCount, { n: bots.favoriteOpponent.count }) : undefined}
          small
        />
        <StatTile
          icon={activity.favoriteTimeOfDay === "night" ? Clock : Sunrise}
          label={copy.stats.favoriteTime}
          value={activity.favoriteTimeOfDay ? copy.timeOfDay[activity.favoriteTimeOfDay] : copy.stats.none}
          small
        />
      </div>

      {hasGames && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ActivityHeatmap copy={copy} lang={lang} activity={activity} />
          <ResultsCharts copy={copy} stats={stats} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PvpSummaryCard copy={copy} pvp={stats.pvp} />
        <AscensionProgressCard copy={copy} ascension={stats.ascension} loading={false} />
      </div>

      <AchievementsGrid copy={copy} achievements={stats.achievements} />
    </div>
  );
}

export function StatsError({ copy, onRetry }: { copy: AccountCopy; onRetry: () => void }) {
  return (
    <section className="account-card flex flex-col items-center gap-3 py-8 text-center">
      <p className="text-sm text-slate-300">{copy.stats.loadError}</p>
      <Button type="button" variant="outline" className="min-h-10 border-slate-600" onClick={onRetry}>
        {copy.stats.retry}
      </Button>
    </section>
  );
}
