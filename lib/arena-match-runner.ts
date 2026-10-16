import type { EngineConfig } from "@/lib/analysis";
import {
  arenaAgreedDrawOutcome,
  arenaForfeitOutcome,
  arenaResignOutcome,
  classifyArenaOutcome,
  replayUci,
  stmEvalToWhitePov,
  type ArenaOutcome,
} from "@/lib/arena-chess";
import { prepareArenaEngineConfig } from "@/lib/arena-forced-opening";
import {
  ARENA_CRUSHING_WIN_PAWNS,
  arenaRefereeEvalDepth,
  winnerFromCrushingEval,
} from "@/lib/arena-move-limit";
import {
  getArenaThinkBudgetMs,
  getSingleLegalMoveUci,
  isArenaTheoreticalOpening,
  type ArenaSpeed,
} from "@/lib/arena-move-timing";
import {
  commitPlayoffClockTurn,
  remainingPlayoffClockMs,
  type PlayoffClockState,
} from "@/lib/arena-playoff-clock";
import type { ArenaCadence } from "@/lib/arena-time-controls";

/** Engine answer; `scoreStm` is the searched score of the played line (mover's POV, pawns). */
export type ArenaEngineMove = { uci: string; scoreStm?: number | null };

/**
 * Above this (white POV, pawns) a search score is confirmed by the referee before it
 * can end the game by adjudication; below it the search score is trusted as is.
 */
export const ARENA_REFEREE_CONFIRM_PAWNS = 4;

export type ArenaEngineDeps = {
  getMove: (
    fen: string,
    config: EngineConfig,
    opts: {
      moveHistoryUci: string[];
      playerColor: "white" | "black";
      arenaStyle: boolean;
    }
  ) => Promise<string | ArenaEngineMove | null>;
  /**
   * Waits for a local human's move. Resolves `"timeout"` once `timeLimitMs`
   * elapses (clock flag) and `null` when the wait is cancelled (pause, reset).
   */
  getHumanMove?: (
    fen: string,
    opts: { color: "w" | "b"; timeLimitMs: number | null }
  ) => Promise<string | "timeout" | "resign" | "draw" | null>;
  /** Side-to-move POV evaluation in pawns. */
  evaluate: (fen: string, depth: number) => Promise<number>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
};

export type ArenaMatchSettings = {
  white: EngineConfig;
  black: EngineConfig;
  depthCap: number;
  cadence: ArenaCadence;
  forcedOpeningId?: string | null;
  speed?: ArenaSpeed;
  maxPlies: number;
  lang: "fr" | "en";
  arenaStyle?: boolean;
  evalDepth?: number;
  /** Sides played by a local human through `deps.getHumanMove`. */
  humanSides?: { w?: boolean; b?: boolean };
};

export type ArenaPlyInput = {
  history: string[];
  clock: PlayoffClockState | null;
  /** Checked after the engine answers: `false` drops the move (pause). */
  shouldContinue?: () => boolean;
};

export type ArenaPlyMove = { uci: string; from: string; to: string; san: string };

export type ArenaPlyResult = {
  status: "continue" | "finished" | "aborted";
  history: string[];
  fen: string;
  move: ArenaPlyMove | null;
  /** White POV; `null` when no evaluation was computed for this ply. */
  evalWhitePov: number | null;
  clock: PlayoffClockState | null;
  outcome: ArenaOutcome | null;
  maxMovesReached: boolean;
  error?: "engine";
};

async function safeEvalWhitePov(
  fen: string,
  deps: ArenaEngineDeps,
  depth: number
): Promise<number | null> {
  try {
    const raw = await deps.evaluate(fen, depth);
    if (!Number.isFinite(raw)) return null;
    return stmEvalToWhitePov(fen, raw);
  } catch {
    return null;
  }
}

function parseUci(uci: string) {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion:
      uci.length > 4 ? (uci[4] as "q" | "r" | "b" | "n") : undefined,
  };
}

/**
 * Plays one half-move of an arena game: engine (or local human) move, evaluation
 * (the engine's own search score, or a referee eval overlapped with the think
 * pad when there is none or the position looks decisive) and end detection.
 */
export async function playArenaPly(
  settings: ArenaMatchSettings,
  input: ArenaPlyInput,
  deps: ArenaEngineDeps
): Promise<ArenaPlyResult> {
  const { history } = input;
  const lang = settings.lang;
  const evalDepth = settings.evalDepth ?? arenaRefereeEvalDepth(settings.speed);
  const game = replayUci(history);

  const result = (patch: Partial<ArenaPlyResult>): ArenaPlyResult => ({
    status: "continue",
    history,
    fen: game.fen(),
    move: null,
    evalWhitePov: null,
    clock: input.clock,
    outcome: null,
    maxMovesReached: false,
    ...patch,
  });

  if (game.isGameOver()) {
    return result({
      status: "finished",
      outcome: classifyArenaOutcome(game, false, lang),
    });
  }

  if (history.length >= settings.maxPlies) {
    const ev = await safeEvalWhitePov(game.fen(), deps, evalDepth);
    return result({
      status: "finished",
      evalWhitePov: ev,
      maxMovesReached: true,
      outcome: classifyArenaOutcome(game, true, lang, undefined, ev),
    });
  }

  const stm = game.turn();
  const clockAtStart = input.clock;
  const thinkStartedAt = deps.now();
  // Only engine thinking is charged: UI pauses and referee evals are free.
  const sideClockMs = clockAtStart
    ? remainingPlayoffClockMs(clockAtStart, stm, clockAtStart.turnStartedAt)
    : undefined;
  const cfg = prepareArenaEngineConfig(
    stm === "w" ? settings.white : settings.black,
    {
      depthCap: settings.depthCap,
      ply: history.length,
      game,
      forcedOpeningId: settings.forcedOpeningId,
      cadence: settings.cadence,
      historyUci: history,
      sideClockMs,
      speed: settings.speed,
    }
  );

  const human = Boolean(settings.humanSides?.[stm]) && Boolean(deps.getHumanMove);
  const singleUci = human ? null : getSingleLegalMoveUci(game);
  const budgetMs =
    human || singleUci
      ? 0
      : getArenaThinkBudgetMs(
          isArenaTheoreticalOpening(cfg, history.length, history),
          sideClockMs,
          false,
          settings.speed
        );

  const flagOutcome = (): ArenaPlyResult =>
    result({
      status: "finished",
      clock: clockAtStart
        ? stm === "w"
          ? { ...clockAtStart, whiteMs: 0 }
          : { ...clockAtStart, blackMs: 0 }
        : clockAtStart,
      outcome: classifyArenaOutcome(game, false, lang, stm === "w" ? "black" : "white"),
    });

  let answer: string | ArenaEngineMove | null;
  if (human) {
    const played = await deps.getHumanMove!(game.fen(), {
      color: stm,
      timeLimitMs: sideClockMs ?? null,
    });
    if (played === "timeout") {
      if (input.shouldContinue && !input.shouldContinue()) return result({ status: "aborted" });
      return flagOutcome();
    }
    if (played === "resign") {
      return result({
        status: "finished",
        outcome: arenaResignOutcome(stm === "w" ? "white" : "black", lang),
      });
    }
    if (played === "draw") {
      return result({ status: "finished", outcome: arenaAgreedDrawOutcome(lang) });
    }
    if (played == null) return result({ status: "aborted" });
    answer = played;
  } else {
    answer =
      singleUci ??
      (await deps.getMove(game.fen(), cfg, {
        moveHistoryUci: history,
        playerColor: stm === "w" ? "black" : "white",
        arenaStyle: settings.arenaStyle ?? false,
      }));
  }
  const engineDoneAt = deps.now();
  const uci = typeof answer === "string" ? answer : (answer?.uci ?? null);
  const scoreStm =
    answer && typeof answer === "object" && Number.isFinite(answer.scoreStm)
      ? (answer.scoreStm as number)
      : null;

  if (input.shouldContinue && !input.shouldContinue()) {
    return result({ status: "aborted" });
  }
  if (!uci || uci.length < 4) {
    return result({ status: "aborted", error: "engine" });
  }

  const next = replayUci(history);
  const { from, to, promotion } = parseUci(uci);
  let san: string;
  try {
    const mv = next.move(promotion ? { from, to, promotion } : { from, to });
    if (!mv) throw new Error("illegal");
    san = mv.san;
  } catch {
    return result({
      status: "finished",
      outcome: arenaForfeitOutcome(stm === "w" ? "white" : "black", lang),
    });
  }

  const gameOver = next.isGameOver();
  const padMs = Math.max(0, budgetMs - (engineDoneAt - thinkStartedAt));
  const searchWhitePov = scoreStm == null ? null : stm === "w" ? scoreStm : -scoreStm;
  // Fast mode trusts the search score unless we're near a crushing adjudication.
  const nearCrush =
    searchWhitePov != null && Math.abs(searchWhitePov) >= ARENA_CRUSHING_WIN_PAWNS - 1;
  const needsReferee =
    !gameOver &&
    (searchWhitePov == null ||
      (settings.speed === "fast"
        ? nearCrush
        : Math.abs(searchWhitePov) >= ARENA_REFEREE_CONFIRM_PAWNS));
  const [evalWhitePov] = await Promise.all([
    needsReferee
      ? safeEvalWhitePov(next.fen(), deps, evalDepth)
      : Promise.resolve<number | null>(gameOver ? null : searchWhitePov),
    padMs > 0 ? deps.sleep(padMs) : Promise.resolve(),
  ]);

  if (input.shouldContinue && !input.shouldContinue()) {
    return result({ status: "aborted" });
  }

  let clock = clockAtStart;
  if (clockAtStart && sideClockMs != null) {
    const chargedAt = Math.max(engineDoneAt, thinkStartedAt + budgetMs);
    if (sideClockMs - (chargedAt - thinkStartedAt) <= 0) return flagOutcome();
    clock = {
      ...commitPlayoffClockTurn(
        { ...clockAtStart, turnStartedAt: thinkStartedAt },
        stm,
        chargedAt
      ),
      turnStartedAt: deps.now(),
    };
  }

  const nextHistory = [...history, uci];
  const moved = {
    history: nextHistory,
    fen: next.fen(),
    move: { uci, from, to, san },
    evalWhitePov,
    clock,
  };

  if (gameOver) {
    return {
      ...result(moved),
      status: "finished",
      outcome: classifyArenaOutcome(next, false, lang),
    };
  }
  if (winnerFromCrushingEval(evalWhitePov)) {
    return {
      ...result(moved),
      status: "finished",
      outcome: classifyArenaOutcome(next, false, lang, undefined, evalWhitePov),
    };
  }
  if (nextHistory.length >= settings.maxPlies) {
    return {
      ...result(moved),
      status: "finished",
      maxMovesReached: true,
      outcome: classifyArenaOutcome(next, true, lang, undefined, evalWhitePov),
    };
  }
  return result(moved);
}

/** Plays plies until the game ends or is aborted. */
export async function playArenaMatch(
  settings: ArenaMatchSettings,
  deps: ArenaEngineDeps,
  opts: {
    history?: string[];
    clock?: PlayoffClockState | null;
    shouldContinue?: () => boolean;
    onPly?: (ply: ArenaPlyResult) => void;
    plyDelayMs?: number;
  } = {}
): Promise<ArenaPlyResult> {
  let history = opts.history ?? [];
  let clock = opts.clock ?? null;
  for (;;) {
    const ply = await playArenaPly(
      settings,
      { history, clock, shouldContinue: opts.shouldContinue },
      deps
    );
    opts.onPly?.(ply);
    if (ply.status !== "continue") return ply;
    history = ply.history;
    clock = ply.clock;
    if (opts.plyDelayMs) await deps.sleep(opts.plyDelayMs);
    if (opts.shouldContinue && !opts.shouldContinue()) {
      return { ...ply, status: "aborted" };
    }
  }
}
