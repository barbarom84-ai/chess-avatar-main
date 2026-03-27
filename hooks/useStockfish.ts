"use client";

import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { EngineConfig } from "@/lib/analysis";
import { getEffectiveForcedLine, normalizeUci } from "@/lib/forced-line-utils";

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

  const sendCommand = (command: string) => {
    if (!engineRef.current) return;
    if (isReady) engineRef.current.postMessage(command);
    else messageQueueRef.current.push(command);
  };

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
    const forcedLine = getEffectiveForcedLine(config);
    if (DEBUG && forcedLine.length > 0) {
      console.log(" forced:", forcedLine.join(" "), "nextPly:", nextPly);
    }

    setIsThinking(true);
    setCurrentEval(null);

    if (forcedLine.length > 0 && moveHistoryUci.length <= forcedLine.length) {
      const norm = (u: string) => normalizeUci(u);
      const prefixMatches =
        nextPly === 0 ||
        forcedLine
          .slice(0, nextPly)
          .every((m, i) => norm(m) === norm(moveHistoryUci[i]));

      if (!prefixMatches) {
        setRemainingForcedMoves([]);
      } else {
        const botPlaysWhite = playerColor === "black";
        const botTurn = (nextPly % 2 === 0) === botPlaysWhite;

        if (botTurn && nextPly < forcedLine.length) {
          const forcedMove = forcedLine[nextPly];
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
              const remaining: string[] = [];
              for (let i = nextPly + 1; i < forcedLine.length; i++) {
                if ((i % 2 === 0) === botPlaysWhite) remaining.push(forcedLine[i]);
              }
              setRemainingForcedMoves(remaining);
              setIsThinking(false);
              setTimeout(() => onMove(forcedMove), 80);
              return;
            }
          } catch {
            // Fallback to Stockfish
          }
          setRemainingForcedMoves([]);
        } else if (!botTurn) {
          const remaining: string[] = [];
          for (let i = nextPly; i < forcedLine.length; i++) {
            if ((i % 2 === 0) === botPlaysWhite) remaining.push(forcedLine[i]);
          }
          setRemainingForcedMoves(remaining);
        } else {
          setRemainingForcedMoves([]);
        }
      }
    }

    const threads = Math.max(2, config.threads);
    const skill = skillLevelFromDifficulty(config.difficulty);
    const multiPv = multiPvCountForDifficulty(config.difficulty);
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
          move = pickMoveWithSuboptimalNoise(move, lineMoves, config.difficulty);
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
      const handleMessage = (e: MessageEvent) => {
        const message = e.data;
        if (typeof message !== "string") return;
        if (message.startsWith("bestmove")) {
          engineRef.current?.removeEventListener("message", handleMessage);
          const parts = message.split(/\s+/);
          resolve(parts[1] ?? "");
        }
      };
      engineRef.current.addEventListener("message", handleMessage);
      sendCommand(`position fen ${fen}`);
      sendCommand(`go depth ${depth}`);
      setTimeout(() => {
        engineRef.current?.removeEventListener("message", handleMessage);
        resolve("");
      }, 3000);
    });
  };

  /**
   * Returns the best move and its evaluation (white POV, in pawns).
   * Captures the last "score cp" from info lines before "bestmove".
   * For "score mate N", returns a sentinel eval (±10 pawns) and isMate: true.
   * Use with getPositionEvaluation(fenAfterPlayerMove) to build MoveEvalInput for analysis-engine.
   */
  const getBestMoveAndEval = (
    fen: string,
    depth = 18
  ): Promise<{ move: string; evalPawns: number; isMate?: boolean }> => {
    return new Promise((resolve, reject) => {
      if (!isReady || !engineRef.current) {
        reject(new Error("Stockfish not ready"));
        return;
      }
      let lastEvalPawns: number | null = null;
      let isMate = false;

      const handleMessage = (e: MessageEvent) => {
        const message = e.data;
        if (typeof message !== "string") return;

        if (message.includes("score cp")) {
          const match = message.match(/score cp (-?\d+)/);
          if (match) {
            lastEvalPawns = parseInt(match[1], 10) / 100;
            isMate = false;
          }
        }
        if (message.includes("score mate")) {
          const match = message.match(/score mate (-?\d+)/);
          if (match) {
            const mateIn = parseInt(match[1], 10);
            lastEvalPawns = mateIn > 0 ? 10 : -10;
            isMate = true;
          }
        }
        if (message.startsWith("bestmove")) {
          engineRef.current?.removeEventListener("message", handleMessage);
          const parts = message.split(/\s+/);
          const move = parts[1] ?? "";
          resolve({
            move,
            evalPawns: lastEvalPawns ?? 0,
            isMate: isMate || undefined,
          });
        }
      };

      engineRef.current.addEventListener("message", handleMessage);
      sendCommand(`position fen ${fen}`);
      sendCommand(`go depth ${depth}`);

      setTimeout(() => {
        engineRef.current?.removeEventListener("message", handleMessage);
        resolve({
          move: "",
          evalPawns: lastEvalPawns ?? 0,
          isMate: isMate || undefined,
        });
      }, 5000);
    });
  };

  const getPositionEvaluation = (fen: string, depth = 18): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (!isReady || !engineRef.current) {
        reject(new Error("Stockfish not ready"));
        return;
      }

      let lastEval: number | null = null;
      let depthReached = 0;

      const handleMessage = (e: MessageEvent) => {
        const message = e.data;
        if (typeof message !== "string") return;

        if (message.includes("score cp")) {
          const match = message.match(/score cp (-?\d+)/);
          if (match) lastEval = parseInt(match[1]) / 100;
        }
        if (message.includes("depth")) {
          const match = message.match(/depth (\d+)/);
          if (match) depthReached = parseInt(match[1]);
        }
        if (message.startsWith("bestmove")) {
          engineRef.current?.removeEventListener("message", handleMessage);
          resolve(lastEval ?? 0);
        }
      };

      engineRef.current.addEventListener("message", handleMessage);
      sendCommand(`position fen ${fen}`);
      sendCommand(`go depth ${depth}`);

      setTimeout(() => {
        engineRef.current?.removeEventListener("message", handleMessage);
        resolve(lastEval ?? 0);
      }, 5000);
    });
  };

  const analyzePosition = (fen: string, depth = 15) => {
    if (isReady && engineRef.current) {
      sendCommand(`position fen ${fen}`);
      sendCommand(`go depth ${depth}`);
    }
  };

  const stopThinking = () => {
    if (engineRef.current) {
      sendCommand("stop");
      setIsThinking(false);
    }
  };

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
