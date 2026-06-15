"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { Chess } from "chess.js";
import type { PvpGameRow } from "@/lib/pvp-chess";
import {
  formatClockMsPrecise,
  formatCorrespondenceMs,
  getPvpClockDisplayMs,
  isCorrespondenceTimeLow,
} from "@/lib/pvp-clock";
import { playClockLowTimeWarning } from "@/lib/chess-sound";
import type { Language } from "@/lib/i18n";

const LOW_TIME_MS = 20_000;

export function usePvpClockDisplay({
  game,
  chess,
  myRole,
  lang,
}: {
  game: PvpGameRow;
  chess: Chess;
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
        daysPerMove: null as number | null,
      };

  const { whiteMs, blackMs, active, correspondence } = display;
  const moveBudgetMs =
    correspondence && game.clock_initial_sec
      ? Math.max(0, Number(game.clock_initial_sec)) * 1000
      : 0;

  useEffect(() => {
    if (!showClocks) return;
    const intervalMs = correspondence ? 60_000 : 50;
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [showClocks, correspondence]);

  useEffect(() => {
    if (!showClocks) {
      setWhiteLow(false);
      setBlackLow(false);
      return;
    }

    const isLow = (ms: number, isActive: boolean) => {
      if (!isActive) return false;
      if (correspondence) return isCorrespondenceTimeLow(ms, moveBudgetMs);
      return ms > 0 && ms <= LOW_TIME_MS;
    };

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
      const low = isLow(ms, isActive);
      if (low) {
        setLow(true);
        if (!correspondence && !warnedRef.current) {
          warnedRef.current = true;
          playClockLowTimeWarning();
        }
      } else {
        setLow(false);
        if (!low) {
          warnedRef.current = false;
        }
      }
    };

    updateSide(whiteMs, active === "w", myRole === "white", warnedWhiteRef, setWhiteLow);
    updateSide(blackMs, active === "b", myRole === "black", warnedBlackRef, setBlackLow);
  }, [showClocks, whiteMs, blackMs, active, myRole, correspondence, moveBudgetMs]);

  const formatMs = (ms: number, side: "w" | "b", isActive: boolean) => {
    if (!showClocks) return "—";
    if (correspondence) {
      if (!isActive && display.daysPerMove) {
        return lang === "fr"
          ? `${display.daysPerMove} j / coup`
          : `${display.daysPerMove}d / move`;
      }
      return formatCorrespondenceMs(ms, lang);
    }
    return formatClockMsPrecise(ms);
  };

  return {
    showClocks,
    active,
    whiteMs,
    blackMs,
    whiteUrgent: whiteLow && active === "w",
    blackUrgent: blackLow && active === "b",
    formatWhite: () => formatMs(whiteMs, "w", active === "w"),
    formatBlack: () => formatMs(blackMs, "b", active === "b"),
  };
}
