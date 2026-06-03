"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { Chess } from "chess.js";
import type { PvpGameRow } from "@/lib/pvp-chess";
import { formatClockMs, formatCorrespondenceMs, getPvpClockDisplayMs } from "@/lib/pvp-clock";
import { playClockLowTimeWarning } from "@/lib/chess-sound";
import type { Language } from "@/lib/i18n";

const LOW_TIME_MS = 20_000;
const CORRESPONDENCE_LOW_MS = 24 * 60 * 60 * 1000;

export default function OnlinePvpClockBar({
  game,
  chess,
  whiteLabel,
  blackLabel,
  myRole,
  lang,
}: {
  game: PvpGameRow;
  chess: Chess;
  whiteLabel: string;
  blackLabel: string;
  myRole: "white" | "black" | null;
  lang: Language;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [whiteLow, setWhiteLow] = useState(false);
  const [blackLow, setBlackLow] = useState(false);
  const warnedWhiteRef = useRef(false);
  const warnedBlackRef = useRef(false);

  const showClocks =
    (game.clock_mode === "timed" || game.clock_mode === "correspondence") &&
    game.status === "playing";
  const stm = chess.turn();
  const display = showClocks
    ? getPvpClockDisplayMs(game, stm, now)
    : {
        whiteMs: 0,
        blackMs: 0,
        active: null as "w" | "b" | null,
        correspondence: false,
        daysPerMove: null,
      };

  const { whiteMs, blackMs, active, correspondence } = display;
  const lowThreshold = correspondence ? CORRESPONDENCE_LOW_MS : LOW_TIME_MS;

  useEffect(() => {
    if (!showClocks) return;
    const intervalMs = correspondence ? 60_000 : 200;
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [showClocks, correspondence]);

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
      if (ms > 0 && ms <= lowThreshold) {
        setLow(true);
        if (!correspondence && !warnedRef.current) {
          warnedRef.current = true;
          playClockLowTimeWarning();
        }
      } else {
        setLow(false);
        if (ms > lowThreshold) {
          warnedRef.current = false;
        }
      }
    };

    updateSide(whiteMs, active === "w", myRole === "white", warnedWhiteRef, setWhiteLow);
    updateSide(blackMs, active === "b", myRole === "black", warnedBlackRef, setBlackLow);
  }, [showClocks, whiteMs, blackMs, active, myRole, lowThreshold, correspondence]);

  if (!showClocks) return null;

  const formatMs = (ms: number, isActive: boolean) => {
    if (correspondence) {
      if (!isActive && display.daysPerMove) {
        return lang === "fr"
          ? `${display.daysPerMove} j / coup`
          : `${display.daysPerMove}d / move`;
      }
      return formatCorrespondenceMs(ms, lang);
    }
    return formatClockMs(ms);
  };

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
          className={`font-mono text-lg sm:text-xl tabular-nums ${
            whiteUrgent ? "text-red-400 font-bold" : "text-cyan-50"
          }`}
        >
          {formatMs(whiteMs, active === "w")}
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
          className={`font-mono text-lg sm:text-xl tabular-nums ${
            blackUrgent ? "text-red-400 font-bold" : "text-violet-50"
          }`}
        >
          {formatMs(blackMs, active === "b")}
        </div>
      </div>
    </div>
  );
}
