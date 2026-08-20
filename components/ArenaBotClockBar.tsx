"use client";

import { useEffect, useState } from "react";
import { formatClockMs } from "@/lib/pvp-clock";
import type { PlayoffClockState } from "@/lib/arena-playoff-clock";
import { getPlayoffClockDisplay } from "@/lib/arena-playoff-clock";

export default function ArenaBotClockBar({
  clock,
  sideToMove,
  whiteLabel,
  blackLabel,
  active,
}: {
  clock: PlayoffClockState;
  sideToMove: "w" | "b";
  whiteLabel: string;
  blackLabel: string;
  active: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [active]);

  const { whiteMs, blackMs, active: activeSide } = active
    ? getPlayoffClockDisplay(clock, sideToMove, now)
    : {
        whiteMs: clock.whiteMs,
        blackMs: clock.blackMs,
        active: sideToMove,
      };

  const whiteUrgent = active && activeSide === "w" && whiteMs > 0 && whiteMs <= 20_000;
  const blackUrgent = active && activeSide === "b" && blackMs > 0 && blackMs <= 20_000;

  return (
    <div className="flex justify-center gap-3 sm:gap-6 text-center px-2">
      <div
        className={`min-w-[5.5rem] rounded-lg px-3 py-2 transition-colors ${
          whiteUrgent
            ? "bg-red-950/80 ring-2 ring-red-500/80 animate-pvp-clock-shake"
            : active && activeSide === "w"
              ? "bg-cyan-900/70 ring-1 ring-cyan-400/60"
              : "bg-slate-800/80"
        }`}
      >
        <div className="text-[10px] uppercase tracking-wide text-slate-400">
          {whiteLabel}
        </div>
        <div
          className={`font-mono text-xl tabular-nums ${
            whiteUrgent ? "text-red-400 font-bold" : "text-cyan-50"
          }`}
        >
          {formatClockMs(whiteMs)}
        </div>
      </div>
      <div
        className={`min-w-[5.5rem] rounded-lg px-3 py-2 transition-colors ${
          blackUrgent
            ? "bg-red-950/80 ring-2 ring-red-500/80 animate-pvp-clock-shake"
            : active && activeSide === "b"
              ? "bg-violet-900/70 ring-1 ring-violet-400/60"
              : "bg-slate-800/80"
        }`}
      >
        <div className="text-[10px] uppercase tracking-wide text-slate-400">
          {blackLabel}
        </div>
        <div
          className={`font-mono text-xl tabular-nums ${
            blackUrgent ? "text-red-400 font-bold" : "text-violet-50"
          }`}
        >
          {formatClockMs(blackMs)}
        </div>
      </div>
    </div>
  );
}
