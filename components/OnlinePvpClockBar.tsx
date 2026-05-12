"use client";

import { useEffect, useState } from "react";
import type { Chess } from "chess.js";
import type { PvpGameRow } from "@/lib/pvp-chess";
import { formatClockMs, getPvpClockDisplayMs } from "@/lib/pvp-clock";

export default function OnlinePvpClockBar({
  game,
  chess,
  whiteLabel,
  blackLabel,
}: {
  game: PvpGameRow;
  chess: Chess;
  whiteLabel: string;
  blackLabel: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);

  if (game.clock_mode !== "timed" || game.status !== "playing") return null;

  const stm = chess.turn();
  const { whiteMs, blackMs, active } = getPvpClockDisplayMs(game, stm, now);

  return (
    <div className="flex justify-center gap-3 sm:gap-6 text-center px-2">
      <div
        className={`min-w-[5.5rem] rounded-lg px-3 py-2 transition-colors ${
          active === "w" ? "bg-cyan-900/70 ring-1 ring-cyan-400/60" : "bg-slate-800/80"
        }`}
      >
        <div className="text-[10px] uppercase tracking-wide text-slate-400">{whiteLabel}</div>
        <div className="font-mono text-xl tabular-nums text-cyan-50">{formatClockMs(whiteMs)}</div>
      </div>
      <div
        className={`min-w-[5.5rem] rounded-lg px-3 py-2 transition-colors ${
          active === "b" ? "bg-violet-900/70 ring-1 ring-violet-400/60" : "bg-slate-800/80"
        }`}
      >
        <div className="text-[10px] uppercase tracking-wide text-slate-400">{blackLabel}</div>
        <div className="font-mono text-xl tabular-nums text-violet-50">{formatClockMs(blackMs)}</div>
      </div>
    </div>
  );
}
