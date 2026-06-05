"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { debounce } from "@/lib/debounce";
import { stmEvalToWhitePov } from "@/lib/arena-spectator-helpers";
import {
  stockfishClient,
  type ContinuousAnalysisSnapshot,
  type ContinuousPvLine,
} from "@/lib/stockfish-client";
import {
  sanitizeSnapshot,
  terminalAnalysisDisplay,
} from "@/lib/continuous-analysis-utils";

const STORAGE_KEY = "chess-avatar.review.continuousAnalysis";

export type ContinuousPvLineDisplay = ContinuousPvLine & {
  sanPv: string[];
};

export type ContinuousAnalysisDisplay = {
  evalWhitePov: number;
  depth: number;
  lines: ContinuousPvLineDisplay[];
  bestMoveUci: string | null;
};

function readStoredEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

function uciPvToSan(fen: string, pvUci: string[]): string[] {
  try {
    const game = new Chess(fen);
    const sans: string[] = [];
    for (const uci of pvUci) {
      if (uci.length < 4) break;
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      const move = game.move(
        promotion ? { from, to, promotion } : { from, to }
      );
      if (!move) break;
      sans.push(move.san);
    }
    return sans;
  } catch {
    return [];
  }
}

function toDisplay(
  fen: string,
  snapshot: ContinuousAnalysisSnapshot
): ContinuousAnalysisDisplay {
  const lines = snapshot.lines.map((line) => ({
    ...line,
    sanPv: uciPvToSan(fen, line.pvUci),
  }));
  return {
    evalWhitePov: stmEvalToWhitePov(fen, snapshot.evalPawns),
    depth: snapshot.depth,
    lines,
    bestMoveUci: lines[0]?.pvUci[0] ?? null,
  };
}

export interface UseContinuousAnalysisOptions {
  blocked?: boolean;
}

export function useContinuousAnalysis(options: UseContinuousAnalysisOptions = {}) {
  const { blocked = false } = options;
  const [enabled, setEnabledState] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [display, setDisplay] = useState<ContinuousAnalysisDisplay | null>(null);
  const [paused, setPaused] = useState(false);

  const fenRef = useRef<string | null>(null);
  const sequenceRef = useRef(0);
  const debouncedStartRef = useRef<
    ReturnType<typeof debounce<(fen: string) => void>> | null
  >(null);

  useEffect(() => {
    setEnabledState(readStoredEnabled());
  }, []);

  useEffect(() => {
    stockfishClient.acquire();
    let cancelled = false;
    void stockfishClient.waitUntilReady().then((ok) => {
      if (!cancelled) setEngineReady(ok);
    });
    return () => {
      cancelled = true;
      stockfishClient.stopContinuousAnalysis();
      stockfishClient.release();
      setEngineReady(false);
    };
  }, []);

  const stopAnalysis = useCallback(() => {
    sequenceRef.current += 1;
    stockfishClient.stopContinuousAnalysis();
    setIsAnalyzing(false);
    setDisplay(null);
  }, []);

  const startAnalysis = useCallback(
    (fen: string) => {
      if (!enabled || blocked || !engineReady) return;

      const terminal = terminalAnalysisDisplay(fen);
      if (terminal) {
        sequenceRef.current += 1;
        stockfishClient.stopContinuousAnalysis();
        setDisplay(terminal);
        setIsAnalyzing(false);
        setPaused(false);
        return;
      }

      const seq = ++sequenceRef.current;
      setIsAnalyzing(true);
      setPaused(false);

      const started = stockfishClient.requestContinuousAnalysis(fen, (snapshot) => {
        if (seq !== sequenceRef.current) return;
        const clean = sanitizeSnapshot(fen, snapshot);
        if (!clean) return;
        setDisplay(toDisplay(fen, clean));
        setIsAnalyzing(true);
      });

      if (!started) {
        setPaused(true);
        setIsAnalyzing(false);
      }
    },
    [enabled, blocked, engineReady]
  );

  useEffect(() => {
    debouncedStartRef.current = debounce((fen: string) => {
      startAnalysis(fen);
    }, 300);
    return () => debouncedStartRef.current?.cancel();
  }, [startAnalysis]);

  useEffect(() => {
    if (!enabled || blocked || !engineReady) {
      stopAnalysis();
      if (blocked && enabled) setPaused(true);
      return;
    }

    setPaused(false);
    const fen = fenRef.current;
    if (fen) debouncedStartRef.current?.(fen);
  }, [enabled, blocked, engineReady, stopAnalysis]);

  const setEnabled = useCallback(
    (next: boolean) => {
      setEnabledState(next);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      }
      if (!next) stopAnalysis();
    },
    [stopAnalysis]
  );

  const toggle = useCallback(() => {
    setEnabled(!enabled);
  }, [enabled, setEnabled]);

  const bindFen = useCallback(
    (fen: string | null) => {
      fenRef.current = fen;
      if (!fen || !enabled || blocked || !engineReady) return;

      const terminal = terminalAnalysisDisplay(fen);
      if (terminal) {
        sequenceRef.current += 1;
        debouncedStartRef.current?.cancel();
        stockfishClient.stopContinuousAnalysis();
        setDisplay(terminal);
        setIsAnalyzing(false);
        setPaused(false);
        return;
      }

      sequenceRef.current += 1;
      setDisplay(null);
      setIsAnalyzing(true);
      debouncedStartRef.current?.(fen);
    },
    [enabled, blocked, engineReady]
  );

  return {
    enabled,
    engineReady,
    isAnalyzing,
    paused,
    display,
    toggle,
    setEnabled,
    bindFen,
    stopAnalysis,
  };
}
