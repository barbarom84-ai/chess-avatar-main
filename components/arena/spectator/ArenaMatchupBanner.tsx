"use client";

import { useMemo } from "react";
import { ArrowLeftRight, Shuffle } from "lucide-react";
import AvatarTradingCard from "@/components/AvatarTradingCard";
import { getAvatarCardLabels } from "@/lib/avatar-card-labels";
import type { ProfileOption } from "@/lib/arena-types";
import { useLanguage } from "@/lib/language-context";
import { optionToCardModel } from "./arena-option-card";

function EmptySlot() {
  return (
    <div className="w-[160px] aspect-[5/7] rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs">
      —
    </div>
  );
}

export default function ArenaMatchupBanner({
  whiteOption,
  blackOption,
  onSwap,
  onRandom,
  disabled = false,
}: {
  whiteOption: ProfileOption | undefined;
  blackOption: ProfileOption | undefined;
  onSwap: () => void;
  onRandom: () => void;
  disabled?: boolean;
}) {
  const { t, lang } = useLanguage();
  const ap = t.arenaPage;
  const labels = useMemo(() => getAvatarCardLabels(t), [t]);

  const card = (option: ProfileOption | undefined) =>
    option ? (
      <AvatarTradingCard
        model={optionToCardModel(option, labels, lang)}
        labels={labels}
        size="sm"
        flippable
      />
    ) : (
      <EmptySlot />
    );

  return (
    <section className="arena-panel overflow-hidden" aria-label={ap.matchupTitle}>
      <div className="arena-panel__header">
        <span>{ap.matchupTitle}</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            className="arena-icon-btn"
            onClick={onSwap}
            disabled={disabled || !whiteOption || !blackOption}
            title={ap.swapColors}
            data-testid="arena-swap"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline">{ap.swapColors}</span>
          </button>
          <button
            type="button"
            className="arena-icon-btn"
            onClick={onRandom}
            disabled={disabled}
            title={ap.randomMatchup}
            data-testid="arena-random"
          >
            <Shuffle className="h-4 w-4" />
            <span className="hidden sm:inline">{ap.randomMatchup}</span>
          </button>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 px-2 py-3 bg-gradient-to-r from-slate-950 via-amber-950/20 to-slate-950">
        <div className="flex flex-col items-center gap-1 min-w-0">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">{ap.whiteSide}</span>
          {card(whiteOption)}
        </div>
        <span className="text-xl font-black text-amber-400/90 font-serif shrink-0">
          {ap.matchupVs}
        </span>
        <div className="flex flex-col items-center gap-1 min-w-0">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">{ap.blackSide}</span>
          {card(blackOption)}
        </div>
      </div>
    </section>
  );
}
