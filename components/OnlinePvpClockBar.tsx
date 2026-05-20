"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { Chess } from "chess.js";
import type { PvpGameRow } from "@/lib/pvp-chess";
import { formatClockMs, getPvpClockDisplayMs } from "@/lib/pvp-clock";
import { playClockLowTimeWarning } from "@/lib/chess-sound";

const LOW_TIME_MS = 20_000;

export default function OnlinePvpClockBar({
  game,
  chess,
  whiteLabel,
  blackLabel,
  myRole,
}: {
  game: PvpGameRow;
  chess: Chess;
  whiteLabel: string;
  blackLabel: string;
  myRole: "white" | "black" | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [whiteLow, setWhiteLow] = useState(false);
  const [blackLow, setBlackLow] = useState(false);
  const warnedWhiteRef = useRef(false);
  const warnedBlackRef = useRef(false);

  const showClocks = game.clock_mode === "timed" && game.status === "playing";
  const stm = chess.turn();
  const { whiteMs, blackMs, active } = showClocks
    ? getPvpClockDisplayMs(game, stm, now)
    : { whiteMs: 0, blackMs: 0, active: null as "w" | "b" | null };

  useEffect(() => {
    if (!showClocks) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [showClocks]);

  useEffect(() => {
    if (!showClocks) {
      setWhiteLow(false);
      setBlackLow(false);
      return;
    }

    const updateSide = (
      ms: number,
      isActive: boolean,
      isMine: boolean,
      warnedRef: MutableRefObject<boolean>,
      setLow: (v: boolean) => void
    ) => {
      if (!isMine || !isActive) {
        setLow(false);
        return;
      }
      if (ms > 0 && ms <= LOW_TIME_MS) {
        setLow(true);
        if (!warnedRef.current) {
          warnedRef.current = true;
          playClockLowTimeWarning();
        }
      } else {
        setLow(false);
        if (ms > LOW_TIME_MS) {
          warnedRef.current = false;
        }
      }
    };

    updateSide(whiteMs, active === "w", myRole === "white", warnedWhiteRef, setWhiteLow);
    updateSide(blackMs, active === "b", myRole === "black", warnedBlackRef, setBlackLow);
  }, [showClocks, whiteMs, blackMs, active, myRole]);

  if (!showClocks) return null;

  const whiteUrgent = whiteLow && active === "w";
  const blackUrgent = blackLow && active === "b";

  return (
    <div className="flex justify-center gap-3 sm:gap-6 text-center px-2">
      <div
        className={`min-w-[5.5rem] rounded-lg px-3 py-2 transition-colors ${
          whiteUrgent
            ? "bg-red-950/80 ring-2 ring-red-500/80 animate-pvp-clock-shake"
            : active === "w"
              ? "bg-cyan-900/70 ring-1 ring-cyan-400/60"
              : "bg-slate-800/80"
        }`}
      >
        <div className="text-[10px] uppercase tracking-wide text-slate-400">{whiteLabel}</div>
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
            : active === "b"
              ? "bg-violet-900/70 ring-1 ring-violet-400/60"
              : "bg-slate-800/80"
        }`}
      >
        <div className="text-[10px] uppercase tracking-wide text-slate-400">{blackLabel}</div>
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
