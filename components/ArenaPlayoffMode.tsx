"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ImageDown,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Swords,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import ArenaPlayoffBracket from "@/components/ArenaPlayoffBracket";
import ArenaPlayoffRosterDeck from "@/components/ArenaPlayoffRosterDeck";
import ArenaBoardPanel, { type ArenaStatusTone } from "@/components/arena/ArenaBoardPanel";
import BotEngineSelector from "@/components/BotEngineSelector";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useArenaMatch } from "@/hooks/useArenaMatch";
import type { ArenaEngine } from "@/hooks/useArenaEngine";
import { arenaEntrant } from "@/hooks/useArenaRatings";
import { recordArenaRatedGame } from "@/lib/arena-rating";
import type { ArenaProfilePool } from "@/hooks/useArenaProfilePool";
import { useArenaShortcuts } from "@/hooks/useArenaShortcuts";
import { usePremium } from "@/hooks/usePremium";
import { arenaResignOutcome } from "@/lib/arena-chess";
import { playoffOutcomeForSave, saveArenaMatchToCloud } from "@/lib/arena-cloud-save";
import { getCadenceDepthCap, type ArenaSpeed } from "@/lib/arena-move-timing";
import { pgnTimeControl } from "@/lib/arena-pgn";
import { shareElementAsImage } from "@/lib/share-image";
import {
  PLAYOFF_SERIES_MAX_GAMES,
  bracketFromSeedKeys,
  createPlayoffBracket,
  getNextReadyMatch,
  getOptionByKey,
  parseStoredBracket,
  recordMatchResult,
  resolveMatchSideKeys,
  roundLabel,
  runPlayoffSeries,
  seedKeysByElo,
  seedKeysRandom,
  serializeBracket,
  setSeed,
  type PlayoffBracketSize,
  type PlayoffBracketState,
  type PlayoffGameWinner,
  type PlayoffMatch,
  type PlayoffSeriesGame,
  type PlayoffSeriesResult,
} from "@/lib/arena-playoff-bracket";
import {
  createLeague,
  currentLeagueRound,
  hasLeagueResults,
  isLeagueFinished,
  leagueGameCount,
  leagueWinner,
  nextLeagueGame,
  parseStoredLeague,
  recordLeagueGame,
  type ArenaLeagueFormat,
  type ArenaLeagueState,
} from "@/lib/arena-league";
import {
  dedupeByIdentity,
  filterByPlatform,
  type ProfilePlatformFilter,
} from "@/lib/arena-profile-pool";
import ArenaLeagueTable from "@/components/arena/ArenaLeagueTable";
import { seedCandidates } from "@/lib/arena-humans";
import { ARENA_TOURNAMENT_STORAGE } from "@/lib/arena-tournament-storage";
import { cadenceFromPreset, resolveArenaTimePreset } from "@/lib/arena-time-controls";
import { useLanguage } from "@/lib/language-context";
import { isSupabaseConfigured } from "@/lib/supabase";

const PLAYOFF_DEPTH_CAP = 14;
const PLAYOFF_MAX_PLIES = 200;
const BETWEEN_GAMES_PAUSE_MS = 900;
const ARENA_PLAYOFF_SAVE_CLOUD = "chess-arena.playoff.saveCloud";
const HUMANS_MIN_PLAYERS = 4;

type PlayoffFormat = "knockout" | ArenaLeagueFormat;

const PLAYOFF_FORMATS: readonly PlayoffFormat[] = ["knockout", "roundrobin", "swiss"];

/** Round-robin above 8 players or a 4-player Swiss make little sense. */
const FORMAT_SIZES: Record<PlayoffFormat, readonly PlayoffBracketSize[]> = {
  knockout: [4, 8, 16],
  roundrobin: [4, 8],
  swiss: [8, 16],
};

function isPlayoffFormat(value: unknown): value is PlayoffFormat {
  return PLAYOFF_FORMATS.includes(value as PlayoffFormat);
}

function leagueResult(winner: PlayoffGameWinner): "1-0" | "0-1" | "1/2-1/2" {
  return winner === "white" ? "1-0" : winner === "black" ? "0-1" : "1/2-1/2";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

type EngineRecoveryChoice = "retry" | "forfeit" | "abort";

export default function ArenaPlayoffMode({
  pool,
  engine,
  forcedOpeningId = null,
  timePresetId,
  speed,
  onBusyChange,
  humansOnly = false,
}: {
  pool: ArenaProfilePool;
  engine: ArenaEngine;
  forcedOpeningId?: string | null;
  timePresetId: string;
  speed: ArenaSpeed;
  onBusyChange?: (busy: boolean) => void;
  /** Tournament between local human players only (separate saved tournament). */
  humansOnly?: boolean;
}) {
  const storage = ARENA_TOURNAMENT_STORAGE[humansOnly ? "humans" : "avatars"];
  const { t, lang } = useLanguage();
  const ap = t.arenaPage;
  const tp = t.arenaPlayoff;
  const { userId } = usePremium();
  const {
    isReady,
    isStockfishReady,
    isChessAvatarReady,
    isChessAvatarPlayReady,
    isChessAvatarNnueLoading,
    chessAvatarSearchStats,
    lastBotEngineUsed,
    getBestMove,
    stopThinking,
    getPositionEvaluation,
  } = engine;
  const { view, run, pause, reset, submitHumanMove, resignHuman, offerDrawHuman } = useArenaMatch({
    getBestMove,
    getPositionEvaluation,
    stopThinking,
  });

  const [platformFilter, setPlatformFilter] = useState<ProfilePlatformFilter>("all");
  const [bracket, setBracket] = useState<PlayoffBracketState>(() => createPlayoffBracket(8));
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [liveMatchId, setLiveMatchId] = useState<string | null>(null);
  const [tournamentRunning, setTournamentRunning] = useState(false);
  const [series, setSeries] = useState<PlayoffSeriesGame | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [dragOptionKey, setDragOptionKey] = useState<string | null>(null);
  const [tapPickKey, setTapPickKey] = useState<string | null>(null);
  const [rosterFilter, setRosterFilter] = useState("");
  const [bracketOpen, setBracketOpen] = useState(true);
  const [saveCloudGames, setSaveCloudGames] = useState(false);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [restored, setRestored] = useState(false);
  const [format, setFormat] = useState<PlayoffFormat>("knockout");
  const [league, setLeague] = useState<ArenaLeagueState | null>(null);
  const [engineRecovery, setEngineRecovery] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const stopRef = useRef(false);
  const recoveryRef = useRef<{ resolve: (c: EngineRecoveryChoice) => void } | null>(null);
  const isLeague = format !== "knockout";

  const timePreset = useMemo(() => resolveArenaTimePreset(timePresetId), [timePresetId]);
  const cadence = useMemo(() => cadenceFromPreset(timePreset), [timePreset]);
  const depthCap = useMemo(() => getCadenceDepthCap(cadence, PLAYOFF_DEPTH_CAP), [cadence]);
  const presetLabels = t.playOnline.presets as Record<string, string>;
  const timeControlLabel = presetLabels[timePreset.id] ?? timePreset.id;

  const allOptions = useMemo(() => dedupeByIdentity(pool.options), [pool.options]);
  const rosterOptions = useMemo(
    () => (humansOnly ? allOptions : filterByPlatform(allOptions, platformFilter)),
    [allOptions, platformFilter, humansOnly]
  );

  useEffect(() => {
    try {
      if (localStorage.getItem(ARENA_PLAYOFF_SAVE_CLOUD) === "1") setSaveCloudGames(true);
      const storedFormat = localStorage.getItem(storage.format);
      if (isPlayoffFormat(storedFormat)) setFormat(storedFormat);
    } catch {
      /* ignore */
    }
  }, [storage]);

  // Restore the last bracket once the pool is known (unknown players invalidate it).
  useEffect(() => {
    if (restored || pool.loading || allOptions.length === 0) return;
    let raw: string | null = null;
    let rawLeague: string | null = null;
    try {
      raw = localStorage.getItem(storage.bracket);
      rawLeague = localStorage.getItem(storage.league);
    } catch {
      /* ignore */
    }
    const validKeys = new Set(allOptions.map((o) => o.key));
    const stored = parseStoredBracket(raw, validKeys);
    if (stored) setBracket(stored);
    const storedLeague = parseStoredLeague(rawLeague, validKeys);
    if (storedLeague) {
      setLeague(storedLeague);
      setFormat(storedLeague.format);
    }
    setRestored(true);
  }, [restored, pool.loading, allOptions, storage]);

  useEffect(() => {
    if (!restored) return;
    writeStorage(storage.bracket, serializeBracket(bracket));
  }, [restored, bracket, storage]);

  useEffect(() => {
    if (!restored) return;
    writeStorage(storage.format, format);
    try {
      if (league) localStorage.setItem(storage.league, JSON.stringify(league));
      else localStorage.removeItem(storage.league);
    } catch {
      /* ignore */
    }
  }, [restored, format, league, storage]);

  useEffect(() => {
    writeStorage(ARENA_PLAYOFF_SAVE_CLOUD, saveCloudGames ? "1" : "0");
  }, [saveCloudGames]);

  const busy = tournamentRunning || liveMatchId != null;
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const filledSeeds = bracket.seeds.filter(Boolean).length;
  const rosterComplete = filledSeeds >= bracket.size;
  const anyDone = isLeague
    ? hasLeagueResults(league)
    : bracket.matches.some((m) => m.status === "done");
  const seedsLocked = busy || anyDone;
  const nextReady = getNextReadyMatch(bracket);
  const canContinue = isLeague ? !(league && isLeagueFinished(league)) : nextReady != null;
  const canRun = rosterComplete && !busy && canContinue && isReady;
  const showBoard = busy || anyDone || view.history.length > 0;
  const placedKeys = useMemo(
    () => new Set(bracket.seeds.filter(Boolean) as string[]),
    [bracket.seeds]
  );
  const activeMatch = bracket.matches.find((m) => m.id === activeMatchId) ?? null;
  const roundLabels = {
    final: tp.roundFinal,
    semi: tp.roundSemi,
    quarter: tp.roundQuarter,
    round16: tp.roundOf16,
  };

  const changeSize = (size: PlayoffBracketSize) => {
    if (size === bracket.size) return;
    setBracket(createPlayoffBracket(size));
    setLeague(null);
    setActiveMatchId(null);
    setLastResult(null);
    reset();
  };

  const changeFormat = (next: PlayoffFormat) => {
    if (next === format) return;
    setFormat(next);
    setLeague(null);
    setActiveMatchId(null);
    setLastResult(null);
    setSeries(null);
    reset();
    const sizes = FORMAT_SIZES[next];
    if (!sizes.includes(bracket.size)) {
      setBracket(createPlayoffBracket(sizes.includes(8) ? 8 : sizes[0]));
    } else if (bracket.matches.some((m) => m.status === "done")) {
      // Keep the players but drop knockout results.
      setBracket(bracketFromSeedKeys(bracket.size, bracket.seeds.filter(Boolean) as string[]));
    }
  };

  const autoSeed = (order: "elo" | "random") => {
    const candidates = seedCandidates(rosterOptions, placedKeys, bracket.size, order, humansOnly);
    seedWith(
      order === "elo"
        ? seedKeysByElo(candidates, bracket.size)
        : seedKeysRandom(candidates, bracket.size)
    );
  };

  const seedWith = (keys: string[] | null) => {
    if (!keys) {
      toast.error(
        (humansOnly ? tp.notEnoughHumans : tp.notEnoughProfiles).replace("{n}", String(bracket.size))
      );
      return;
    }
    setBracket(bracketFromSeedKeys(bracket.size, keys));
    setLeague(null);
    setTapPickKey(null);
  };

  const newTournament = () => {
    setBracket(createPlayoffBracket(bracket.size));
    setLeague(null);
    setActiveMatchId(null);
    setLastResult(null);
    setStatusNote(null);
    setSeries(null);
    reset();
  };

  const handleDropSeed = useCallback((slot: number, key: string | null) => {
    setBracket((prev) => setSeed(prev, slot, key));
    setLeague(null);
    setTapPickKey(null);
  }, []);

  const askEngineRecovery = useCallback((): Promise<EngineRecoveryChoice> => {
    return new Promise((resolve) => {
      recoveryRef.current?.resolve("abort");
      recoveryRef.current = { resolve };
      setEngineRecovery(true);
      setStatusNote(tp.engineRecoveryHint);
      toast.error(ap.engineError);
    });
  }, [tp.engineRecoveryHint, ap.engineError]);

  const resolveEngineRecovery = useCallback((choice: EngineRecoveryChoice) => {
    recoveryRef.current?.resolve(choice);
    recoveryRef.current = null;
    setEngineRecovery(false);
  }, []);

  const playSeriesGame = useCallback(
    async (game: PlayoffSeriesGame, matchId: string) => {
      if (game.index > 0) {
        setStatusNote(game.armageddon ? tp.armageddonStart : tp.rematchSwap);
        await sleep(BETWEEN_GAMES_PAUSE_MS);
        if (stopRef.current) return null;
      }
      const whiteOpt = getOptionByKey(allOptions, game.whiteKey);
      const blackOpt = getOptionByKey(allOptions, game.blackKey);
      if (!whiteOpt || !blackOpt) return null;
      setSeries(game);
      setStatusNote(null);

      const hasHuman = Boolean(whiteOpt.human || blackOpt.human);
      for (;;) {
        const startedAt = Date.now();
        const res = await run(
          {
            white: whiteOpt.config,
            black: blackOpt.config,
            depthCap,
            cadence,
            forcedOpeningId,
            speed,
            maxPlies: PLAYOFF_MAX_PLIES,
            lang,
            humanSides: { w: Boolean(whiteOpt.human), b: Boolean(blackOpt.human) },
          },
          "auto",
          { fresh: true, clockPreset: timePreset }
        );
        if (stopRef.current) return null;

        if (res?.status === "finished" && res.outcome) {
          const winner = res.outcome.winner;
          recordArenaRatedGame(arenaEntrant(whiteOpt), arenaEntrant(blackOpt), winner);
          const note =
            game.armageddon && winner === "draw"
              ? tp.armageddonDrawNote.replace("{name}", blackOpt.config.name)
              : res.outcome.resultMessage;

          if (saveCloudGames && userId && res.history.length > 0 && !hasHuman) {
            const winnerKey =
              winner === "white"
                ? game.whiteKey
                : winner === "black" || game.armageddon
                  ? game.blackKey
                  : null;
            try {
              await saveArenaMatchToCloud({
                whiteConfig: whiteOpt.config,
                blackConfig: blackOpt.config,
                uciHist: res.history,
                outcome: playoffOutcomeForSave(
                  winnerKey,
                  game.whiteKey,
                  game.blackKey,
                  note,
                  res.outcome
                ),
                durationSeconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
                event: humansOnly ? "Chess Avatar Arena Humans" : "Chess Avatar Arena Playoff",
                round: `${matchId}.${game.index + 1}`,
              });
              toast.success(ap.cloudSavedToast);
            } catch (e) {
              console.error(e);
              toast.error(ap.cloudSaveErrorToast);
            }
          }
          return { winner, note };
        }

        if (res?.error === "engine") {
          const choice = await askEngineRecovery();
          if (choice === "retry") continue;
          if (choice === "forfeit") {
            const stmLose = (res.history.length % 2 === 0 ? "white" : "black") as "white" | "black";
            const outcome = arenaResignOutcome(stmLose, lang);
            const note = `${tp.engineForfeitNote} — ${outcome.resultMessage}`;
            recordArenaRatedGame(arenaEntrant(whiteOpt), arenaEntrant(blackOpt), outcome.winner);
            return { winner: outcome.winner, note };
          }
          return null;
        }
        return null;
      }
    },
    [
      allOptions,
      run,
      depthCap,
      cadence,
      forcedOpeningId,
      speed,
      lang,
      timePreset,
      saveCloudGames,
      userId,
      humansOnly,
      askEngineRecovery,
      tp.armageddonStart,
      tp.rematchSwap,
      tp.armageddonDrawNote,
      tp.engineForfeitNote,
      ap.cloudSavedToast,
      ap.cloudSaveErrorToast,
    ]
  );

  const playMatch = useCallback(
    async (match: PlayoffMatch, state: PlayoffBracketState): Promise<PlayoffSeriesResult | null> => {
      const { keyA, keyB } = resolveMatchSideKeys(match, state);
      if (!keyA || !keyB) return null;
      setActiveMatchId(match.id);
      setLiveMatchId(match.id);
      try {
        const result = await runPlayoffSeries(keyA, keyB, (game) =>
          playSeriesGame(game, match.id)
        );
        if (result) {
          const winnerName = getOptionByKey(allOptions, result.winnerKey)?.config.name ?? "";
          setLastResult(`${winnerName} — ${result.note}`);
        }
        return result;
      } finally {
        setLiveMatchId(null);
      }
    },
    [playSeriesGame, allOptions]
  );

  const runLeague = useCallback(async () => {
    if (!canRun || !isLeague) return;
    stopRef.current = false;
    setTournamentRunning(true);
    setBracketOpen(false);
    let state = league;
    if (!state) {
      const ranked = (bracket.seeds.filter(Boolean) as string[])
        .map((key) => ({ key, elo: getOptionByKey(allOptions, key)?.config.elo ?? 0 }))
        .sort((a, b) => b.elo - a.elo)
        .map((p) => p.key);
      state = createLeague(format, ranked);
      setLeague(state);
    }
    try {
      for (;;) {
        const done = state.games.filter((g) => g.result != null).length;
        const total = state.games.length;
        setProgressLabel(
          tp.tournamentProgress
            .replace("{done}", String(done + 1))
            .replace("{total}", String(total))
        );
        const game = nextLeagueGame(state);
        if (!game?.blackKey) break;
        setLiveMatchId(game.id);
        const played = await playSeriesGame(
          { index: 0, whiteKey: game.whiteKey, blackKey: game.blackKey, armageddon: false },
          game.id
        );
        setLiveMatchId(null);
        if (!played) break;
        const result = leagueResult(played.winner);
        state = recordLeagueGame(state, game.id, result, played.note);
        setLeague(state);
        const w = getOptionByKey(allOptions, game.whiteKey)?.config.name ?? "";
        const b = getOptionByKey(allOptions, game.blackKey)?.config.name ?? "";
        setLastResult(`${w} ${result === "1/2-1/2" ? "½-½" : result} ${b} — ${played.note}`);
        if (stopRef.current) break;
        await sleep(BETWEEN_GAMES_PAUSE_MS);
        if (stopRef.current) break;
      }
    } finally {
      setLiveMatchId(null);
      setTournamentRunning(false);
      setStatusNote(null);
      setProgressLabel(null);
    }
  }, [canRun, isLeague, league, bracket.seeds, allOptions, format, playSeriesGame, tp.tournamentProgress]);

  const runTournament = useCallback(async () => {
    if (!canRun) return;
    if (isLeague) {
      await runLeague();
      return;
    }
    stopRef.current = false;
    setTournamentRunning(true);
    setBracketOpen(false);
    let state = bracket;
    const totalMatches = state.size - 1;
    try {
      for (;;) {
        const done = state.matches.filter((m) => m.status === "done").length;
        setProgressLabel(
          tp.tournamentProgress
            .replace("{done}", String(done + 1))
            .replace("{total}", String(totalMatches))
        );
        const next = getNextReadyMatch(state);
        if (!next) break;
        const result = await playMatch(next, state);
        if (!result) break;
        state = recordMatchResult(state, next.id, result.winnerKey, result.note);
        setBracket(state);
        if (stopRef.current) break;
        await sleep(BETWEEN_GAMES_PAUSE_MS);
        if (stopRef.current) break;
      }
    } finally {
      setTournamentRunning(false);
      setStatusNote(null);
      setProgressLabel(null);
    }
  }, [canRun, isLeague, runLeague, bracket, playMatch, tp.tournamentProgress]);

  const playSelected = useCallback(async () => {
    if (!activeMatch || activeMatch.status !== "ready" || busy || !isReady) return;
    stopRef.current = false;
    const result = await playMatch(activeMatch, bracket);
    setStatusNote(null);
    if (result) {
      setBracket((prev) =>
        recordMatchResult(prev, activeMatch.id, result.winnerKey, result.note)
      );
    }
  }, [activeMatch, busy, isReady, playMatch, bracket]);

  const handlePause = useCallback(() => {
    stopRef.current = true;
    if (engineRecovery) resolveEngineRecovery("abort");
    pause();
  }, [pause, engineRecovery, resolveEngineRecovery]);

  const bracketRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const shareBracket = async () => {
    const el = bracketRef.current;
    if (!el || sharing) return;
    setSharing(true);
    try {
      const res = await shareElementAsImage(
        el,
        `chess-avatar-arena-${format}.png`,
        `Chess Avatar Arena — ${isLeague ? tp.standingsTitle : tp.bracketTitle}`
      );
      if (res === "downloaded") toast.success(ap.imageSaved);
    } catch (e) {
      console.error(e);
      toast.error(ap.imageError);
    } finally {
      setSharing(false);
    }
  };

  const flip = () => setOrientation((o) => (o === "white" ? "black" : "white"));

  useArenaShortcuts({
    onToggle: () => (busy ? handlePause() : void runTournament()),
    onFlip: flip,
  });

  if (pool.loading && pool.options.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-slate-400 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        <span className="text-sm">{ap.loadingProfiles}</span>
      </div>
    );
  }

  if (humansOnly && allOptions.length < HUMANS_MIN_PLAYERS && !anyDone) {
    return (
      <div className="arena-panel arena-empty-hint" data-testid="humans-need-players">
        <Swords className="h-6 w-6 text-amber-400" aria-hidden />
        <p className="text-sm text-slate-200">
          {tp.humansNeedPlayers.replace("{n}", String(HUMANS_MIN_PLAYERS))}
        </p>
        <p className="text-xs text-slate-500">{tp.humansNeedPlayersHint}</p>
      </div>
    );
  }

  const whiteOpt = series ? getOptionByKey(allOptions, series.whiteKey) : undefined;
  const blackOpt = series ? getOptionByKey(allOptions, series.blackKey) : undefined;
  const champion = getOptionByKey(
    allOptions,
    isLeague ? (league ? leagueWinner(league) : null) : bracket.championKey
  );

  let statusText: string = tp.selectMatch;
  let statusTone: ArenaStatusTone = "idle";
  if (!isReady) {
    statusText = ap.needEngine;
    statusTone = "warn";
  } else if (view.error) {
    statusText = ap.engineError;
    statusTone = "warn";
  } else if (statusNote) {
    statusText = statusNote;
    statusTone = "warn";
  } else if (view.awaitingHuman) {
    const mover = view.awaitingHuman === "w" ? whiteOpt : blackOpt;
    statusText = ap.statusHumanTurn.replace("{name}", mover?.config.name || "");
    statusTone = "live";
  } else if (view.running || view.thinking) {
    statusText = tp.matchLive.replace("{tc}", timeControlLabel);
    statusTone = "live";
  } else if (view.outcome) {
    statusText = view.outcome.resultMessage;
    statusTone = "result";
  } else if (lastResult) {
    statusText = lastResult;
    statusTone = "result";
  } else if (view.history.length > 0) {
    statusText = tp.matchPaused;
  }

  const liveMatch = isLeague
    ? undefined
    : bracket.matches.find((m) => m.id === (liveMatchId ?? activeMatchId));
  const leagueRoundLabel =
    league &&
    tp.leagueRound
      .replace("{n}", String(currentLeagueRound(league) + 1))
      .replace("{total}", String(league.totalRounds));
  const boardHeader = (
    <div className="space-y-1" data-testid="playoff-board-header">
      {progressLabel && (
        <p className="text-[11px] font-medium text-cyan-300/90" data-testid="playoff-progress">
          {progressLabel}
        </p>
      )}
      {isLeague
        ? series && leagueRoundLabel && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-amber-300">{leagueRoundLabel}</span>
              <span className="text-slate-400">
                {format === "swiss" ? tp.formatSwiss : tp.formatRoundRobin}
              </span>
            </div>
          )
        : series &&
          liveMatch && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-amber-300">
                {roundLabel(liveMatch.round, bracket.size, roundLabels)}
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                {tp.gameLabel
                  .replace("{n}", String(series.index + 1))
                  .replace("{total}", String(PLAYOFF_SERIES_MAX_GAMES))}
                {series.armageddon && (
                  <span className="rounded bg-red-900/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-100">
                    {tp.armageddonBadge}
                  </span>
                )}
              </span>
            </div>
          )}
    </div>
  );

  const controls = engineRecovery ? (
    <>
      <Button
        size="sm"
        className="bg-amber-600 hover:bg-amber-500"
        onClick={() => resolveEngineRecovery("retry")}
        data-testid="playoff-engine-retry"
      >
        <Play className="h-4 w-4 mr-1" />
        {tp.engineRetry}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="border-rose-700/60 text-rose-200"
        onClick={() => resolveEngineRecovery("forfeit")}
        data-testid="playoff-engine-forfeit"
      >
        {tp.engineForfeit}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => resolveEngineRecovery("abort")}
        data-testid="playoff-engine-abort"
      >
        <Pause className="h-4 w-4 mr-1" />
        {ap.pause}
      </Button>
    </>
  ) : busy ? (
    <Button size="sm" variant="destructive" onClick={handlePause} data-testid="playoff-pause">
      <Pause className="h-4 w-4 mr-1" />
      {ap.pause}
    </Button>
  ) : canContinue && rosterComplete ? (
    <Button
      size="sm"
      className="bg-amber-600 hover:bg-amber-500"
      disabled={!canRun}
      onClick={() => void runTournament()}
    >
      <Play className="h-4 w-4 mr-1" />
      {anyDone ? tp.resumeTournament : tp.runTournament}
    </Button>
  ) : null;

  const formatLabels: Record<PlayoffFormat, string> = {
    knockout: tp.formatKnockout,
    roundrobin: tp.formatRoundRobin,
    swiss: tp.formatSwiss,
  };
  const formatHint = isLeague
    ? `${tp.leagueHint.replace("{games}", String(leagueGameCount(format, bracket.size)))}${
        format === "swiss" ? ` ${tp.swissHint}` : ""
      }`
    : `${tp.tiebreakHint} ${tp.crushingHint}`;

  const platformButtons: { id: ProfilePlatformFilter; label: string }[] = [
    { id: "all", label: t.library.platformAll },
    { id: "lichess", label: t.library.platformLichess },
    { id: "chesscom", label: t.library.platformChesscom },
    { id: "human", label: ap.platformHumanShort },
  ];

  return (
    <div className="arena-playoff-layout space-y-3">
      <div className="arena-panel flex flex-wrap items-center gap-2 px-3 py-2">
        <Swords className="h-4 w-4 text-amber-400 shrink-0" />
        <div role="radiogroup" aria-label={tp.formatLabel} className="arena-segmented">
          {PLAYOFF_FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={format === f}
              data-active={format === f}
              className="arena-segmented__item"
              disabled={seedsLocked}
              onClick={() => changeFormat(f)}
              data-testid={`playoff-format-${f}`}
            >
              {formatLabels[f]}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label={tp.bracketTitle} className="arena-segmented">
          {FORMAT_SIZES[format].map((size) => (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={bracket.size === size}
              data-active={bracket.size === size}
              className="arena-segmented__item"
              disabled={seedsLocked}
              onClick={() => changeSize(size)}
            >
              {tp.playersCount.replace("{n}", String(size))}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          disabled={seedsLocked}
          onClick={() => autoSeed("elo")}
          data-testid="playoff-seed-elo"
        >
          {tp.autoSeed}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          disabled={seedsLocked}
          onClick={() => autoSeed("random")}
        >
          <Shuffle className="h-3.5 w-3.5 mr-1" />
          {tp.randomSeed}
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs bg-amber-600 hover:bg-amber-500"
          disabled={!canRun}
          onClick={() => void runTournament()}
          data-testid="playoff-run"
        >
          <Play className="h-3.5 w-3.5 mr-1" />
          {anyDone ? tp.resumeTournament : tp.runTournament}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          disabled={busy || (filledSeeds === 0 && !anyDone && !league)}
          onClick={newTournament}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          {tp.newTournament}
        </Button>
        <span className="text-[11px] text-slate-500 ml-auto tabular-nums">
          {tp.seedsFilled
            .replace("{{n}}", String(filledSeeds))
            .replace("{{total}}", String(bracket.size))}
        </span>
        <p className="basis-full text-[11px] text-slate-500">
          {formatHint}
          {!humansOnly && allOptions.some((o) => o.human) ? ` ${tp.mixedSeedHint}` : ""}
        </p>
      </div>

      {champion && (
        <div className="arena-champion" role="status" data-testid="playoff-champion">
          <Trophy className="h-8 w-8 text-amber-400 shrink-0" />
          {champion.config.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={champion.config.avatarUrl} alt="" className="h-12 w-12 rounded-full border-2 border-amber-400 object-cover" />
          ) : null}
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-amber-400">{tp.tournamentDone}</p>
            <p className="text-xl font-bold text-cyan-50 truncate">
              {tp.champion} : {champion.config.name}
            </p>
          </div>
        </div>
      )}

      <div
        className={`grid gap-3 items-start ${
          showBoard
            ? "grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]"
            : "grid-cols-1 lg:grid-cols-[minmax(20rem,0.95fr)_minmax(0,1.05fr)]"
        }`}
      >
        {showBoard ? (
          <div className="min-w-0 space-y-2">
            <ArenaBoardPanel
              white={whiteOpt}
              black={blackOpt}
              view={view}
              showEval={isReady}
              statusText={statusText}
              statusTone={statusTone}
              controls={controls}
              header={boardHeader}
              onHumanMove={submitHumanMove}
              onHumanResign={resignHuman}
              onHumanDraw={offerDrawHuman}
              pgnEvent={humansOnly ? "Chess Avatar Arena Humans" : "Chess Avatar Arena Playoff"}
              pgnRound={
                isLeague
                  ? league
                    ? String(currentLeagueRound(league) + 1)
                    : undefined
                  : liveMatch && series
                    ? `${liveMatch.id}.${series.index + 1}`
                    : undefined
              }
              pgnTimeControl={pgnTimeControl(cadence)}
              orientation={orientation}
              onFlip={flip}
            />
          </div>
        ) : (
          <div className="space-y-2 min-w-0">
            {!humansOnly && (
              <div className="flex flex-wrap items-center gap-2">
                <div role="radiogroup" aria-label={t.library.platformFilter} className="arena-segmented">
                  {platformButtons.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      role="radio"
                      aria-checked={platformFilter === b.id}
                      data-active={platformFilter === b.id}
                      className="arena-segmented__item"
                      onClick={() => setPlatformFilter(b.id)}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <ArenaPlayoffRosterDeck
              pool={rosterOptions}
              rosterFilter={rosterFilter}
              onRosterFilterChange={setRosterFilter}
              tapPickKey={tapPickKey}
              onTapPickKey={(key) => setTapPickKey((prev) => (prev === key ? null : key))}
              dragOptionKey={dragOptionKey}
              onDragStartOption={setDragOptionKey}
              onDragEnd={() => setDragOptionKey(null)}
              placedKeys={placedKeys}
            />
            <p className="text-xs text-slate-500 px-1">{tp.boardPlaceholder}</p>
          </div>
        )}

        <div className="space-y-3 min-w-0">
          <section className="arena-panel overflow-hidden">
            <button
              type="button"
              className="arena-collapsible-trigger xl:pointer-events-none"
              aria-expanded={bracketOpen}
              aria-controls="playoff-bracket"
              onClick={() => setBracketOpen((v) => !v)}
            >
              {isLeague ? tp.standingsTitle : tp.bracketTitle}
              <span className="xl:hidden">
                {bracketOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>
            <div
              id="playoff-bracket"
              ref={bracketRef}
              className={`border-t border-slate-800 p-3 ${bracketOpen ? "block" : "hidden xl:block"}`}
            >
              <ArenaPlayoffBracket
                state={bracket}
                pool={allOptions}
                activeMatchId={activeMatchId}
                liveMatchId={liveMatchId}
                onSelectMatch={(id) => {
                  if (!busy) setActiveMatchId(id);
                }}
                onDropSeed={handleDropSeed}
                tapPickKey={tapPickKey}
                onTapPickKey={setTapPickKey}
                seedsLocked={seedsLocked}
                showRounds={!isLeague}
              />
              {isLeague && league && (
                <ArenaLeagueTable league={league} pool={allOptions} liveGameId={liveMatchId} />
              )}
              {!isLeague && activeMatch?.status === "ready" && !busy && (
                <Button
                  className="w-full mt-2 h-8 text-xs"
                  disabled={!isReady}
                  onClick={() => void playSelected()}
                  data-testid="playoff-play-selected"
                  data-share-exclude="true"
                >
                  <Play className="h-3.5 w-3.5 mr-1" />
                  {tp.playSelectedMatch}
                </Button>
              )}
              {anyDone && (
                <button
                  type="button"
                  className="arena-icon-btn mt-2 w-full"
                  onClick={() => void shareBracket()}
                  disabled={sharing}
                  data-share-exclude="true"
                  data-testid="playoff-share-image"
                >
                  {sharing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageDown className="h-4 w-4" />
                  )}
                  <span>{tp.shareBracket}</span>
                </button>
              )}
            </div>
          </section>

          {humansOnly ? null : isSupabaseConfigured && userId ? (
            <div className="arena-panel flex items-center justify-between gap-3 px-3 py-2">
              <div className="space-y-0.5 min-w-0">
                <Label htmlFor="playoff-save-cloud" className="text-sm text-slate-200">
                  {tp.saveCloudLabel}
                </Label>
                <p className="text-[11px] text-slate-500 leading-snug">{tp.saveCloudHint}</p>
              </div>
              <Switch
                id="playoff-save-cloud"
                checked={saveCloudGames}
                onCheckedChange={setSaveCloudGames}
                className="shrink-0"
              />
            </div>
          ) : isSupabaseConfigured && !userId ? (
            <p className="text-xs text-slate-500 px-1">{tp.saveCloudNeedLogin}</p>
          ) : null}

          {showBoard && !humansOnly && (
            <BotEngineSelector
              chessAvatarReady={isChessAvatarReady}
              chessAvatarPlayReady={isChessAvatarPlayReady}
              chessAvatarNnueLoading={isChessAvatarNnueLoading}
              chessAvatarSearchStats={chessAvatarSearchStats}
              stockfishReady={isStockfishReady}
              lastBotEngineUsed={lastBotEngineUsed}
              botElo={Math.max(whiteOpt?.config.elo ?? 0, blackOpt?.config.elo ?? 0) || undefined}
              botDifficulty={
                Math.max(whiteOpt?.config.difficulty ?? 0, blackOpt?.config.difficulty ?? 0) ||
                undefined
              }
              compact
            />
          )}
        </div>
      </div>
    </div>
  );
}
