"use client";

import { useEffect, useRef, useState } from "react";
import { stmMateToWhitePov, toWhitePovEval } from "@/lib/engine-eval";
import { debounce } from "@/lib/debounce";
import {
  sanitizeSnapshot,
  terminalAnalysisDisplay,
  uciPvToSan,
} from "@/lib/continuous-analysis-utils";
import type { ReviewEngineLine } from "@/lib/review-coach-context";
import {
  DEFAULT_REVIEW_TOP_LINES_DEPTH,
  DEFAULT_REVIEW_TOP_LINES_MULTIPV,
  stockfishClient,
  stockfishGetTopLines,
  type ContinuousAnalysisSnapshot,
} from "@/lib/stockfish-client";

export { DEFAULT_REVIEW_TOP_LINES_DEPTH, DEFAULT_REVIEW_TOP_LINES_MULTIPV };

export type LivePositionEval = {
  evalWhitePov: number;
  isMate?: boolean;
  mateInMovesWhite?: number;
};

export function snapshotToEngineLines(
  fen: string,
  snapshot: ContinuousAnalysisSnapshot
): ReviewEngineLine[] {
  const out: ReviewEngineLine[] = [];
  for (const line of snapshot.lines) {
    const pvSan = uciPvToSan(fen, line.pvUci);
    const san = pvSan[0];
    const uci = line.pvUci[0];
    if (!san || !uci) continue;
    const white = toWhitePovEval(fen, {
      evalPawnsStm: line.evalPawns,
      isMate: Boolean(line.isMate),
      mateInMovesStm: line.mateInMoves,
    });
    out.push({
      rank: line.multipv,
      san,
      uci,
      pvSan,
      evalWhitePov: white.evalWhitePov,
      isMate: white.isMate || undefined,
      mateInMovesWhite:
        white.isMate && line.mateInMoves != null
          ? stmMateToWhitePov(fen, line.mateInMoves)
          : white.mateInMovesWhite,
    });
  }
  return out;
}

export function usePositionTopLines(options: {
  fen: string | null;
  blocked?: boolean;
  depth?: number;
  multipv?: number;
}) {
  const {
    fen,
    blocked = false,
    depth = DEFAULT_REVIEW_TOP_LINES_DEPTH,
    multipv = DEFAULT_REVIEW_TOP_LINES_MULTIPV,
  } = options;

  const [engineReady, setEngineReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lines, setLines] = useState<ReviewEngineLine[]>([]);
  const [resolvedDepth, setResolvedDepth] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [liveEval, setLiveEval] = useState<LivePositionEval | null>(null);

  const sequenceRef = useRef(0);
  const fenRef = useRef<string | null>(fen);
  fenRef.current = fen;

  useEffect(() => {
    stockfishClient.acquire();
    let cancelled = false;
    void stockfishClient.waitUntilReady().then((ok) => {
      if (!cancelled) setEngineReady(ok);
    });
    return () => {
      cancelled = true;
      stockfishClient.release();
      setEngineReady(false);
    };
  }, []);

  useEffect(() => {
    sequenceRef.current += 1;
    setLines([]);
    setResolvedDepth(0);
    setGameOver(false);

    if (!fen || !engineReady) {
      setIsAnalyzing(false);
      setPaused(false);
      return;
    }

    if (blocked) {
      setPaused(true);
      setIsAnalyzing(false);
      return;
    }

    const terminal = terminalAnalysisDisplay(fen);
    if (terminal) {
      setPaused(false);
      setIsAnalyzing(false);
      setGameOver(true);
      setLiveEval({
        evalWhitePov: terminal.evalWhitePov,
        isMate: Math.abs(terminal.evalWhitePov) >= 10,
      });
      return;
    }

    setPaused(false);
    setIsAnalyzing(true);

    const request = debounce((nextFen: string) => {
      const seq = sequenceRef.current;
      void (async () => {
        try {
          const snapshot = await stockfishGetTopLines(nextFen, {
            depth,
            multipv,
            priority: "low",
          });
          if (seq !== sequenceRef.current || fenRef.current !== nextFen) return;
          const clean = sanitizeSnapshot(nextFen, snapshot);
          if (!clean) {
            setLines([]);
            setResolvedDepth(0);
            setIsAnalyzing(false);
            return;
          }
          const converted = snapshotToEngineLines(nextFen, clean);
          setLines(converted);
          setResolvedDepth(clean.depth);
          const top = converted[0];
          if (top) {
            setLiveEval({
              evalWhitePov: top.evalWhitePov,
              isMate: top.isMate,
              mateInMovesWhite: top.mateInMovesWhite,
            });
          }
          setIsAnalyzing(false);
        } catch {
          if (seq !== sequenceRef.current) return;
          setLines([]);
          setIsAnalyzing(false);
        }
      })();
    }, 200);

    request(fen);
    return () => request.cancel();
  }, [fen, blocked, engineReady, depth, multipv]);

  return {
    engineReady,
    isAnalyzing,
    paused,
    lines,
    liveEval,
    depth: resolvedDepth,
    targetDepth: depth,
    gameOver,
  };
}
