"use client";

import Image from "next/image";
import { Crown, Flame, Mountain, Droplets, Wind, Circle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ChampionCardModel, ChampionTier } from "@/lib/ascension/types";
import { countToNextTier } from "@/lib/ascension/tiers";
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

const FRAME_STYLES: Record<string, string> = {
  gold: "ring-2 ring-yellow-400/70",
  silver: "ring-2 ring-slate-300/60",
  bronze: "ring-2 ring-amber-700/70",
  diamond: "ring-2 ring-cyan-300/70",
  legendary: "ring-2 ring-purple-400/80",
};

const BACKGROUND_STYLES: Record<string, string> = {
  ember: "from-orange-950 via-slate-950 to-black",
  ocean: "from-cyan-950 via-slate-950 to-black",
  forest: "from-emerald-950 via-slate-950 to-black",
  void: "from-violet-950 via-slate-950 to-black",
  aurora: "from-indigo-950 via-slate-950 to-teal-950",
};

interface ChampionTradingCardProps {
  model: ChampionCardModel;
  /** Total completed puzzles — drives count-based tier progress. */
  completedCount?: number;
  /** Prestige skill `card_aura` unlocked. */
  hasCardAura?: boolean;
  className?: string;
}

export default function ChampionTradingCard({
  model,
  completedCount = 0,
  hasCardAura = false,
  className = "",
}: ChampionTradingCardProps) {
  const { t } = useLanguage();
  const ElementIcon = ELEMENT_ICONS[model.element] ?? Circle;
  const tierLabel = t.ascension.tiers[model.tier] ?? model.tier;
  const classLabel = t.avatarCard?.playStyles?.[model.classKey] ?? model.classKey;
  const puzzlesToNext = countToNextTier(completedCount);
  const eloPct = Math.min(100, (model.elo / 3000) * 100);
  const frame = model.customization?.frame;
  const background = model.customization?.background;
  const badge = model.customization?.badge;
  const bgGradient = (background && BACKGROUND_STYLES[background]) || "from-slate-900 via-slate-950 to-black";
  const frameClass = (frame && FRAME_STYLES[frame]) || "";

  return (
    <div
      className={`relative w-full max-w-[280px] min-h-[400px] rounded-xl border-2 bg-gradient-to-b ${bgGradient} overflow-hidden ${TIER_STYLES[model.tier]} ${frameClass} ${className} ${
        hasCardAura ? "shadow-[0_0_28px_rgba(168,85,247,0.45)]" : ""
      }`}
    >
      {hasCardAura && (
        <div
          className="absolute inset-0 pointer-events-none animate-pulse bg-gradient-to-tr from-purple-500/20 via-transparent to-amber-400/15"
          aria-hidden
        />
      )}
      {model.tier === "legendary" && (
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/10 via-transparent to-amber-500/10 pointer-events-none animate-pulse" />
      )}

      <div className="p-4 flex flex-col gap-3 h-full relative z-10">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">
            <ElementIcon className="h-3 w-3 mr-1" />
            {classLabel}
          </Badge>
          <div className="flex flex-col items-end gap-1">
            <Badge className="text-[10px] bg-slate-800 text-amber-300 border-amber-600/40">
              <Crown className="h-3 w-3 mr-1" />
              {tierLabel}
            </Badge>
            {badge && (
              <Badge variant="secondary" className="text-[9px] bg-purple-950/70 text-purple-200 border-purple-500/40">
                {badge}
              </Badge>
            )}
          </div>
        </div>

        <div
          className={`relative h-[150px] rounded-lg overflow-hidden bg-slate-800/80 border border-slate-700/50 ${
            hasCardAura ? "ring-2 ring-purple-400/50 shadow-[0_0_16px_rgba(192,132,252,0.35)]" : ""
          }`}
        >
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
              style={{ width: `${eloPct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500">
            {puzzlesToNext == null
              ? t.ascension.maxTierReached
              : t.ascension.nextTierPuzzles.replace("{count}", String(puzzlesToNext))}
          </p>
        </div>

        <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-800">
          <span className="text-xs text-slate-500">{t.ascension.xp}</span>
          <span className="text-sm font-bold text-amber-300 tabular-nums">{model.xp}</span>
        </div>
      </div>
    </div>
  );
}
