"use client";

import { useMemo } from "react";
import AvatarTradingCard from "@/components/AvatarTradingCard";
import { getAvatarCardLabels } from "@/lib/avatar-card-labels";
import type { ProfileOption } from "@/lib/arena-types";
import { useLanguage } from "@/lib/language-context";
import { optionToCardModel } from "./arena-option-card";

export default function ArenaMatchupBanner({
  whiteOption,
  blackOption,
  vsLabel,
}: {
  whiteOption: ProfileOption | undefined;
  blackOption: ProfileOption | undefined;
  vsLabel: string;
}) {
  const { t, lang } = useLanguage();
  const labels = useMemo(() => getAvatarCardLabels(t), [t]);

  if (!whiteOption && !blackOption) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-4 px-2 rounded-xl border border-amber-500/25 bg-gradient-to-r from-slate-950 via-amber-950/20 to-slate-950">
      {whiteOption ? (
        <AvatarTradingCard
          model={optionToCardModel(whiteOption, labels, lang)}
          labels={labels}
          size="md"
          flippable
          className="w-full max-w-[280px]"
        />
      ) : (
        <div className="w-[280px] aspect-[5/7] rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs">
          —
        </div>
      )}
      <span className="text-2xl font-black text-amber-400/90 font-serif shrink-0 px-2">
        {vsLabel}
      </span>
      {blackOption ? (
        <AvatarTradingCard
          model={optionToCardModel(blackOption, labels, lang)}
          labels={labels}
          size="md"
          flippable
          className="w-full max-w-[280px]"
        />
      ) : (
        <div className="w-[280px] aspect-[5/7] rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs">
          —
        </div>
      )}
    </div>
  );
}
