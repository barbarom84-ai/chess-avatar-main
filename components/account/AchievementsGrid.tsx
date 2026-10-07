"use client";

import {
  Award,
  CalendarCheck,
  Crown,
  Flame,
  Footprints,
  Gem,
  Medal,
  Moon,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { fill } from "@/lib/account-format";
import type { Achievement, AchievementId } from "@/lib/account-types";
import { cn } from "@/lib/utils";
import type { AccountCopy } from "./types";

const ICONS: Record<AchievementId, LucideIcon> = {
  first_game: Footprints,
  first_win: Trophy,
  games_10: Medal,
  games_50: Award,
  games_100: Crown,
  win_streak_5: Flame,
  regular: CalendarCheck,
  collector: Sparkles,
  duelist: Swords,
  pvp_winner: Shield,
  ascension_bronze: Gem,
  ascension_gold: Gem,
  night_owl: Moon,
};

type AchievementsGridProps = {
  copy: AccountCopy;
  achievements: Achievement[];
};

export function AchievementsGrid({ copy, achievements }: AchievementsGridProps) {
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const sorted = [...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));

  return (
    <section className="account-card">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="account-card-title !mb-0">
          <Trophy aria-hidden />
          {copy.achievementsTitle}
        </h3>
        <span className="text-xs tabular-nums text-amber-300">
          {fill(copy.achievementsCount, { n: unlocked, total: achievements.length })}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-2 xl:grid-cols-3">
        {sorted.map((a) => {
          const Icon = ICONS[a.id] ?? Award;
          const text = copy.achievements[a.id];
          const pct = a.target > 0 ? Math.round((a.progress / a.target) * 100) : 0;
          return (
            <li key={a.id} className={cn("achievement", a.unlocked && "achievement--unlocked")}>
              <span className="achievement-icon">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-semibold truncate", a.unlocked ? "text-amber-100" : "text-slate-300")}>
                  {text?.title ?? a.id}
                </p>
                <p className="text-[11px] leading-snug text-slate-400 line-clamp-2 sm:line-clamp-none sm:truncate">
                  {text?.desc}
                </p>
                {!a.unlocked && a.target > 1 && !a.id.startsWith("ascension_") && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="account-progress flex-1">
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] tabular-nums text-slate-400">
                      {a.progress}/{a.target}
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
