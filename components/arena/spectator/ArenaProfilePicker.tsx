"use client";

import { useMemo } from "react";
import { Search } from "lucide-react";
import AvatarTradingCard from "@/components/AvatarTradingCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAvatarCardLabels } from "@/lib/avatar-card-labels";
import { filterBySearch } from "@/lib/arena-profile-pool";
import type { ProfileOption } from "@/lib/arena-types";
import { useLanguage } from "@/lib/language-context";
import { optionToCardModel } from "./arena-option-card";

const MAX_PICKER_ROWS = 36;

export default function ArenaProfilePicker({
  sideLabel,
  selectedKey,
  pool,
  searchQuery,
  onSearchChange,
  onSelectKey,
  searchPlaceholder,
  noMatches,
  listHint,
  cardsHint,
}: {
  sideLabel: string;
  selectedKey: string;
  pool: ProfileOption[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectKey: (key: string) => void;
  searchPlaceholder: string;
  noMatches: string;
  listHint: string;
  cardsHint: string;
}) {
  const { t } = useLanguage();
  const labels = useMemo(() => getAvatarCardLabels(t), [t]);

  const visible = useMemo(() => {
    return filterBySearch(pool, searchQuery).slice(0, MAX_PICKER_ROWS);
  }, [pool, searchQuery]);

  return (
    <div className="space-y-2 min-w-0">
      <Label className="text-xs font-semibold text-cyan-300/90 uppercase tracking-wide">
        {sideLabel}
      </Label>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 bg-slate-950 border-slate-700 text-slate-100 text-sm"
          autoComplete="off"
        />
      </div>
      <p className="text-[10px] text-slate-500">
        {listHint} {cardsHint}
      </p>
      <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-700/80 bg-slate-950/80 p-2">
        {visible.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-slate-500">
            {noMatches}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            {visible.map((o) => {
              const model = optionToCardModel(o, labels);
              const selected = selectedKey === o.key;
              return (
                <div
                  key={o.key}
                  className={
                    selected
                      ? "ring-2 ring-cyan-400 rounded-xl"
                      : "rounded-xl opacity-90 hover:opacity-100"
                  }
                >
                  <AvatarTradingCard
                    model={model}
                    labels={labels}
                    size="md"
                    flippable={selected}
                    interactive
                    className="w-full max-w-none cursor-pointer"
                    onClick={() => onSelectKey(o.key)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
