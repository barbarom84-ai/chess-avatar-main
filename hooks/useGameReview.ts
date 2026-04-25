"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStockfish } from "./useStockfish";
import {
  aggregateReview,
  buildReviewedMove,
  type GameReviewResult,
  type ParsedGameForReview,
  type ReviewedMove,
} from "@/lib/game-review";

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
}: UseGameReviewOptions): UseGameReviewState {
  const { isReady, getBestMoveAndEval, stopThinking } = useStockfish();

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
    cancelRef.current = false;
    runningRef.current = false;
    setStatus("idle");
    setMoves([]);
    setResult(null);
    setError(null);
  }, []);

  // Reset when the parsed game changes (e.g. user opens a different PGN).
  useEffect(() => {
    reset();
  }, [parsed, reset]);

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

    void runReview();

    async function runReview() {
      const collected: ReviewedMove[] = [];
      try {
        for (let ply = 0; ply < totalPlies; ply++) {
          if (cancelRef.current) {
            runningRef.current = false;
            setStatus("cancelled");
            return;
          }

          const fenBefore = parsed!.fenBefore[ply];
          const fenAfter = parsed!.fenAfter[ply];
          const san = parsed!.san[ply];
          const uci = parsed!.uci[ply];
          const sideToMove = parsed!.sideToMove[ply];

          // 1) Best move + best eval at the position before the move.
          const best = await getBestMoveAndEval(fenBefore, depth);
          if (cancelRef.current) {
            runningRef.current = false;
            setStatus("cancelled");
            return;
          }

          // 2) Player eval: if the played move is the engine's best move,
          //    the eval after the player's move equals best.evalPawns.
          //    Otherwise we must evaluate the position after the played move.
          let playerEvalPawns = best.evalPawns;
          let isMatePlayer: boolean | undefined = best.isMate;
          const playerIsBest = best.move && best.move === uci;
          if (!playerIsBest) {
            const afterPlayer = await getBestMoveAndEval(fenAfter, depth);
            if (cancelRef.current) {
              runningRef.current = false;
              setStatus("cancelled");
              return;
            }
            // Eval after player's move: we just searched the position from the
            // opponent's POV. Stockfish's `score cp` is from the side to move,
            // but `getBestMoveAndEval` already returns it in white POV pawns
            // (it parses raw `score cp` which is side-to-move; see note below).
            //
            // Stockfish reports `score cp` from the side to move. To convert to
            // white POV we'd need to negate when it's black to move. The
            // existing `getBestMoveAndEval` does NOT negate, so the value is
            // side-to-move POV. For our CPL math we only need consistency, so
            // we normalize both `bestEval` and `playerEval` to white POV here.
            playerEvalPawns = normalizeToWhitePov(
              afterPlayer.evalPawns,
              // The side to move in fenAfter is the opponent of `sideToMove`.
              opposite(sideToMove)
            );
            isMatePlayer = afterPlayer.isMate;
          }

          // Stockfish's eval at fenBefore is from `sideToMove` POV (the side to move).
          // Normalize to white POV so analysis-engine math is consistent.
          const evalBeforeWhite = normalizeToWhitePov(best.evalPawns, sideToMove);
          // best.evalPawns is the eval AFTER the engine plays its best move,
          // i.e. now it's the opponent's turn. The score reported is
          // side-to-move POV at the moment of the search root, which is the
          // position before any move. So bestEval == evalBeforeWhite (engine
          // best line). We use that for the "best line eval".
          const bestEvalWhite = evalBeforeWhite;

          const reviewed = buildReviewedMove({
            ply,
            san,
            uci,
            sideToMove,
            evalBefore: evalBeforeWhite,
            bestMove: best.move ?? "",
            bestEval: bestEvalWhite,
            playerEval: playerIsBest ? bestEvalWhite : playerEvalPawns,
            isMateBest: best.isMate,
            isMatePlayer,
          });

          collected.push(reviewed);
          setMoves((prev) => [...prev, reviewed]);
        }

        const aggregated = aggregateReview(collected);
        setResult(aggregated);
        setStatus("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      } finally {
        runningRef.current = false;
      }
    }
  }, [parsed, totalPlies, isReady, depth, getBestMoveAndEval]);

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
  };
}

function opposite(side: "white" | "black"): "white" | "black" {
  return side === "white" ? "black" : "white";
}

/**
 * Stockfish's `score cp` is reported from the side-to-move's perspective.
 * We convert to white POV so all CPL math stays consistent.
 */
function normalizeToWhitePov(
  evalPawnsStmPov: number,
  sideToMove: "white" | "black"
): number {
  return sideToMove === "white" ? evalPawnsStmPov : -evalPawnsStmPov;
}
