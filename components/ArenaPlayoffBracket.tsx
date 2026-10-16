"use client";

import { useCallback, useState } from "react";
import { Trophy, X } from "lucide-react";
import type { ProfileOption } from "@/lib/arena-types";
import type { PlayoffBracketState, PlayoffMatch } from "@/lib/arena-playoff-bracket";
import {
  finalRoundIndex,
  getOptionByKey,
  resolveMatchSideKeys,
  roundLabel,
} from "@/lib/arena-playoff-bracket";
import { PLAYOFF_DRAG_KEY } from "@/components/ArenaPlayoffRosterDeck";
import { useLanguage } from "@/lib/language-context";
import { arenaPlatformOf } from "@/lib/arena-humans";
import { Button } from "@/components/ui/button";

export function PlayerChip({
  option,
  winner = false,
  loser = false,
}: {
  option?: ProfileOption;
  winner?: boolean;
  loser?: boolean;
}) {
  const { t } = useLanguage();
  if (!option) {
    return <span className="text-[11px] text-slate-600 italic px-1">—</span>;
  }
  const plat = arenaPlatformOf(option);
  const platLabel =
    plat === "human"
      ? t.arenaPage.platformHumanShort
      : plat === "lichess"
        ? t.arenaPage.platformLichessShort
        : t.arenaPage.platformChesscomShort;
  return (
    <div
      className={`flex items-center gap-1.5 min-w-0 ${loser ? "opacity-45" : ""}`}
      title={`${option.config.name}${option.config.elo != null ? ` · ${option.config.elo}` : ""} · ${platLabel}`}
    >
      {option.config.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={option.config.avatarUrl}
          alt=""
          className="h-5 w-5 rounded-full object-cover shrink-0 border border-slate-600"
        />
      ) : (
        <span className="h-5 w-5 rounded-full bg-slate-700 shrink-0" />
      )}
      <span
        className={`min-w-0 flex-1 text-[11px] truncate font-medium ${
          winner ? "text-emerald-300" : "text-slate-200"
        }`}
      >
        {option.config.name}
      </span>
      {option.config.elo != null && (
        <span className="text-[9px] font-mono text-cyan-500/90 shrink-0">
          {option.config.elo}
        </span>
      )}
      <span className="arena-platform-dot" data-platform={plat}>
        <span className="sr-only">{platLabel}</span>
      </span>
    </div>
  );
}

function MatchCard({
  match,
  state,
  pool,
  activeMatchId,
  liveMatchId,
  onSelectMatch,
}: {
  match: PlayoffMatch;
  state: PlayoffBracketState;
  pool: ProfileOption[];
  activeMatchId: string | null;
  liveMatchId: string | null;
  onSelectMatch: (id: string) => void;
}) {
  const { keyA, keyB } = resolveMatchSideKeys(match, state);
  const optA = getOptionByKey(pool, keyA);
  const optB = getOptionByKey(pool, keyB);
  const isActive = activeMatchId === match.id;
  const isLive = liveMatchId === match.id;
  const canPlay = match.status === "ready";
  const done = match.status === "done";

  return (
    <button
      type="button"
      disabled={!canPlay}
      aria-pressed={isActive}
      onClick={() => canPlay && onSelectMatch(match.id)}
      data-testid={`playoff-match-${match.id}`}
      className={`w-full rounded-lg border px-2 py-1.5 text-left transition-colors space-y-1 ${
        isLive
          ? "border-cyan-400 bg-cyan-950/50 ring-1 ring-cyan-400/50"
          : isActive
            ? "border-cyan-500/70 bg-cyan-950/30"
            : done
              ? "border-emerald-800/50 bg-emerald-950/20 cursor-default"
              : canPlay
                ? "border-amber-600/50 hover:bg-slate-800/80"
                : "border-slate-800 opacity-60 cursor-default"
      }`}
    >
      <PlayerChip
        option={optA}
        winner={done && match.winnerKey === keyA}
        loser={done && match.winnerKey !== keyA}
      />
      <PlayerChip
        option={optB}
        winner={done && match.winnerKey === keyB}
        loser={done && match.winnerKey !== keyB}
      />
      {done && match.lastOutcome && (
        <p className="text-[9px] text-slate-400 leading-snug line-clamp-2">
          {match.lastOutcome}
        </p>
      )}
    </button>
  );
}

export default function ArenaPlayoffBracket({
  state,
  pool,
  activeMatchId,
  liveMatchId,
  onSelectMatch,
  onDropSeed,
  tapPickKey,
  onTapPickKey,
  seedsLocked,
  showRounds = true,
}: {
  state: PlayoffBracketState;
  pool: ProfileOption[];
  activeMatchId: string | null;
  liveMatchId: string | null;
  onSelectMatch: (id: string) => void;
  onDropSeed: (slotIndex: number, key: string | null) => void;
  tapPickKey: string | null;
  onTapPickKey: (key: string | null) => void;
  seedsLocked: boolean;
  /** Knockout rounds; hidden for round-robin / Swiss, which only use the seed slots. */
  showRounds?: boolean;
}) {
  const { t } = useLanguage();
  const tp = t.arenaPlayoff;
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent, slot: number) => {
      if (seedsLocked) return;
      e.preventDefault();
      setDragOverSlot(slot);
    },
    [seedsLocked]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, slot: number) => {
      e.preventDefault();
      setDragOverSlot(null);
      if (seedsLocked) return;
      const key = e.dataTransfer.getData(PLAYOFF_DRAG_KEY);
      if (key) {
        onDropSeed(slot, key);
        onTapPickKey(null);
      }
    },
    [onDropSeed, onTapPickKey, seedsLocked]
  );

  const handleTapSlot = useCallback(
    (slot: number) => {
      if (seedsLocked) return;
      if (tapPickKey) {
        onDropSeed(slot, tapPickKey);
        onTapPickKey(null);
        return;
      }
      if (state.seeds[slot]) onDropSeed(slot, null);
    },
    [tapPickKey, onDropSeed, onTapPickKey, state.seeds, seedsLocked]
  );

  const rounds = Array.from({ length: finalRoundIndex(state.size) + 1 }, (_, i) => i);
  const labels = {
    final: tp.roundFinal,
    semi: tp.roundSemi,
    quarter: tp.roundQuarter,
    round16: tp.roundOf16,
  };

  return (
    <div className="arena-playoff-bracket space-y-3">
      {!seedsLocked && (
        <div>
          <h3 className="text-xs font-semibold text-cyan-300/90 mb-1">{tp.seedsTitle}</h3>
          <p className="text-[10px] text-slate-500 leading-snug mb-1.5">{tp.tapAssignHint}</p>
          {tapPickKey && (
            <div className="mb-1.5 flex items-center justify-between gap-2 rounded-md bg-cyan-950/50 border border-cyan-500/40 px-2 py-1.5">
              <span className="text-[11px] text-cyan-200">
                {tp.tapAssignActive}:{" "}
                <strong>{getOptionByKey(pool, tapPickKey)?.config.name}</strong>
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => onTapPickKey(null)}
              >
                <X className="h-3 w-3 mr-0.5" />
                {tp.tapAssignClear}
              </Button>
            </div>
          )}
          <div
            className={`grid gap-1.5 ${
              state.size >= 8 ? "grid-cols-2 2xl:grid-cols-4" : "grid-cols-2"
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
                  aria-label={`#${i + 1} ${opt?.config.name ?? tp.dropHere}`}
                  data-testid={`playoff-slot-${i}`}
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
                  <span className="text-[8px] font-mono text-slate-600 mr-1">{i + 1}</span>
                  {seedKey ? (
                    <>
                      <button
                        type="button"
                        className="absolute top-0.5 right-1 z-10 text-slate-500 hover:text-red-400 text-xs leading-none p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDropSeed(i, null);
                        }}
                        aria-label={tp.clearSlot}
                      >
                        ×
                      </button>
                      <div className="min-w-0 flex-1 pr-4">
                        <PlayerChip option={opt} />
                      </div>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-500">{tp.dropHere}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showRounds && (
      <div>
        <div
          className="arena-bracket"
          style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(8.75rem, 1fr))` }}
        >
          {rounds.map((round) => (
            <div key={`r-${round}`} className="arena-bracket__round">
              <div className="arena-bracket__round-title">
                {roundLabel(round, state.size, labels)}
              </div>
              <div className="arena-bracket__matches">
                {state.matches
                  .filter((m) => m.round === round)
                  .map((m) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      state={state}
                      pool={pool}
                      activeMatchId={activeMatchId}
                      liveMatchId={liveMatchId}
                      onSelectMatch={onSelectMatch}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
        {state.championKey && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-950/25 px-2 py-1.5">
            <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-xs text-amber-200">
              {tp.champion}:{" "}
              <strong>{getOptionByKey(pool, state.championKey)?.config.name}</strong>
            </span>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
