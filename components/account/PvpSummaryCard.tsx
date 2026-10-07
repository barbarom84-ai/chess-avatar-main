"use client";

import Link from "next/link";
import { Gamepad2, Medal, Swords, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fill } from "@/lib/account-format";
import type { AccountStats } from "@/lib/account-types";
import type { AccountCopy } from "./types";

type PvpSummaryCardProps = {
  copy: AccountCopy;
  pvp: AccountStats["pvp"];
};

export function PvpSummaryCard({ copy, pvp }: PvpSummaryCardProps) {
  const total = Math.max(1, pvp.total);
  const segments = [
    { key: "win", value: pvp.wins, className: "bg-emerald-400" },
    { key: "draw", value: pvp.draws, className: "bg-slate-400" },
    { key: "loss", value: pvp.losses, className: "bg-rose-400" },
  ];

  return (
    <section className="account-card border-violet-500/25">
      <h3 className="account-card-title">
        <Gamepad2 aria-hidden className="!text-violet-300" />
        {copy.pvp.title}
      </h3>

      {pvp.total === 0 && !pvp.league ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">{copy.pvp.emptyBody}</p>
          <Button asChild size="sm" className="min-h-10 bg-violet-600 hover:bg-violet-500 text-white">
            <Link href="/online">{copy.pvp.emptyCta}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex items-end justify-between gap-2">
              <div className="flex gap-4">
                {[
                  { value: pvp.wins, label: copy.stats.wins, className: "text-emerald-300" },
                  { value: pvp.draws, label: copy.stats.draws, className: "text-slate-200" },
                  { value: pvp.losses, label: copy.stats.losses, className: "text-rose-300" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className={`text-2xl font-bold tabular-nums leading-none ${item.className}`}>{item.value}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 pb-0.5">{fill(copy.pvp.winRate, { rate: Math.round(pvp.winRate) })}</p>
            </div>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-800" aria-hidden>
              {segments.map((s) =>
                s.value > 0 ? (
                  <span key={s.key} className={s.className} style={{ width: `${(s.value / total) * 100}%` }} />
                ) : null
              )}
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-2 text-sm">
            <PvpRow icon={Swords} label={copy.pvp.favoriteOpponent}>
              {pvp.favoriteOpponent ? (
                <Link href={`/players/${pvp.favoriteOpponent.userId}`} className="text-violet-200 hover:text-violet-100 truncate">
                  {fill(copy.pvp.favoriteOpponentValue, { name: pvp.favoriteOpponent.name, n: pvp.favoriteOpponent.count })}
                </Link>
              ) : (
                copy.stats.none
              )}
            </PvpRow>
            <PvpRow icon={Timer} label={copy.pvp.favoriteCategory}>
              {pvp.favoriteCategory ? copy.pvpCategory[pvp.favoriteCategory] : copy.stats.none}
            </PvpRow>
            <PvpRow icon={Medal} label={copy.pvp.league}>
              {pvp.league ? fill(copy.pvp.leagueValue, { rating: pvp.league.rating, rank: pvp.league.rank }) : copy.stats.none}
            </PvpRow>
          </dl>
        </div>
      )}
    </section>
  );
}

function PvpRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Swords;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/50 px-3 py-2 min-h-11">
      <dt className="flex items-center gap-2 text-slate-400 text-xs shrink-0">
        <Icon className="h-3.5 w-3.5 text-violet-300" aria-hidden />
        {label}
      </dt>
      <dd className="font-medium text-slate-100 text-right min-w-0 truncate">{children}</dd>
    </div>
  );
}
