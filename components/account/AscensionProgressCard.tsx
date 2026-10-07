"use client";

import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { PUZZLES_PER_TIER } from "@/lib/ascension/tiers";
import type { ChampionTier } from "@/lib/ascension/types";
import { fill } from "@/lib/account-format";
import type { AccountStats } from "@/lib/account-types";
import type { AccountCopy } from "./types";

const TIER_STYLES: Record<ChampionTier, string> = {
  stone: "from-slate-400 to-slate-600 text-slate-950",
  bronze: "from-orange-400 to-amber-700 text-amber-950",
  silver: "from-slate-200 to-slate-400 text-slate-900",
  gold: "from-yellow-300 to-amber-500 text-amber-950",
  platinum: "from-cyan-200 to-teal-400 text-teal-950",
  diamond: "from-sky-300 to-indigo-500 text-indigo-950",
  legendary: "from-fuchsia-400 via-amber-300 to-orange-500 text-slate-950",
};

type AscensionProgressCardProps = {
  copy: AccountCopy;
  ascension: AccountStats["ascension"] | undefined;
  loading: boolean;
};

export function AscensionProgressCard({ copy, ascension, loading }: AscensionProgressCardProps) {
  const { t } = useLanguage();
  const tierLabel = (tier: string | null) =>
    tier ? (t.ascension.tiers as Record<string, string>)[tier] ?? tier : "";

  return (
    <section className="account-card">
      <h3 className="account-card-title">
        <Star aria-hidden />
        {copy.ascension.title}
      </h3>

      {loading && ascension === undefined ? (
        <div className="space-y-3">
          <div className="account-skeleton h-12" />
          <div className="account-skeleton h-2" />
        </div>
      ) : !ascension ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">{copy.ascension.emptyBody}</p>
          <Button asChild size="sm" className="min-h-10 bg-violet-600 hover:bg-violet-500 text-white">
            <Link href="/ascension">{copy.ascension.emptyCta}</Link>
          </Button>
        </div>
      ) : (
        <AscensionDetails ascension={ascension} copy={copy} tierLabel={tierLabel} />
      )}
    </section>
  );
}

function AscensionDetails({
  ascension,
  copy,
  tierLabel,
}: {
  ascension: NonNullable<AccountStats["ascension"]>;
  copy: AccountCopy;
  tierLabel: (tier: string | null) => string;
}) {
  const tier = (ascension.tier in TIER_STYLES ? ascension.tier : "stone") as ChampionTier;
  const progress =
    ascension.toNextTier === null
      ? 100
      : Math.round(((PUZZLES_PER_TIER - ascension.toNextTier) / PUZZLES_PER_TIER) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-bold text-sm shadow-lg ${TIER_STYLES[tier]}`}
          aria-hidden
        >
          {tierLabel(tier).slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-100">{tierLabel(tier)}</p>
          <p className="text-xs text-slate-400 tabular-nums">
            {copy.ascension.elo} {ascension.elo} · {copy.ascension.xp} {ascension.xp}
          </p>
        </div>
        <Button asChild size="sm" variant="ghost" className="min-h-10 text-violet-300 shrink-0">
          <Link href="/ascension">
            {copy.ascension.open}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div>
        <div className="account-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1.5 flex justify-between gap-2 text-[11px] text-slate-400">
          <span>{fill(copy.ascension.puzzles, { n: ascension.puzzlesSolved })}</span>
          <span className="text-right">
            {ascension.toNextTier === null || !ascension.nextTier
              ? copy.ascension.maxTier
              : fill(copy.ascension.toNext, { n: ascension.toNextTier, tier: tierLabel(ascension.nextTier) })}
          </span>
        </p>
      </div>
    </div>
  );
}
