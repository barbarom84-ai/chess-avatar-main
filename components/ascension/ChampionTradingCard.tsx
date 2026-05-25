"use client";

import Image from "next/image";
import { Crown, Flame, Mountain, Droplets, Wind, Circle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ChampionCardModel, ChampionTier } from "@/lib/ascension/types";
import { eloToNextTier } from "@/lib/ascension/tiers";
import { useLanguage } from "@/lib/language-context";

const ELEMENT_ICONS = {
  fire: Flame,
  earth: Mountain,
  water: Droplets,
  air: Wind,
  neutral: Circle,
} as const;

const TIER_STYLES: Record<ChampionTier, string> = {
  stone: "border-slate-600/80 shadow-none",
  bronze: "border-amber-700/80 shadow-amber-900/20",
  silver: "border-slate-300/70 shadow-slate-400/20",
  gold: "border-yellow-500/80 shadow-yellow-500/30",
  platinum: "border-cyan-300/80 shadow-cyan-400/30",
  diamond: "border-blue-300/80 shadow-blue-400/40",
  legendary: "border-purple-400/90 shadow-purple-500/50 ring-1 ring-purple-400/40",
};

interface ChampionTradingCardProps {
  model: ChampionCardModel;
  className?: string;
}

export default function ChampionTradingCard({ model, className = "" }: ChampionTradingCardProps) {
  const { t } = useLanguage();
  const ElementIcon = ELEMENT_ICONS[model.element] ?? Circle;
  const tierLabel = t.ascension.tiers[model.tier] ?? model.tier;
  const classLabel = t.avatarCard?.playStyles?.[model.classKey] ?? model.classKey;
  const nextElo = eloToNextTier(model.elo);
  const xpBarPct = Math.min(100, (model.elo / 3000) * 100);

  return (
    <div
      className={`relative w-full max-w-[280px] min-h-[400px] rounded-xl border-2 bg-gradient-to-b from-slate-900 via-slate-950 to-black overflow-hidden ${TIER_STYLES[model.tier]} ${className}`}
    >
      {model.tier === "legendary" && (
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/10 via-transparent to-amber-500/10 pointer-events-none animate-pulse" />
      )}

      <div className="p-4 flex flex-col gap-3 h-full relative z-10">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">
            <ElementIcon className="h-3 w-3 mr-1" />
            {classLabel}
          </Badge>
          <Badge className="text-[10px] bg-slate-800 text-amber-300 border-amber-600/40">
            <Crown className="h-3 w-3 mr-1" />
            {tierLabel}
          </Badge>
        </div>

        <div className="relative h-[150px] rounded-lg overflow-hidden bg-slate-800/80 border border-slate-700/50">
          {model.avatarUrl ? (
            <Image src={model.avatarUrl} alt={model.displayName} fill className="object-cover" unoptimized />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-600">
              <Sparkles className="h-12 w-12" />
            </div>
          )}
        </div>

        <h3 className="text-base font-bold text-slate-100 truncate">{model.displayName}</h3>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{t.ascension.elo}</span>
            <span className="text-cyan-300 font-semibold tabular-nums">{model.elo} / 3000</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-700 to-cyan-400"
              style={{ width: `${xpBarPct}%` }}
            />
          </div>
          {nextElo != null && (
            <p className="text-[10px] text-slate-500">
              {t.ascension.nextTier}: +{nextElo} ELO
            </p>
          )}
        </div>

        <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-800">
          <span className="text-xs text-slate-500">{t.ascension.xp}</span>
          <span className="text-sm font-bold text-amber-300 tabular-nums">{model.xp}</span>
        </div>
      </div>
    </div>
  );
}
