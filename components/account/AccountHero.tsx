"use client";

import { Crown, Flame, Pencil, Swords, Trophy } from "lucide-react";
import AccountAvatar from "@/components/AccountAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { accountProfileInitials } from "@/lib/account-profile";
import { fill, formatRelativeDate, formatStreak } from "@/lib/account-format";
import type { AccountProfile, AccountStats } from "@/lib/account-types";
import type { AccountCopy } from "./types";

type AccountHeroProps = {
  copy: AccountCopy;
  lang: string;
  profile: AccountProfile;
  email: string;
  memberSinceLabel: string | null;
  isPremium: boolean;
  premiumLoading: boolean;
  stats: AccountStats | null;
  statsLoading: boolean;
  onEdit: () => void;
  onUpgrade: () => void;
};

export function AccountHero({
  copy,
  lang,
  profile,
  email,
  memberSinceLabel,
  isPremium,
  premiumLoading,
  stats,
  statsLoading,
  onEdit,
  onUpgrade,
}: AccountHeroProps) {
  const overview = stats?.overview;
  const heroStats = [
    { icon: Swords, label: copy.hero.games, value: overview ? String(overview.totalGames) : "—" },
    { icon: Trophy, label: copy.hero.winRate, value: overview ? `${Math.round(overview.winRate)} %` : "—" },
    {
      icon: Flame,
      label: copy.hero.streak,
      value: overview ? formatStreak(overview.currentStreak, copy.streakShort, copy.hero.noStreak) : "—",
    },
  ];

  const lastPlayed = overview?.lastPlayedAt
    ? fill(copy.hero.lastPlayed, { when: formatRelativeDate(overview.lastPlayedAt, lang) })
    : overview
      ? copy.hero.neverPlayed
      : null;

  return (
    <section className="account-hero p-4 sm:p-6 md:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 min-w-0">
          <div className="account-avatar-ring shrink-0 sm:row-span-2">
            <div className="relative h-16 w-16 sm:h-24 sm:w-24 overflow-hidden rounded-full bg-gradient-to-br from-cyan-600 to-blue-800 border-2 border-slate-950">
              <AccountAvatar
                src={profile.avatarUrl}
                alt={profile.displayName}
                initials={accountProfileInitials(profile.displayName)}
                sizes="96px"
                className="text-2xl"
              />
            </div>
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-50 truncate max-w-full">
                {profile.displayName}
              </h2>
              {!premiumLoading &&
                (isPremium ? (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/50 gap-1">
                    <Crown className="h-3 w-3" />
                    {copy.premiumBadge}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-300 border-slate-600">
                    {copy.freeAccount}
                  </Badge>
                ))}
            </div>
            <p className="text-sm text-slate-400 truncate">{email}</p>
            <p className="text-xs text-slate-400">
              {memberSinceLabel && `${copy.memberSince} ${memberSinceLabel}`}
              {memberSinceLabel && lastPlayed && " · "}
              {lastPlayed}
            </p>
          </div>
          <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1 sm:col-start-2 [&>*]:flex-1 sm:[&>*]:flex-none">
            <Button type="button" size="sm" variant="outline" className="border-slate-600 bg-slate-950/40 min-h-9" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              {copy.editProfile}
            </Button>
            {!isPremium && !premiumLoading && (
              <Button
                type="button"
                size="sm"
                className="min-h-9 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:from-amber-400 hover:to-orange-400"
                onClick={onUpgrade}
              >
                <Crown className="h-3.5 w-3.5 mr-1" />
                {copy.upgradeCta}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 lg:w-[22rem] shrink-0">
          {heroStats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="account-hero-stat">
              {statsLoading && !stats ? (
                <div className="account-skeleton h-6 w-10 mx-auto" />
              ) : (
                <p className="text-lg sm:text-xl font-bold tabular-nums text-slate-50 truncate">{value}</p>
              )}
              <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-slate-400">
                <Icon className="h-3 w-3 text-cyan-300" aria-hidden />
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {profile.bio?.trim() && (
        <p className="mt-4 text-sm text-slate-300 whitespace-pre-wrap border-t border-slate-700/50 pt-4 line-clamp-4">
          {profile.bio}
        </p>
      )}
    </section>
  );
}
