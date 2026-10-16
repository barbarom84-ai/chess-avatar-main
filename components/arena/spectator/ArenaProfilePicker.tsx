"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { filterBySearch } from "@/lib/arena-profile-pool";
import type { ProfileOption } from "@/lib/arena-types";
import ArenaPlatformBadge from "@/components/arena/ArenaPlatformBadge";
import { useLanguage } from "@/lib/language-context";

const PAGE_SIZE = 40;

export type ArenaPickSide = "white" | "black";

export default function ArenaProfilePicker({
  pool,
  whiteKey,
  blackKey,
  side,
  onSideChange,
  onPick,
  disabled = false,
}: {
  pool: ProfileOption[];
  whiteKey: string;
  blackKey: string;
  side: ArenaPickSide;
  onSideChange: (side: ArenaPickSide) => void;
  onPick: (key: string) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const ap = t.arenaPage;
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const matches = useMemo(() => filterBySearch(pool, query), [pool, query]);
  const visible = matches.slice(0, limit);
  const selectedKey = side === "white" ? whiteKey : blackKey;
  const otherKey = side === "white" ? blackKey : whiteKey;

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-2 disabled:opacity-60">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400">{ap.editingSide}</span>
        <div role="radiogroup" aria-label={ap.editingSide} className="arena-segmented">
          {(["white", "black"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={side === s}
              data-active={side === s}
              className="arena-segmented__item"
              onClick={() => onSideChange(s)}
            >
              {s === "white" ? ap.whiteSide : ap.blackSide}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
        <Input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE_SIZE);
          }}
          placeholder={ap.pickSearchPlaceholder}
          aria-label={ap.pickSearchPlaceholder}
          className="pl-9 bg-slate-950 border-slate-700 text-slate-100 text-sm"
          autoComplete="off"
        />
      </div>

      <div
        className="max-h-[22rem] overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/70 p-1 space-y-0.5"
        role="listbox"
        aria-label={side === "white" ? ap.selectWhite : ap.selectBlack}
        data-testid="arena-profile-list"
      >
        {visible.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-slate-500">{ap.pickNoMatches}</p>
        ) : (
          visible.map((o) => {
            const selected = o.key === selectedKey;
            const otherSide = o.key === otherKey;
            return (
              <button
                key={o.key}
                type="button"
                role="option"
                aria-selected={selected}
                className="arena-pick-row"
                data-selected={selected}
                data-other-side={otherSide}
                onClick={() => onPick(o.key)}
              >
                {o.config.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.config.avatarUrl} alt="" className="arena-avatar" loading="lazy" />
                ) : (
                  <span aria-hidden className="arena-avatar" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-100">
                    {o.config.name || o.label}
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {o.human ? ap.humanPlayerLabel : o.label}
                  </span>
                </span>
                {otherSide && (
                  <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                    {side === "white" ? ap.blackSide : ap.whiteSide}
                  </span>
                )}
                {o.config.elo != null && (
                  <span className="shrink-0 font-mono text-xs text-cyan-400/90">{o.config.elo}</span>
                )}
                <ArenaPlatformBadge option={o} />
              </button>
            );
          })
        )}
        {matches.length > visible.length && (
          <button
            type="button"
            className="w-full rounded-md py-2 text-xs text-cyan-300 hover:bg-slate-800/70"
            onClick={() => setLimit((n) => n + PAGE_SIZE)}
          >
            {ap.showMore.replace("{n}", String(matches.length - visible.length))}
          </button>
        )}
      </div>
    </fieldset>
  );
}
