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
import {
  multiPvCountForDifficulty,
  pickPersonaBiasedMove,
  skillLevelFromDifficulty,
  uciEloFromConfig,
} from "@/lib/persona-engine-params";
import { debounce } from "@/lib/debounce";
import {
  stockfishClient,
  stockfishGetBestMoveAndEval,
  stockfishGetBestMoveForFen,
  stockfishGetPositionEvaluation,
} from "@/lib/stockfish-client";
import {
  chessAvatarClient,
  chessAvatarGetBestMove,
  webSearchLimits,
  type ChessAvatarSearchStats,
} from "@/lib/chessavatar-client";
import {
  getBotEnginePreference,
  resolveBotEngine,
  type BotEngineContext,
  type BotEngineRuntime,
} from "@/lib/bot-engine-preference";

const DEBUG = typeof window !== "undefined" && (window as unknown as { __CHESS_DEBUG?: boolean }).__CHESS_DEBUG;

function botEngineContext(config: EngineConfig): BotEngineContext {
  return { elo: config.elo, difficulty: config.difficulty };
}

export function useStockfish() {
  const [isReady, setIsReady] = useState(false);
  const [isChessAvatarReady, setIsChessAvatarReady] = useState(false);
  const [isChessAvatarPlayReady, setIsChessAvatarPlayReady] = useState(false);
  const [isChessAvatarNnueLoading, setIsChessAvatarNnueLoading] = useState(false);
  const [chessAvatarSearchStats, setChessAvatarSearchStats] =
    useState<ChessAvatarSearchStats | null>(null);
  const [lastBotEngineUsed, setLastBotEngineUsed] = useState<BotEngineRuntime | null>(
    null
  );
  const [isThinking, setIsThinking] = useState(false);
  const [currentEval, setCurrentEval] = useState<number | null>(null);
  const [remainingForcedMoves, setRemainingForcedMoves] = useState<string[]>([]);

  useEffect(() => {
    stockfishClient.acquire();
    chessAvatarClient.acquire();
    let cancelled = false;

    const syncReady = () => {
      if (cancelled) return;
      setIsChessAvatarReady(chessAvatarClient.isReady);
      setIsChessAvatarPlayReady(chessAvatarClient.isPlayReady);
      setIsChessAvatarNnueLoading(chessAvatarClient.isNnueLoading);
      setChessAvatarSearchStats(chessAvatarClient.searchStats);
    };

    void Promise.all([
      stockfishClient.waitUntilReady(),
      chessAvatarClient.waitUntilReady(),
      chessAvatarClient.waitUntilPlayReady(),
    ]).then(([stockfishOk, chessAvatarOk, chessAvatarPlayOk]) => {
      if (!cancelled) {
        setIsReady(stockfishOk);
        setIsChessAvatarReady(chessAvatarOk);
        setIsChessAvatarPlayReady(chessAvatarPlayOk);
        syncReady();
      }
    });

    const poll = setInterval(syncReady, 500);

    return () => {
      cancelled = true;
      clearInterval(poll);
      stockfishClient.release();
      chessAvatarClient.release();
      setIsReady(false);
      setIsChessAvatarReady(false);
      setIsChessAvatarPlayReady(false);
      setIsChessAvatarNnueLoading(false);
      setChessAvatarSearchStats(null);
    };
  }, []);

  const sendCommand = useCallback((command: string) => {
    stockfishClient.sendCommand(command);
  }, []);

  const isBotEngineReady = useCallback((): boolean => {
    const preference = getBotEnginePreference();
    const resolved = resolveBotEngine(
      preference,
      isChessAvatarReady,
      isReady,
      isChessAvatarPlayReady
    );
    return resolved !== null;
  }, [isReady, isChessAvatarReady, isChessAvatarPlayReady]);

  const getBestMove = (
    fen: string,
    config: EngineConfig,
    onMove: (move: string) => void,
    options?: { moveHistoryUci: string[]; playerColor: "white" | "black" }
  ) => {
    if (!isBotEngineReady()) return;

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
    const hashMb = 64;
    const botCtx = botEngineContext(config);
    const searchLimits = webSearchLimits(
      config.depth,
      config.timeControl,
      config.difficulty,
      config.elo
    );

    const playWithChessAvatar = () => {
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

      return chessAvatarGetBestMove(fen, {
        skillLevel: skill,
        depth: searchLimits.depth,
        movetime: searchLimits.movetime,
        hashMb,
        difficulty: config.difficulty,
        elo: config.elo,
        personaConfig: config,
        multiPv,
        humanBlunder,
      });
    };

    const playWithStockfish = () =>
      stockfishClient.enqueue<string>((ctx) => {
        const lineMoves = new Map<number, string>();
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

        const resetEngineOptions = () => {
          ctx.send("setoption name MultiPV value 1");
          ctx.send("setoption name UCI_LimitStrength value false");
        };

        ctx.onLine((line) => {
          if (multiPv > 1 && line.startsWith("info ") && line.includes(" pv ")) {
            const mp = line.match(/\bmultipv\s+(\d+)/i);
            const pvMatch = line.match(/\bpv\s+(\S+)/);
            if (mp && pvMatch) {
              const idx = parseInt(mp[1], 10);
              const first = pvMatch[1];
              if (first && /^[a-h][1-8][a-h][1-8]/.test(first)) lineMoves.set(idx, first);
            }
          }

          if (line.includes("score cp")) {
            const match = line.match(/score cp (-?\d+)/);
            if (match) setCurrentEval(parseInt(match[1], 10) / 100);
          }

          if (line.startsWith("bestmove")) {
            const raw = line.split(/\s+/)[1];
            let move = raw && raw !== "(none)" ? raw : "";
            if (multiPv > 1 && move) {
              move = humanBlunder
                ? pickForcedHumanBlunder(move, lineMoves)
                : pickPersonaBiasedMove(move, lineMoves, config);
            }
            resetEngineOptions();
            return move;
          }
          return undefined;
        });

        ctx.send(`setoption name Skill Level value ${skill}`);
        ctx.send(`setoption name Threads value ${threads}`);
        if (config.difficulty <= 3) {
          ctx.send("setoption name UCI_LimitStrength value true");
          ctx.send(`setoption name UCI_Elo value ${uciEloFromConfig(config.elo)}`);
        } else {
          ctx.send("setoption name UCI_LimitStrength value false");
        }
        if (multiPv > 1) {
          ctx.send(`setoption name MultiPV value ${multiPv}`);
        } else {
          ctx.send("setoption name MultiPV value 1");
        }
        ctx.send(`position fen ${fen}`);
        ctx.send(
          `go depth ${searchLimits.depth} movetime ${searchLimits.movetime}`
        );
        setTimeout(() => ctx.stop(), searchLimits.movetime + 5000);
      });

    const botMovePromise = (() => {
      const preference = getBotEnginePreference();
      const resolved = resolveBotEngine(
        preference,
        isChessAvatarReady,
        isReady,
        isChessAvatarPlayReady,
        botCtx
      );

      const markChessAvatar = (move: string) => {
        setLastBotEngineUsed("chessavatar");
        return move;
      };
      const markStockfish = (move: string) => {
        setLastBotEngineUsed("stockfish");
        return move;
      };

      if (resolved === "chessavatar") {
        return playWithChessAvatar()
          .then(markChessAvatar)
          .catch(() => {
            if (preference === "stockfish" || !isReady) throw new Error("Bot move failed");
            return playWithStockfish().then(markStockfish);
          });
      }

      if (resolved === "stockfish") {
        return playWithStockfish().then(markStockfish);
      }

      return Promise.reject(new Error("No bot engine ready"));
    })();

    void botMovePromise
      .then((move) => {
        setIsThinking(false);
        onMove(move);
      })
      .catch(() => setIsThinking(false));
  };

  const getPersonaStyleMoveWithStockfish = useCallback(
    (
      fen: string,
      config: EngineConfig,
      opts?: { depth?: number; movetime?: number }
    ): Promise<string> => {
      const depth = Math.min(opts?.depth ?? Math.min(config.depth, 14), 18);
      const movetime = Math.min(opts?.movetime ?? config.timeControl, 1200);
      const skill = skillLevelFromDifficulty(config.difficulty);
      const threads = Math.max(2, config.threads);
      const baseMulti = multiPvCountForDifficulty(config.difficulty);
      const multiPv = Math.max(2, baseMulti);

      return stockfishClient.enqueue<string>((ctx) => {
        const lineMoves = new Map<number, string>();

        const resetEngineOptions = () => {
          ctx.send("setoption name MultiPV value 1");
          ctx.send("setoption name UCI_LimitStrength value false");
        };

        ctx.onLine((line) => {
          if (multiPv > 1 && line.startsWith("info ") && line.includes(" pv ")) {
            const mp = line.match(/\bmultipv\s+(\d+)/i);
            const pvMatch = line.match(/\bpv\s+(\S+)/);
            if (mp && pvMatch) {
              const idx = parseInt(mp[1], 10);
              const first = pvMatch[1];
              if (first && /^[a-h][1-8][a-h][1-8]/.test(first)) {
                lineMoves.set(idx, first);
              }
            }
          }
          if (line.startsWith("bestmove")) {
            const raw = line.split(/\s+/)[1];
            let move = raw && raw !== "(none)" ? raw : "";
            if (multiPv > 1 && move) {
              move = pickPersonaBiasedMove(move, lineMoves, config);
            }
            resetEngineOptions();
            return move;
          }
          return undefined;
        });

        ctx.send(`setoption name Skill Level value ${skill}`);
        ctx.send(`setoption name Threads value ${threads}`);
        if (config.difficulty <= 3) {
          ctx.send("setoption name UCI_LimitStrength value true");
          ctx.send(`setoption name UCI_Elo value ${uciEloFromConfig(config.elo)}`);
        } else {
          ctx.send("setoption name UCI_LimitStrength value false");
        }
        ctx.send(`setoption name MultiPV value ${multiPv}`);
        ctx.send(`position fen ${fen}`);
        ctx.send(`go depth ${depth} movetime ${movetime}`);
        setTimeout(() => ctx.stop(), 35_000);
      }).then((move) => {
        setLastBotEngineUsed("stockfish");
        return move;
      });
    },
    [isReady]
  );

  const getPersonaStyleMove = useCallback(
    (
      fen: string,
      config: EngineConfig,
      opts?: { depth?: number; movetime?: number }
    ): Promise<string> => {
      const depth = Math.min(opts?.depth ?? Math.min(config.depth, 14), 18);
      const movetime = Math.min(opts?.movetime ?? config.timeControl, 1200);
      const skill = skillLevelFromDifficulty(config.difficulty);
      const hashMb = 64;
      const preference = getBotEnginePreference();
      const botCtx = botEngineContext(config);
      const personaLimits = webSearchLimits(
        depth,
        movetime,
        config.difficulty,
        config.elo
      );
      const resolved = resolveBotEngine(
        preference,
        isChessAvatarReady,
        isReady,
        isChessAvatarPlayReady,
        botCtx
      );

      if (resolved === "chessavatar") {
        return chessAvatarGetBestMove(fen, {
          skillLevel: skill,
          depth: personaLimits.depth,
          movetime: personaLimits.movetime,
          hashMb,
          difficulty: config.difficulty,
          elo: config.elo,
        })
          .then((move) => {
            setLastBotEngineUsed("chessavatar");
            return move;
          })
          .catch(() => {
            if (preference === "stockfish" || !isReady) {
              return Promise.reject(new Error("ChessAvatar move failed"));
            }
            return stockfishGetBestMoveForFen(fen, depth).then((move) => {
              setLastBotEngineUsed("stockfish");
              return move;
            });
          });
      }

      if (resolved === "stockfish") {
        return getPersonaStyleMoveWithStockfish(fen, config, { depth, movetime });
      }

      return Promise.reject(new Error("No bot engine ready"));
    },
    [isReady, isChessAvatarReady, isChessAvatarPlayReady, getPersonaStyleMoveWithStockfish]
  );

  const getBestMoveForFen = useCallback(
    (fen: string, depth = 12): Promise<string> => {
      if (!isReady) return Promise.reject(new Error("Stockfish not ready"));
      return stockfishGetBestMoveForFen(fen, depth);
    },
    [isReady]
  );

  const getBestMoveAndEval = useCallback(
    (fen: string, depth = 18) => {
      if (!isReady) return Promise.reject(new Error("Stockfish not ready"));
      return stockfishGetBestMoveAndEval(fen, depth);
    },
    [isReady]
  );

  const getPositionEvaluation = useCallback(
    (fen: string, depth = 18): Promise<number> => {
      if (!isReady) return Promise.reject(new Error("Stockfish not ready"));
      return stockfishGetPositionEvaluation(fen, depth);
    },
    [isReady]
  );

  const debouncedIdleEvalRef = useRef<
    ReturnType<typeof debounce<(fen: string, depth: number) => void>> | null
  >(null);

  useEffect(() => {
    if (!isReady) return;
    debouncedIdleEvalRef.current = debounce((fen: string, depth: number) => {
      stockfishClient.requestIdleAnalysis(fen, depth, (line) => {
        if (line.includes("score cp")) {
          const match = line.match(/score cp (-?\d+)/);
          if (match) setCurrentEval(parseInt(match[1], 10) / 100);
        }
        if (line.includes("score mate")) {
          const match = line.match(/score mate (-?\d+)/);
          if (match) {
            const mateIn = parseInt(match[1], 10);
            setCurrentEval(mateIn > 0 ? 10 : -10);
          }
        }
      });
    }, 400);
    return () => debouncedIdleEvalRef.current?.cancel();
  }, [isReady]);

  const analyzePosition = useCallback(
    (fen: string, depth = 10) => {
      if (!isReady) return;
      debouncedIdleEvalRef.current?.(fen, depth);
    },
    [isReady]
  );

  const stopThinking = useCallback(() => {
    stockfishClient.stop();
    chessAvatarClient.stop();
    setIsThinking(false);
  }, []);

  const resetForcedLine = () => setRemainingForcedMoves([]);

  return {
    isReady: isReady || isChessAvatarReady,
    isBotEngineReady,
    isStockfishReady: isReady,
    isChessAvatarReady,
    isChessAvatarPlayReady,
    isChessAvatarNnueLoading,
    chessAvatarSearchStats,
    lastBotEngineUsed,
    isThinking,
    currentEval,
    getBestMove,
    getPersonaStyleMove,
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
