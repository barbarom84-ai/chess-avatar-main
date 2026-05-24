"use client";

import { useMemo } from "react";
import { Layers } from "lucide-react";
import AvatarTradingCard from "@/components/AvatarTradingCard";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/language-context";
import type { ProfileOption } from "@/lib/arena-types";
import { generateAIAnalysis } from "@/lib/ai-analysis";
import {
  buildAvatarCardModel,
  derivePlayingStyle,
  minimalPersonaStatsFromConfig,
} from "@/lib/avatar-card-model";
import { getAvatarCardLabels } from "@/lib/avatar-card-labels";

export const PLAYOFF_DRAG_KEY = "application/x-chess-avatar-playoff";

function buildCardModelFromOption(
  option: ProfileOption,
  labels: ReturnType<typeof getAvatarCardLabels>
) {
  const stats =
    option.stats && (option.stats.gameCount ?? 0) > 0
      ? option.stats
      : minimalPersonaStatsFromConfig(
          option.config,
          option.config.name || option.label
        );
  const playingStyle = derivePlayingStyle(option.config);
  const analysis = generateAIAnalysis(playingStyle, stats, stats.gameCount);
  return buildAvatarCardModel({
    stats,
    config: option.config,
    analysis,
    labels,
  });
}

type ArenaPlayoffRosterDeckProps = {
  pool: ProfileOption[];
  rosterFilter: string;
  onRosterFilterChange: (q: string) => void;
  tapPickKey: string | null;
  onTapPickKey: (key: string) => void;
  dragOptionKey: string | null;
  onDragStartOption: (key: string) => void;
  onDragEnd: () => void;
  placedKeys: Set<string>;
};

export default function ArenaPlayoffRosterDeck({
  pool,
  rosterFilter,
  onRosterFilterChange,
  tapPickKey,
  onTapPickKey,
  dragOptionKey,
  onDragStartOption,
  onDragEnd,
  placedKeys,
}: ArenaPlayoffRosterDeckProps) {
  const { t } = useLanguage();
  const labels = useMemo(() => getAvatarCardLabels(t), [t]);

  const rosterVisible = useMemo(() => {
    const q = rosterFilter.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((o) =>
      (o.config.name || o.label).toLowerCase().includes(q)
    );
  }, [pool, rosterFilter]);

  return (
    <div className="rounded-lg border border-amber-500/25 bg-slate-900/70 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold text-amber-200/90 truncate">
            {t.arenaPlayoff.rosterDeckTitle}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 shrink-0 tabular-nums">
          {rosterVisible.length}
        </span>
      </div>

      <div className="px-3 pt-2 pb-1">
        <Input
          type="search"
          value={rosterFilter}
          onChange={(e) => onRosterFilterChange(e.target.value)}
          placeholder={t.arenaPlayoff.rosterSearch}
          className="h-8 text-xs bg-slate-950 border-slate-700"
        />
      </div>

      <div className="arena-roster-deck px-2 pb-3 pt-2">
        {rosterVisible.length === 0 ? (
          <p className="text-xs text-slate-500 px-2 py-4 text-center w-full">
            {t.arenaPage.pickNoMatches}
          </p>
        ) : (
          rosterVisible.map((opt, index) => {
            const picked = tapPickKey === opt.key;
            const placed = placedKeys.has(opt.key);
            const dragging = dragOptionKey === opt.key;
            const model = buildCardModelFromOption(opt, labels);

            return (
              <div
                key={opt.key}
                role="button"
                tabIndex={0}
                draggable={!placed}
                onDragStart={(e) => {
                  if (placed) return;
                  e.dataTransfer.setData(PLAYOFF_DRAG_KEY, opt.key);
                  onDragStartOption(opt.key);
                }}
                onDragEnd={onDragEnd}
                onClick={() => !placed && onTapPickKey(opt.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!placed) onTapPickKey(opt.key);
                  }
                }}
                className={`arena-roster-deck-card relative ${
                  index % 2 === 1 ? "arena-roster-deck-card--alt" : ""
                } ${placed ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
                style={{ zIndex: picked ? 20 : index + 1 }}
              >
                <AvatarTradingCard
                  model={model}
                  labels={labels}
                  size="xs"
                  flippable={false}
                  interactive={false}
                  className={`shadow-lg transition-all touch-manipulation pointer-events-none ${
                    picked
                      ? "ring-2 ring-cyan-400 scale-[1.04] -translate-y-1"
                      : placed
                        ? "opacity-35 grayscale"
                        : dragging
                          ? "opacity-50"
                          : ""
                  }`}
                />
              </div>
            );
          })
        )}
      </div>

      <p className="text-[10px] text-slate-500 px-3 pb-2 leading-snug">
        {t.arenaPlayoff.rosterDeckHint}
      </p>
    </div>
  );
}
