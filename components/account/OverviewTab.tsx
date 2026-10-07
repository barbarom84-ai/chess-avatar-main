"use client";

import Link from "next/link";
import { Bot, ChevronRight, Crown, Gamepad2, History, Hourglass, Star, Target, Trophy, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fill, formatPlayTime } from "@/lib/account-format";
import type { AccountStats } from "@/lib/account-types";
import { StatTile, StatTileSkeleton } from "./StatTile";
import { RecentGamesList } from "./RecentGamesList";
import { AscensionProgressCard } from "./AscensionProgressCard";
import { StatsError } from "./StatsTab";
import type { AccountCopy } from "./types";

type OverviewTabProps = {
  copy: AccountCopy;
  lang: string;
  pvpLabel: string;
  stats: AccountStats | null;
  statsLoading: boolean;
  statsError: boolean;
  onRetry: () => void;
  playerName: string;
  isPremium: boolean;
  premiumLoading: boolean;
  onUpgrade: () => void;
};

export function OverviewTab({
  copy,
  lang,
  pvpLabel,
  stats,
  statsLoading,
  statsError,
  onRetry,
  playerName,
  isPremium,
  premiumLoading,
  onUpgrade,
}: OverviewTabProps) {
  const shortcuts = [
    { href: "/avatars", icon: Bot, label: copy.ctaAvatars, desc: copy.shortcutAvatarsDesc, meta: stats ? String(stats.avatars) : null },
    { href: "/games", icon: History, label: copy.ctaGames, desc: copy.shortcutGamesDesc, meta: stats ? String(stats.bots.total) : null },
    { href: "/ascension", icon: Star, label: copy.ascensionLink, desc: copy.shortcutAscensionDesc, meta: null },
    { href: "/online", icon: Gamepad2, label: pvpLabel, desc: copy.shortcutPvpDesc, meta: stats ? String(stats.pvp.total) : null },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4 min-w-0">
        <section aria-label={copy.stats.overviewTitle}>
          {stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatTile icon={Swords} label={copy.hero.games} value={String(stats.overview.totalGames)} hint={`${copy.recent.bot} ${stats.bots.total} · ${copy.recent.pvp} ${stats.pvp.total}`} />
              <StatTile icon={Target} label={copy.hero.winRate} value={`${Math.round(stats.overview.winRate)} %`} accentClassName="text-emerald-300" />
              <StatTile
                icon={Trophy}
                label={copy.stats.bestStreak}
                value={stats.overview.bestWinStreak > 0 ? fill(copy.stats.bestStreakValue, { n: stats.overview.bestWinStreak }) : copy.stats.none}
                accentClassName="text-amber-300"
              />
              <StatTile icon={Hourglass} label={copy.stats.playTime} value={formatPlayTime(stats.bots.totalPlaySeconds)} accentClassName="text-violet-300" />
            </div>
          ) : statsError && !statsLoading ? (
            <StatsError copy={copy} onRetry={onRetry} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <StatTileSkeleton key={i} />
              ))}
            </div>
          )}
        </section>

        <RecentGamesList copy={copy} lang={lang} games={stats ? stats.recentGames : statsError ? [] : null} playerName={playerName} />

        <section className="account-card">
          <h3 className="account-card-title">{copy.shortcutsTitle}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {shortcuts.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 min-h-14 hover:border-cyan-500/40 hover:bg-slate-900 transition-colors"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300">
                  <item.icon className="h-4.5 w-4.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-100 truncate">{item.label}</span>
                    {item.meta !== null && <span className="text-xs tabular-nums text-cyan-300">{item.meta}</span>}
                  </span>
                  <span className="block text-xs text-slate-400 truncate">{item.desc}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-300 shrink-0" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1 content-start">
        <AscensionProgressCard copy={copy} ascension={stats?.ascension} loading={statsLoading} />

        <section className="account-card">
          <h3 className="account-card-title">
            <Crown aria-hidden className="!text-amber-300" />
            {copy.subscriptionTitle}
          </h3>
          {isPremium ? (
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/50 gap-1 mb-2">
              <Crown className="h-3 w-3" />
              {copy.premiumBadge}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-300 border-slate-600 mb-2">
              {copy.freeAccount}
            </Badge>
          )}
          <p className="text-sm text-slate-400">{isPremium ? copy.subscriptionPremiumDesc : copy.subscriptionFreeDesc}</p>
          {!isPremium && !premiumLoading && (
            <Button
              type="button"
              size="sm"
              className="mt-3 min-h-10 w-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-semibold hover:from-amber-400 hover:to-orange-400"
              onClick={onUpgrade}
            >
              <Crown className="h-3.5 w-3.5 mr-1" />
              {copy.upgradeCta}
            </Button>
          )}
        </section>
      </div>
    </div>
  );
}
