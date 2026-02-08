"use client";

import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { EngineConfig } from "@/lib/analysis";
import { getEffectiveForcedLine, normalizeUci } from "@/lib/forced-line-utils";

const DEBUG = typeof window !== "undefined" && (window as unknown as { __CHESS_DEBUG?: boolean }).__CHESS_DEBUG;

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
    sendCommand(`setoption name Skill Level value ${config.difficulty * 4}`);
    sendCommand(`setoption name Threads value ${threads}`);
    sendCommand(`position fen ${fen}`);
    sendCommand(`go depth ${config.depth} movetime ${config.timeControl}`);

    const handleMessage = (e: MessageEvent) => {
      const message = e.data;
      if (typeof message !== "string") return;

      if (message.includes("score cp")) {
        const match = message.match(/score cp (-?\d+)/);
        if (match) setCurrentEval(parseInt(match[1]) / 100);
      }

      if (message.startsWith("bestmove")) {
        const move = message.split(" ")[1];
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
