"use client";

import { useCallback, useState } from "react";
import { Trophy, X } from "lucide-react";
import type { ProfileOption } from "@/lib/arena-types";
import type { PlayoffBracketState, PlayoffMatch } from "@/lib/arena-playoff-bracket";
import {
  getOptionByKey,
  resolveMatchSideKeys,
  roundLabel,
} from "@/lib/arena-playoff-bracket";
import { PLAYOFF_DRAG_KEY } from "@/components/ArenaPlayoffRosterDeck";
import { useLanguage } from "@/lib/language-context";
import { normalizeEnginePlatform } from "@/lib/normalize-engine-platform";
import { Button } from "@/components/ui/button";

function PlayerChip({
  option,
  side,
}: {
  option?: ProfileOption;
  side: "a" | "b";
}) {
  if (!option) {
    return <span className="text-[10px] text-slate-600 italic">—</span>;
  }
  const plat = normalizeEnginePlatform(option.config);
  return (
    <div
      className={`flex items-center gap-1.5 min-w-0 ${
        side === "b" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {option.config.avatarUrl ? (
        <img
          src={option.config.avatarUrl}
          alt=""
          className="h-6 w-6 rounded-full object-cover shrink-0 border border-slate-600"
        />
      ) : (
        <span className="h-6 w-6 rounded-full bg-slate-700 shrink-0" />
      )}
      <span className="text-[11px] text-slate-200 truncate font-medium">
        {option.config.name}
      </span>
      {option.config.elo != null && (
        <span className="text-[9px] font-mono text-cyan-500/90 shrink-0">
          {option.config.elo}
        </span>
      )}
      <span
        className={`text-[8px] uppercase shrink-0 ${
          plat === "lichess" ? "text-blue-400" : "text-green-500"
        }`}
      >
        {plat === "lichess" ? "Li" : "C.com"}
      </span>
    </div>
  );
}

function MatchRow({
  match,
  state,
  pool,
  activeMatchId,
  onSelectMatch,
}: {
  match: PlayoffMatch;
  state: PlayoffBracketState;
  pool: ProfileOption[];
  activeMatchId: string | null;
  onSelectMatch: (id: string) => void;
}) {
  const { lang } = useLanguage();
  const { keyA, keyB } = resolveMatchSideKeys(match, state);
  const optA = getOptionByKey(pool, keyA);
  const optB = getOptionByKey(pool, keyB);
  const isActive = activeMatchId === match.id;
  const canPlay = match.status === "ready";

  return (
    <button
      type="button"
      disabled={!canPlay && match.status !== "done"}
      onClick={() => canPlay && onSelectMatch(match.id)}
      className={`w-full rounded-lg border px-2 py-1.5 text-left transition-colors ${
        isActive
          ? "border-cyan-400 bg-cyan-950/40"
          : match.status === "done"
            ? "border-emerald-800/50 bg-emerald-950/20"
            : canPlay
              ? "border-amber-600/40 hover:bg-slate-800/80"
              : "border-slate-800 opacity-60"
      }`}
    >
      <div className="text-[9px] uppercase text-slate-500 mb-1">
        {roundLabel(match, state.size, lang)}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-1 items-center">
        <PlayerChip option={optA} side="a" />
        <span className="text-[10px] text-slate-500 px-1">vs</span>
        <PlayerChip option={optB} side="b" />
      </div>
      {match.status === "done" && match.winnerKey && (
        <p className="text-[9px] text-emerald-400 mt-1 truncate">
          → {getOptionByKey(pool, match.winnerKey)?.config.name}
        </p>
      )}
    </button>
  );
}

export default function ArenaPlayoffBracket({
  state,
  pool,
  activeMatchId,
  onSelectMatch,
  onDropSeed,
  tapPickKey,
  onTapPickKey,
}: {
  state: PlayoffBracketState;
  pool: ProfileOption[];
  activeMatchId: string | null;
  onSelectMatch: (id: string) => void;
  onDropSeed: (slotIndex: number, key: string | null) => void;
  tapPickKey: string | null;
  onTapPickKey: (key: string | null) => void;
}) {
  const { t } = useLanguage();
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent, slot: number) => {
    e.preventDefault();
    setDragOverSlot(slot);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, slot: number) => {
      e.preventDefault();
      setDragOverSlot(null);
      const key = e.dataTransfer.getData(PLAYOFF_DRAG_KEY);
      if (key) {
        onDropSeed(slot, key);
        onTapPickKey(null);
      }
    },
    [onDropSeed, onTapPickKey]
  );

  const handleTapSlot = useCallback(
    (slot: number) => {
      if (tapPickKey) {
        onDropSeed(slot, tapPickKey);
        onTapPickKey(null);
        return;
      }
      const existing = state.seeds[slot];
      if (existing) {
        onDropSeed(slot, null);
      }
    },
    [tapPickKey, onDropSeed, onTapPickKey, state.seeds]
  );

  const rounds = state.size === 8 ? [0, 1, 2] : [0, 1];

  return (
    <div className="arena-playoff-bracket space-y-3">
      <p className="text-[10px] text-slate-500 leading-snug">
        {t.arenaPlayoff.tapAssignHint}
      </p>
      {tapPickKey && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-cyan-950/50 border border-cyan-500/40 px-2 py-1.5">
          <span className="text-[11px] text-cyan-200">
            {t.arenaPlayoff.tapAssignActive}:{" "}
            <strong>
              {getOptionByKey(pool, tapPickKey)?.config.name}
            </strong>
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => onTapPickKey(null)}
          >
            <X className="h-3 w-3 mr-0.5" />
            {t.arenaPlayoff.tapAssignClear}
          </Button>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-cyan-300/90 mb-1.5">
          {t.arenaPlayoff.seedsTitle}
        </h3>
        <div
          className={`grid gap-1.5 ${
            state.size === 8 ? "grid-cols-4" : "grid-cols-2"
          }`}
        >
          {state.seeds.map((seedKey, i) => {
            const opt = getOptionByKey(pool, seedKey);
            const slotActive = tapPickKey != null || dragOverSlot === i;
            return (
              <div
                key={`seed-${i}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleTapSlot(i);
                  }
                }}
                onClick={() => handleTapSlot(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragLeave={() => setDragOverSlot(null)}
                onDrop={(e) => handleDrop(e, i)}
                className={`relative rounded-md border px-1.5 py-1 min-h-[2.75rem] flex items-center cursor-pointer touch-manipulation ${
                  slotActive
                    ? "border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-500/50"
                    : "border-slate-700 bg-slate-950/50 active:bg-slate-800"
                }`}
              >
                <span className="text-[8px] font-mono text-slate-600 mr-1">
                  {i + 1}
                </span>
                {seedKey ? (
                  <>
                    <button
                      type="button"
                      className="absolute top-0.5 right-1 z-10 text-slate-500 hover:text-red-400 text-xs leading-none p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDropSeed(i, null);
                      }}
                      aria-label={t.arenaPlayoff.clearSlot}
                    >
                      ×
                    </button>
                    <div className="min-w-0 flex-1 pr-4">
                      <PlayerChip option={opt} side="a" />
                    </div>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-500">
                    {t.arenaPlayoff.dropHere}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-400 mb-1.5">
          {t.arenaPlayoff.bracketTitle}
        </h3>
        <div className="space-y-1.5 max-h-[14rem] overflow-y-auto pr-1">
          {rounds.map((round) => (
            <div key={`r-${round}`}>
              {state.matches
                .filter((m) => m.round === round)
                .map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    state={state}
                    pool={pool}
                    activeMatchId={activeMatchId}
                    onSelectMatch={onSelectMatch}
                  />
                ))}
            </div>
          ))}
        </div>
        {state.championKey && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-950/25 px-2 py-1.5">
            <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-xs text-amber-200">
              {t.arenaPlayoff.champion}:{" "}
              <strong>
                {getOptionByKey(pool, state.championKey)?.config.name}
              </strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
