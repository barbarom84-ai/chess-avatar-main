"use client";

import { useEffect, useState } from "react";
import { Hand, Loader2 } from "lucide-react";
import type { ProfileOption } from "@/lib/arena-types";
import type { PlayoffClockState } from "@/lib/arena-playoff-clock";
import { ARENA_ZEITNOT_THRESHOLD_MS } from "@/lib/arena-move-timing";
import { formatClockMs } from "@/lib/pvp-clock";
import ArenaPlatformBadge from "@/components/arena/ArenaPlatformBadge";
import { useLanguage } from "@/lib/language-context";

export type ArenaPlayerScore = "1" | "0" | "half" | null;

function useTickingNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

export default function ArenaPlayerBar({
  option,
  color,
  clock,
  toMove,
  thinking,
  awaitingHuman = false,
  score,
}: {
  option?: ProfileOption;
  color: "w" | "b";
  clock: PlayoffClockState | null;
  toMove: boolean;
  thinking: boolean;
  /** This side is a local human whose move is expected on the board. */
  awaitingHuman?: boolean;
  score: ArenaPlayerScore;
}) {
  const { t } = useLanguage();
  const ap = t.arenaPage;
  const ticking = Boolean(clock) && toMove && (thinking || awaitingHuman);
  const now = useTickingNow(ticking);

  const baseMs = clock ? (color === "w" ? clock.whiteMs : clock.blackMs) : null;
  const clockMs =
    baseMs == null
      ? null
      : ticking && clock
        ? Math.max(0, baseMs - Math.max(0, now - clock.turnStartedAt))
        : baseMs;
  const urgent = clockMs != null && clockMs > 0 && clockMs <= ARENA_ZEITNOT_THRESHOLD_MS;

  const name = option?.config.name || option?.label || (color === "w" ? ap.whiteSide : ap.blackSide);
  const scoreLabel = score === "half" ? "½" : score;

  return (
    <div
      className="arena-player-bar"
      data-to-move={toMove}
      data-awaiting={awaitingHuman && toMove}
      data-testid={`arena-player-${color}`}
    >
      <span
        aria-hidden
        className={`h-3 w-3 shrink-0 rounded-full border ${
          color === "w" ? "bg-slate-100 border-slate-300" : "bg-slate-950 border-slate-500"
        }`}
      />
      {option?.config.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={option.config.avatarUrl} alt="" className="arena-avatar" />
      ) : (
        <span aria-hidden className="arena-avatar" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate text-sm font-semibold text-slate-100" data-testid="arena-player-name">
            {name}
          </span>
          {thinking && toMove && (
            <Loader2
              className="h-3.5 w-3.5 shrink-0 animate-spin text-cyan-400"
              aria-label={ap.statusThinking}
            />
          )}
          {awaitingHuman && toMove && (
            <span className="arena-your-move" data-testid={`arena-your-move-${color}`}>
              <Hand className="h-3 w-3" aria-hidden />
              {ap.yourMove}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span>{color === "w" ? ap.whiteSide : ap.blackSide}</span>
          {option?.config.elo != null && (
            <span className="font-mono text-cyan-400/90">{option.config.elo}</span>
          )}
          {option && <ArenaPlatformBadge option={option} />}
        </div>
      </div>
      {scoreLabel && (
        <span className="arena-result-badge" data-score={score}>
          {scoreLabel}
        </span>
      )}
      {clockMs != null && (
        <span
          className="arena-clock"
          data-ticking={ticking}
          data-urgent={urgent && toMove}
          role="timer"
          aria-label={`${name} ${formatClockMs(clockMs)}`}
        >
          {formatClockMs(clockMs)}
        </span>
      )}
    </div>
  );
}
