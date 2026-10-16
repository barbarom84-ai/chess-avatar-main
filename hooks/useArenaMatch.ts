"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { EngineConfig } from "@/lib/analysis";
import type { ArenaOutcome } from "@/lib/arena-chess";
import {
  playArenaPly,
  type ArenaEngineDeps,
  type ArenaEngineMove,
  type ArenaMatchSettings,
  type ArenaPlyResult,
} from "@/lib/arena-match-runner";
import { getArenaMoveDisplayDelayMs } from "@/lib/arena-move-timing";
import {
  createPlayoffClock,
  type PlayoffClockState,
} from "@/lib/arena-playoff-clock";
import type { PvpTimePreset } from "@/lib/pvp-time-controls";

/** Extra wait on top of the engine movetime before giving up on a move. */
const ENGINE_TIMEOUT_GRACE_MS = 20_000;

export type ArenaMatchEngine = {
  getBestMove: (
    fen: string,
    config: EngineConfig,
    onMove: (move: string, info?: { scoreStm?: number }) => void,
    options?: {
      moveHistoryUci: string[];
      playerColor: "white" | "black";
      arenaStyle?: boolean;
    }
  ) => void;
  getPositionEvaluation: (fen: string, depth?: number) => Promise<number>;
  stopThinking: () => void;
};

export type ArenaMatchView = {
  history: string[];
  sans: string[];
  /** White-POV evaluation after each ply (`null` = not evaluated). */
  evals: (number | null)[];
  fen: string;
  lastMove: { from: string; to: string } | null;
  evalWhitePov: number | null;
  clock: PlayoffClockState | null;
  outcome: ArenaOutcome | null;
  /** Engine is computing the current ply. */
  thinking: boolean;
  /** A local human must play this side on the board. */
  awaitingHuman: "w" | "b" | null;
  /** Auto-play loop is active. */
  running: boolean;
  error: "engine" | null;
};

type HumanAnswer = string | "timeout" | "resign" | "draw" | null;

type PendingHumanMove = {
  fen: string;
  settle: (answer: HumanAnswer) => void;
};

const START_FEN = new Chess().fen();

const EMPTY_VIEW: ArenaMatchView = {
  history: [],
  sans: [],
  evals: [],
  fen: START_FEN,
  lastMove: null,
  evalWhitePov: null,
  clock: null,
  outcome: null,
  thinking: false,
  awaitingHuman: null,
  running: false,
  error: null,
};

export type ArenaRunMode = "auto" | "step";

export type ArenaRunOptions = {
  /** Start from the initial position (discarding the current game). */
  fresh?: boolean;
  /** Creates a clock for this preset when the game has none yet. */
  clockPreset?: Pick<PvpTimePreset, "initialSec" | "incrementSec"> | null;
};

/**
 * Arena game state shared by the Spectator and Playoff modes (bots and local
 * humans). Owns the play loop and stops the engine when the component unmounts.
 */
export function useArenaMatch(engine: ArenaMatchEngine) {
  const engineRef = useRef(engine);
  useLayoutEffect(() => {
    engineRef.current = engine;
  });

  const [view, setView] = useState<ArenaMatchView>(EMPTY_VIEW);
  const historyRef = useRef<string[]>([]);
  const sansRef = useRef<string[]>([]);
  const evalsRef = useRef<(number | null)[]>([]);
  const clockRef = useRef<PlayoffClockState | null>(null);
  const finishedRef = useRef(false);
  const runningRef = useRef(false);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const pendingHumanRef = useRef<PendingHumanMove | null>(null);

  const cancelHumanMove = useCallback(() => {
    pendingHumanRef.current?.settle(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runningRef.current = false;
      cancelHumanMove();
      engineRef.current.stopThinking();
    };
  }, [cancelHumanMove]);

  const deps = useMemo<ArenaEngineDeps>(
    () => ({
      getMove: (fen, config, opts) =>
        new Promise<ArenaEngineMove | null>((resolve) => {
          let settled = false;
          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            resolve(null);
          }, Math.max(0, config.timeControl) + ENGINE_TIMEOUT_GRACE_MS);
          const settle = (move: ArenaEngineMove | null) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(move);
          };
          try {
            engineRef.current.getBestMove(
              fen,
              config,
              (m, info) => settle(m ? { uci: m, scoreStm: info?.scoreStm } : null),
              opts
            );
          } catch {
            settle(null);
          }
        }),
      getHumanMove: (fen, { color, timeLimitMs }) =>
        new Promise<HumanAnswer>((resolve) => {
          pendingHumanRef.current?.settle(null);
          let timer: ReturnType<typeof setTimeout> | null = null;
          const pending: PendingHumanMove = {
            fen,
            settle: (answer) => {
              if (pendingHumanRef.current !== pending) return;
              pendingHumanRef.current = null;
              if (timer) clearTimeout(timer);
              if (mountedRef.current) setView((v) => ({ ...v, awaitingHuman: null }));
              resolve(answer);
            },
          };
          pendingHumanRef.current = pending;
          if (timeLimitMs != null) {
            timer = setTimeout(() => pending.settle("timeout"), Math.max(0, timeLimitMs));
          }
          setView((v) => ({ ...v, thinking: false, awaitingHuman: color }));
        }),
      evaluate: (fen, depth) =>
        engineRef.current.getPositionEvaluation(fen, depth),
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      now: () => Date.now(),
    }),
    []
  );

  const clearState = useCallback(() => {
    historyRef.current = [];
    sansRef.current = [];
    evalsRef.current = [];
    clockRef.current = null;
    finishedRef.current = false;
  }, []);

  const reset = useCallback(() => {
    runningRef.current = false;
    cancelHumanMove();
    if (busyRef.current) engineRef.current.stopThinking();
    clearState();
    setView(EMPTY_VIEW);
  }, [cancelHumanMove, clearState]);

  const pause = useCallback(() => {
    runningRef.current = false;
    cancelHumanMove();
    engineRef.current.stopThinking();
    setView((v) => ({ ...v, running: false }));
  }, [cancelHumanMove]);

  /** Plays the waiting human's move; `false` when no move is expected or it is illegal. */
  const submitHumanMove = useCallback((uci: string): boolean => {
    const pending = pendingHumanRef.current;
    if (!pending) return false;
    try {
      const game = new Chess(pending.fen);
      game.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
      });
    } catch {
      return false;
    }
    pending.settle(uci);
    return true;
  }, []);

  const resignHuman = useCallback((): boolean => {
    const pending = pendingHumanRef.current;
    if (!pending) return false;
    pending.settle("resign");
    return true;
  }, []);

  /** Hot-seat: both sides agree to a draw (single click while a human is to move). */
  const offerDrawHuman = useCallback((): boolean => {
    const pending = pendingHumanRef.current;
    if (!pending) return false;
    pending.settle("draw");
    return true;
  }, []);

  const run = useCallback(
    async (
      settings: ArenaMatchSettings,
      mode: ArenaRunMode,
      options: ArenaRunOptions = {}
    ): Promise<ArenaPlyResult | null> => {
      if (busyRef.current) return null;
      if (options.fresh) {
        clearState();
        setView(EMPTY_VIEW);
      }
      if (finishedRef.current) return null;
      if (options.clockPreset && !clockRef.current) {
        clockRef.current = createPlayoffClock(options.clockPreset);
      }

      busyRef.current = true;
      runningRef.current = mode === "auto";
      const shouldContinue =
        mode === "auto"
          ? () => runningRef.current && mountedRef.current
          : () => mountedRef.current;
      let last: ArenaPlyResult | null = null;

      try {
        for (;;) {
          if (clockRef.current) {
            clockRef.current = { ...clockRef.current, turnStartedAt: Date.now() };
          }
          const clockAtStart = clockRef.current;
          setView((v) => ({
            ...v,
            thinking: true,
            running: mode === "auto",
            clock: clockAtStart,
            error: null,
          }));

          const ply = await playArenaPly(
            settings,
            {
              history: historyRef.current,
              clock: clockRef.current,
              shouldContinue,
            },
            deps
          );
          if (!mountedRef.current) return ply;
          last = ply;

          if (ply.move) {
            sansRef.current = [...sansRef.current, ply.move.san];
            evalsRef.current = [...evalsRef.current, ply.evalWhitePov];
          }
          historyRef.current = ply.history;
          clockRef.current = ply.clock;
          if (ply.status === "finished") finishedRef.current = true;

          const sans = sansRef.current;
          const evals = evalsRef.current;
          setView((v) => ({
            ...v,
            history: ply.history,
            sans,
            evals,
            fen: ply.fen,
            lastMove: ply.move ? { from: ply.move.from, to: ply.move.to } : v.lastMove,
            evalWhitePov: ply.evalWhitePov ?? v.evalWhitePov,
            clock: ply.clock,
            outcome: ply.outcome ?? v.outcome,
            thinking: false,
            error: ply.error ?? null,
          }));

          if (ply.status !== "continue" || mode === "step") break;
          if (!runningRef.current) break;
          await deps.sleep(getArenaMoveDisplayDelayMs("middlegame", 0));
          if (!runningRef.current || !mountedRef.current) break;
        }
      } finally {
        busyRef.current = false;
        runningRef.current = false;
        if (mountedRef.current) {
          setView((v) => ({ ...v, running: false, thinking: false, awaitingHuman: null }));
        }
      }
      return last;
    },
    [clearState, deps]
  );

  return {
    view,
    run,
    pause,
    reset,
    submitHumanMove,
    resignHuman,
    offerDrawHuman,
    isFinished: view.outcome != null,
  };
}
