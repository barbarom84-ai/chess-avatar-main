"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStockfish } from "./useStockfish";
import {
  analyzeParsedGameForReview,
  ReviewCancelledError,
  type GameReviewResult,
  type ParsedGameForReview,
  type ReviewedMove,
} from "@/lib/game-review";
import {
  type AnalysisStrictnessId,
  DEFAULT_ANALYSIS_STRICTNESS,
} from "@/lib/analysis-profiles";
import type { EngineConfig } from "@/lib/analysis";

export type ReviewStatus =
  | "idle"
  | "engine-loading"
  | "running"
  | "done"
  | "cancelled"
  | "error";

export interface UseGameReviewOptions {
  /** Parsed game to review. Pass null to keep the hook idle. */
  parsed: ParsedGameForReview | null;
  /** Stockfish search depth per position. */
  depth: number;
  /** Maximum number of plies analyzed. Use Infinity for full game. */
  maxPlies: number;
  /** CPL band profile — must match UI selection so badges match accuracy. */
  analysisStrictness?: AnalysisStrictnessId;
}

export interface UseGameReviewState {
  status: ReviewStatus;
  /** Number of plies fully analyzed so far. */
  progress: number;
  /** Total number of plies that will be analyzed. */
  total: number;
  /** Partial moves already analyzed, in playing order. Streams during analysis. */
  moves: ReviewedMove[];
  /** Aggregated result, available once status === "done". */
  result: GameReviewResult | null;
  /** True when the underlying Stockfish worker is ready. */
  engineReady: boolean;
  error: string | null;
  start: () => void;
  cancel: () => void;
  reset: () => void;
  /**
   * Coup « style clone » pour une FEN (MultiPV + profil). Partage le même worker
   * que l’analyse — n’appeler qu’à l’arrêt de la recherche principale.
   */
  getPersonaStyleMove: (
    fen: string,
    config: EngineConfig,
    opts?: { depth?: number; movetime?: number }
  ) => Promise<string>;
}

/**
 * Drives Stockfish position-by-position to produce a streamed Game Review.
 *
 * Calls to the underlying Stockfish worker are serialized: `getBestMoveAndEval`
 * registers a single message listener, so we await each ply before launching
 * the next. `cancel()` is honored cooperatively at every awaited boundary and
 * also asks the engine to stop the current search.
 */
export function useGameReview({
  parsed,
  depth,
  maxPlies,
  analysisStrictness = DEFAULT_ANALYSIS_STRICTNESS,
}: UseGameReviewOptions): UseGameReviewState {
  const { isReady, getBestMoveAndEval, stopThinking, getPersonaStyleMove } =
    useStockfish();

  const [status, setStatus] = useState<ReviewStatus>("idle");
  const [moves, setMoves] = useState<ReviewedMove[]>([]);
  const [result, setResult] = useState<GameReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancelRef = useRef(false);
  const runningRef = useRef(false);

  const totalPlies = parsed
    ? Math.min(parsed.san.length, Math.max(0, maxPlies))
    : 0;

  const reset = useCallback(() => {
    cancelRef.current = true;
    try {
      stopThinking();
    } catch {
      /* best-effort */
    }
    runningRef.current = false;
    setStatus("idle");
    setMoves([]);
    setResult(null);
    setError(null);
  }, [stopThinking]);

  // Reset when the parsed game or analysis parameters change (depth/maxPlies included).
  useEffect(() => {
    reset();
  }, [parsed, reset, analysisStrictness, depth, maxPlies]);

  const cancel = useCallback(() => {
    if (!runningRef.current) return;
    cancelRef.current = true;
    try {
      stopThinking();
    } catch {
      // best-effort
    }
  }, [stopThinking]);

  const start = useCallback(() => {
    if (!parsed || totalPlies === 0) {
      setError("No game to analyze");
      setStatus("error");
      return;
    }
    if (runningRef.current) return;
    if (!isReady) {
      // Defer: caller can re-trigger when isReady flips, or rely on the
      // effect below that auto-starts when the engine becomes ready.
      setStatus("engine-loading");
      return;
    }

    cancelRef.current = false;
    runningRef.current = true;
    setMoves([]);
    setResult(null);
    setError(null);
    setStatus("running");

    const pendingPartial: ReviewedMove[] = [];
    const flushPartialMoves = (force = false) => {
      if (pendingPartial.length === 0) return;
      if (!force && pendingPartial.length < 3) return;
      const batch = pendingPartial.splice(0, pendingPartial.length);
      setMoves((prev) => [...prev, ...batch]);
    };

    void runReview();

    async function runReview() {
      try {
        const aggregated = await analyzeParsedGameForReview({
          parsed: parsed!,
          getBestMoveAndEval,
          depth,
          maxPlies: totalPlies,
          analysisStrictness,
          isCancelled: () => cancelRef.current,
          onPartialMove: (reviewed, ply) => {
            pendingPartial.push(reviewed);
            const isLast = ply + 1 >= totalPlies;
            flushPartialMoves(isLast);
          },
        });
        flushPartialMoves(true);
        setResult(aggregated);
        setStatus("done");
      } catch (err) {
        if (err instanceof ReviewCancelledError) {
          runningRef.current = false;
          setStatus("cancelled");
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      } finally {
        runningRef.current = false;
      }
    }
  }, [
    parsed,
    totalPlies,
    isReady,
    depth,
    analysisStrictness,
    getBestMoveAndEval,
  ]);

  // Auto-start once the engine becomes ready if the caller already requested it.
  useEffect(() => {
    if (status === "engine-loading" && isReady) {
      start();
    }
  }, [status, isReady, start]);

  return {
    status,
    progress: moves.length,
    total: totalPlies,
    moves,
    result,
    engineReady: isReady,
    error,
    start,
    cancel,
    reset,
    getPersonaStyleMove,
  };
}
