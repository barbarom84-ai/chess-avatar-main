"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { EngineConfig } from "@/lib/analysis";
import {
  forcedLinePrefixMatchesBotMovesOnly,
  getEffectiveForcedLinesByColor,
  nextForcedMoveForBot,
  remainingForcedMovesForBot,
} from "@/lib/forced-line-utils";
import {
  DEFAULT_HUMAN_BLUNDER_INTERVAL,
  pickForcedHumanBlunder,
  shouldPlayHumanBlunderMove,
} from "@/lib/bot-move-count";

const DEBUG = typeof window !== "undefined" && (window as unknown as { __CHESS_DEBUG?: boolean }).__CHESS_DEBUG;

/** Skill 0–20 : courbe plus basse pour les niveaux 1–3 (jouabilité débutant / intermédiaire). */
function skillLevelFromDifficulty(d: number): number {
  const clamped = Math.min(5, Math.max(1, Math.round(d)));
  const map: Record<number, number> = { 1: 2, 2: 5, 3: 9, 4: 15, 5: 20 };
  return map[clamped] ?? 10;
}

/** Elo UCI Stockfish (1320–3190) à partir du profil. */
function uciEloFromConfig(elo: number): number {
  return Math.min(3190, Math.max(1320, Math.round(elo)));
}

/**
 * MultiPV pour tirer parfois un coup sous-optimal (2e, 3e ligne…).
 * 0 = désactivé (niveaux élevés).
 */
function multiPvCountForDifficulty(d: number): number {
  if (d <= 1) return 4;
  if (d === 2) return 3;
  if (d === 3) return 2;
  return 1;
}

/** Choisit un coup parmi les lignes MultiPV (plus le rang est haut, plus le coup est souvent mauvais). */
function pickMoveWithSuboptimalNoise(
  bestFromEngine: string,
  lineMoves: Map<number, string>,
  difficulty: number
): string {
  const n = lineMoves.size;
  if (n < 2 || !bestFromEngine) return bestFromEngine;

  const r = Math.random();
  let pickRank = 1;

  if (difficulty <= 1) {
    if (r < 0.12) pickRank = 4;
    else if (r < 0.28) pickRank = 3;
    else if (r < 0.48) pickRank = 2;
  } else if (difficulty === 2) {
    if (r < 0.1) pickRank = 3;
    else if (r < 0.3) pickRank = 2;
  } else if (difficulty === 3) {
    if (r < 0.14) pickRank = 2;
  }

  if (pickRank === 1) return bestFromEngine;

  for (let rank = pickRank; rank >= 2; rank--) {
    const alt = lineMoves.get(rank);
    if (alt && alt !== bestFromEngine) return alt;
  }
  return bestFromEngine;
}

export function useStockfish() {
  const engineRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [currentEval, setCurrentEval] = useState<number | null>(null);
  const messageQueueRef = useRef<string[]>([]);
  const [remainingForcedMoves, setRemainingForcedMoves] = useState<string[]>([]);

  useEffect(() => {
    try {
      const worker = new Worker("/stockfish.js");
      engineRef.current = worker;

      worker.onmessage = (e: MessageEvent) => {
        const message = e.data;
        if (typeof message === "string") {
          if (DEBUG) console.log("Stockfish:", message);
          if (message.includes("uciok")) worker.postMessage("isready");
          if (message.includes("readyok")) {
            setIsReady(true);
            while (messageQueueRef.current.length > 0) {
              const cmd = messageQueueRef.current.shift();
              if (cmd) worker.postMessage(cmd);
            }
          }
        }
      };

      worker.postMessage("uci");

      return () => {
        worker.terminate();
        engineRef.current = null;
        setIsReady(false);
      };
    } catch (error) {
      console.error("Erreur init Stockfish:", error);
      setIsReady(false);
    }
  }, []);

  const sendCommand = useCallback((command: string) => {
    if (!engineRef.current) return;
    if (isReady) engineRef.current.postMessage(command);
    else messageQueueRef.current.push(command);
  }, [isReady]);

  const getBestMove = (
    fen: string,
    config: EngineConfig,
    onMove: (move: string) => void,
    options?: { moveHistoryUci: string[]; playerColor: "white" | "black" }
  ) => {
    if (!isReady || !engineRef.current) return;

    const moveHistoryUci = options?.moveHistoryUci ?? [];
    const playerColor = options?.playerColor ?? "white";
    const nextPly = moveHistoryUci.length;
    const { white: fw, black: fb } = getEffectiveForcedLinesByColor(config);
    const hasForced = fw.length > 0 || fb.length > 0;
    if (DEBUG && hasForced) {
      console.log(" forced W:", fw.join(" "), "B:", fb.join(" "), "nextPly:", nextPly);
    }

    setIsThinking(true);
    setCurrentEval(null);

    const maxForcedPlies = Math.max(fw.length, fb.length) * 2 + 4;
    if (hasForced && nextPly <= maxForcedPlies) {
      const botPlaysWhite = playerColor === "black";
      const prefixMatches =
        nextPly === 0 ||
        forcedLinePrefixMatchesBotMovesOnly(fw, fb, moveHistoryUci, botPlaysWhite);

      if (!prefixMatches) {
        setRemainingForcedMoves([]);
      } else {
        const botTurn = (nextPly % 2 === 0) === botPlaysWhite;
        const forcedMove = nextForcedMoveForBot(fw, fb, nextPly, botPlaysWhite);

        if (botTurn && forcedMove) {
          const from = forcedMove.substring(0, 2);
          const to = forcedMove.substring(2, 4);
          const promotion = forcedMove.length > 4 ? forcedMove[4] : undefined;

          try {
            const testGame = new Chess();
            for (let i = 0; i < moveHistoryUci.length; i++) {
              const m = moveHistoryUci[i];
              if (!m || m.length < 4) throw new Error("Invalid history");
              const f = m.substring(0, 2);
              const t = m.substring(2, 4);
              const p = m.length > 4 ? m[4] : undefined;
              if (!testGame.move(p ? { from: f, to: t, promotion: p } : { from: f, to: t })) {
                throw new Error("Replay failed");
              }
            }
            const moveObj = promotion ? { from, to, promotion } : { from, to };
            if (testGame.move(moveObj)) {
              setRemainingForcedMoves(
                remainingForcedMovesForBot(fw, fb, nextPly + 1, botPlaysWhite)
              );
              setIsThinking(false);
              setTimeout(() => onMove(forcedMove), 80);
              return;
            }
          } catch {
            // Fallback to Stockfish
          }
          setRemainingForcedMoves([]);
        } else if (!botTurn) {
          setRemainingForcedMoves(
            remainingForcedMovesForBot(fw, fb, nextPly, botPlaysWhite)
          );
        } else {
          setRemainingForcedMoves([]);
        }
      }
    }

    const threads = Math.max(2, config.threads);
    const skill = skillLevelFromDifficulty(config.difficulty);
    const baseMultiPv = multiPvCountForDifficulty(config.difficulty);
    const hbInterval =
      config.humanBlunderInterval === 0
        ? 0
        : (config.humanBlunderInterval ?? DEFAULT_HUMAN_BLUNDER_INTERVAL);
    const botPlaysWhite = playerColor === "black";
    const humanBlunder = shouldPlayHumanBlunderMove(
      moveHistoryUci,
      botPlaysWhite,
      hbInterval
    );
    const multiPv = humanBlunder ? Math.max(baseMultiPv, 4) : baseMultiPv;
    const lineMoves = new Map<number, string>();

    const resetEngineOptions = () => {
      sendCommand("setoption name MultiPV value 1");
      sendCommand("setoption name UCI_LimitStrength value false");
    };

    sendCommand(`setoption name Skill Level value ${skill}`);
    sendCommand(`setoption name Threads value ${threads}`);
    if (config.difficulty <= 3) {
      sendCommand("setoption name UCI_LimitStrength value true");
      sendCommand(`setoption name UCI_Elo value ${uciEloFromConfig(config.elo)}`);
    } else {
      sendCommand("setoption name UCI_LimitStrength value false");
    }
    if (multiPv > 1) {
      sendCommand(`setoption name MultiPV value ${multiPv}`);
    } else {
      sendCommand("setoption name MultiPV value 1");
    }
    sendCommand(`position fen ${fen}`);
    sendCommand(`go depth ${config.depth} movetime ${config.timeControl}`);

    const handleMessage = (e: MessageEvent) => {
      const message = e.data;
      if (typeof message !== "string") return;

      if (multiPv > 1 && message.startsWith("info ") && message.includes(" pv ")) {
        const mp = message.match(/\bmultipv\s+(\d+)/i);
        const pvMatch = message.match(/\bpv\s+(\S+)/);
        if (mp && pvMatch) {
          const idx = parseInt(mp[1], 10);
          const first = pvMatch[1];
          if (first && /^[a-h][1-8][a-h][1-8]/.test(first)) lineMoves.set(idx, first);
        }
      }

      if (message.includes("score cp")) {
        const match = message.match(/score cp (-?\d+)/);
        if (match) setCurrentEval(parseInt(match[1]) / 100);
      }

      if (message.startsWith("bestmove")) {
        const raw = message.split(/\s+/)[1];
        let move = raw && raw !== "(none)" ? raw : "";
        if (multiPv > 1 && move) {
          move = humanBlunder
            ? pickForcedHumanBlunder(move, lineMoves)
            : pickMoveWithSuboptimalNoise(move, lineMoves, config.difficulty);
        }
        resetEngineOptions();
        setIsThinking(false);
        onMove(move);
        engineRef.current?.removeEventListener("message", handleMessage);
      }
    };

    engineRef.current?.addEventListener("message", handleMessage);
  };

  const getBestMoveForFen = (fen: string, depth = 12): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!isReady || !engineRef.current) {
        reject(new Error("Stockfish not ready"));
        return;
      }
      let settled = false;
      const finish = (move: string) => {
        if (settled) return;
        settled = true;
        engineRef.current?.removeEventListener("message", handleMessage);
        resolve(move);
      };
      const handleMessage = (e: MessageEvent) => {
        const message = e.data;
        if (typeof message !== "string") return;
        if (message.startsWith("bestmove")) {
          const parts = message.split(/\s+/);
          finish(parts[1] ?? "");
        }
      };
      engineRef.current.addEventListener("message", handleMessage);
      sendCommand(`position fen ${fen}`);
      sendCommand(`go depth ${depth}`);
      // Generous safety timeout: if the engine stalls, ask it to stop —
      // we still wait for the bestmove (which `stop` always produces) so
      // we never resolve while the engine is mid-search.
      setTimeout(() => sendCommand("stop"), 30_000);
    });
  };

  /**
   * Returns the best move and its evaluation (white POV, in pawns).
   * Captures the last "score cp" from info lines before "bestmove".
   * For "score mate N", returns a sentinel eval (±10 pawns) and isMate: true.
   * Use with getPositionEvaluation(fenAfterPlayerMove) to build MoveEvalInput for analysis-engine.
   */
  const getBestMoveAndEval = useCallback((
    fen: string,
    depth = 18
  ): Promise<{
    move: string;
    evalPawns: number;
    isMate?: boolean;
    /**
     * Signed mate distance in moves (NOT plies) from the side-to-move's POV
     * at search root. Positive => side-to-move is delivering mate, negative
     * => side-to-move is being mated. Undefined when the engine never reports
     * a mate score for this position.
     */
    mateInMoves?: number;
  }> => {
    return new Promise((resolve, reject) => {
      if (!isReady || !engineRef.current) {
        reject(new Error("Stockfish not ready"));
        return;
      }
      let lastEvalPawns: number | null = null;
      let isMate = false;
      let lastMateInMoves: number | null = null;
      let settled = false;

      const finish = (move: string) => {
        if (settled) return;
        settled = true;
        engineRef.current?.removeEventListener("message", handleMessage);
        resolve({
          move,
          evalPawns: lastEvalPawns ?? 0,
          isMate: isMate || undefined,
          mateInMoves: lastMateInMoves ?? undefined,
        });
      };

      const handleMessage = (e: MessageEvent) => {
        const message = e.data;
        if (typeof message !== "string") return;

        if (message.includes("score cp")) {
          const match = message.match(/score cp (-?\d+)/);
          if (match) {
            lastEvalPawns = parseInt(match[1], 10) / 100;
            isMate = false;
            lastMateInMoves = null;
          }
        }
        if (message.includes("score mate")) {
          const match = message.match(/score mate (-?\d+)/);
          if (match) {
            const mateIn = parseInt(match[1], 10);
            lastEvalPawns = mateIn > 0 ? 10 : -10;
            isMate = true;
            // Stockfish reports `score mate N` in full moves (not plies),
            // signed from the side-to-move's POV: +N => stm mates in N,
            // -N => stm gets mated in N. We forward the signed value as-is
            // and let the caller normalize to the desired POV.
            lastMateInMoves = mateIn;
          }
        }
        if (message.startsWith("bestmove")) {
          const parts = message.split(/\s+/);
          finish(parts[1] ?? "");
        }
      };

      engineRef.current.addEventListener("message", handleMessage);
      // Defensive: if a previous search is still running on the worker
      // (e.g. its caller bailed early), `stop` makes the engine flush its
      // pending `bestmove` BEFORE processing our new `position`/`go`. We
      // then ignore that stale bestmove and only accept the one matching
      // our search root — but in practice the worker is already idle here
      // because callers await this function. The `stop` is harmless when
      // the engine isn't searching.
      sendCommand("stop");
      sendCommand(`position fen ${fen}`);
      sendCommand(`go depth ${depth}`);

      // Safety net: if the engine ever stalls, ask it to stop. We still
      // wait for the resulting `bestmove` (every `stop` produces one) so
      // we never resolve with a value from a different position than the
      // one we just searched.
      setTimeout(() => {
        if (!settled) sendCommand("stop");
      }, 30_000);
    });
  }, [isReady, sendCommand]);

  const getPositionEvaluation = useCallback((fen: string, depth = 18): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (!isReady || !engineRef.current) {
        reject(new Error("Stockfish not ready"));
        return;
      }

      let lastEval: number | null = null;
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        engineRef.current?.removeEventListener("message", handleMessage);
        resolve(lastEval ?? 0);
      };

      const handleMessage = (e: MessageEvent) => {
        const message = e.data;
        if (typeof message !== "string") return;

        if (message.includes("score cp")) {
          const match = message.match(/score cp (-?\d+)/);
          if (match) lastEval = parseInt(match[1]) / 100;
        }
        if (message.startsWith("bestmove")) {
          finish();
        }
      };

      engineRef.current.addEventListener("message", handleMessage);
      sendCommand(`position fen ${fen}`);
      sendCommand(`go depth ${depth}`);

      // Wait for the engine to finish; if it ever stalls, ask it to stop
      // (which produces a `bestmove` we then catch). We never resolve
      // mid-search, otherwise a stale bestmove could leak into the next
      // request on the same shared worker.
      setTimeout(() => {
        if (!settled) sendCommand("stop");
      }, 30_000);
    });
  }, [isReady, sendCommand]);

  const analyzePosition = (fen: string, depth = 15) => {
    if (isReady && engineRef.current) {
      sendCommand(`position fen ${fen}`);
      sendCommand(`go depth ${depth}`);
    }
  };

  const stopThinking = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.postMessage("stop");
      setIsThinking(false);
    }
  }, []);

  const resetForcedLine = () => setRemainingForcedMoves([]);

  return {
    isReady,
    isThinking,
    currentEval,
    getBestMove,
    getBestMoveForFen,
    getBestMoveAndEval,
    getPositionEvaluation,
    analyzePosition,
    stopThinking,
    sendCommand,
    resetForcedLine,
    remainingForcedMoves,
  };
}
