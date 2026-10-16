"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  CopyMinus,
  Globe,
  Keyboard,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  StepForward,
  Swords,
} from "lucide-react";
import { toast } from "sonner";
import BotEngineSelector from "@/components/BotEngineSelector";
import ArenaBoardPanel, { type ArenaStatusTone } from "@/components/arena/ArenaBoardPanel";
import ArenaHeadToHead from "@/components/arena/ArenaHeadToHead";
import ArenaMatchupBanner from "@/components/arena/spectator/ArenaMatchupBanner";
import ArenaProfilePicker, {
  type ArenaPickSide,
} from "@/components/arena/spectator/ArenaProfilePicker";
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
import { saveArenaMatchToCloud } from "@/lib/arena-cloud-save";
import type { ArenaMatchSettings, ArenaPlyResult } from "@/lib/arena-match-runner";
import { getCadenceDepthCap, type ArenaSpeed } from "@/lib/arena-move-timing";
import { pgnTimeControl } from "@/lib/arena-pgn";
import {
  dedupeByIdentity,
  filterByPlatform,
  pickRandomPair,
  type ProfilePlatformFilter,
} from "@/lib/arena-profile-pool";
import {
  ARENA_SERIES_LENGTHS,
  createArenaSeries,
  isArenaSeriesLength,
  isSeriesOver,
  recordSeriesGame,
  seriesGameAWhite,
  seriesScore,
  seriesWinner,
  type ArenaSeriesLength,
  type ArenaSeriesState,
} from "@/lib/arena-series";
import { cadenceFromPreset, resolveArenaTimePreset } from "@/lib/arena-time-controls";
import { useLanguage } from "@/lib/language-context";
import { isSupabaseConfigured } from "@/lib/supabase";

const ARENA_STORAGE_PLATFORM = "chess-arena.platform";
const ARENA_STORAGE_DEDUPE = "chess-arena.dedupe";
const ARENA_STORAGE_SAVE_CLOUD = "chess-arena.saveCloud";
const ARENA_STORAGE_MATCHUP = "chess-arena.matchup";
const ARENA_STORAGE_SERIES = "chess-arena.seriesLength";
/** Pause between two games of a match so the result stays readable. */
const SERIES_GAP_MS = 2500;

function formatPoints(points: number): string {
  const whole = Math.floor(points);
  if (points === whole) return String(whole);
  return whole === 0 ? "½" : `${whole}½`;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export default function ArenaSpectator({
  pool,
  engine,
  forcedOpeningId = null,
  timePresetId,
  speed,
  onBusyChange,
}: {
  pool: ArenaProfilePool;
  engine: ArenaEngine;
  forcedOpeningId?: string | null;
  timePresetId: string;
  speed: ArenaSpeed;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { t, lang } = useLanguage();
  const ap = t.arenaPage;
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
  const match = useArenaMatch({ getBestMove, getPositionEvaluation, stopThinking });
  const { view, run, pause, reset, isFinished, submitHumanMove, resignHuman, offerDrawHuman } =
    match;

  const [platformFilter, setPlatformFilter] = useState<ProfilePlatformFilter>("all");
  const [dedupeIdentity, setDedupeIdentity] = useState(true);
  const [saveCloudGames, setSaveCloudGames] = useState(false);
  const [whiteKey, setWhiteKey] = useState("");
  const [blackKey, setBlackKey] = useState("");
  const [pickSide, setPickSide] = useState<ArenaPickSide>("white");
  // Mobile: board first — setup starts collapsed under `md`.
  const [setupOpen, setSetupOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [arenaDepth, setArenaDepth] = useState(14);
  const [maxPlies, setMaxPlies] = useState(120);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [hydrated, setHydrated] = useState(false);
  const [seriesLength, setSeriesLength] = useState<ArenaSeriesLength>(1);
  const [series, setSeries] = useState<ArenaSeriesState | null>(null);
  /** Avatar A (picked as White) has White in the game on the board. */
  const [boardAWhite, setBoardAWhite] = useState(true);
  const [betweenGames, setBetweenGames] = useState(false);
  const chainRef = useRef({ cancelled: false });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const timePreset = useMemo(() => resolveArenaTimePreset(timePresetId), [timePresetId]);
  const cadence = useMemo(() => cadenceFromPreset(timePreset), [timePreset]);
  const effectiveDepthCap = useMemo(
    () => getCadenceDepthCap(cadence, arenaDepth),
    [cadence, arenaDepth]
  );

  useEffect(() => {
    try {
      const p = localStorage.getItem(ARENA_STORAGE_PLATFORM);
      if (p === "lichess" || p === "chesscom" || p === "all" || p === "human") setPlatformFilter(p);
      const d = localStorage.getItem(ARENA_STORAGE_DEDUPE);
      if (d === "0") setDedupeIdentity(false);
      if (localStorage.getItem(ARENA_STORAGE_SAVE_CLOUD) === "1") setSaveCloudGames(true);
    } catch {
      /* ignore */
    }
    const matchup = readJson<{ white?: string; black?: string }>(ARENA_STORAGE_MATCHUP);
    if (typeof matchup?.white === "string") setWhiteKey(matchup.white);
    if (typeof matchup?.black === "string") setBlackKey(matchup.black);
    // Deep link: /arena?white=<key>&black=<key>
    try {
      const q = new URLSearchParams(window.location.search);
      const w = q.get("white");
      const b = q.get("black");
      if (w) setWhiteKey(w);
      if (b) setBlackKey(b);
    } catch {
      /* ignore */
    }
    const storedLength = readJson<number>(ARENA_STORAGE_SERIES);
    if (isArenaSeriesLength(storedLength)) setSeriesLength(storedLength);
    try {
      if (window.matchMedia("(min-width: 768px)").matches) setSetupOpen(true);
    } catch {
      setSetupOpen(true);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStorage(ARENA_STORAGE_PLATFORM, platformFilter);
    writeStorage(ARENA_STORAGE_DEDUPE, dedupeIdentity ? "1" : "0");
    writeStorage(ARENA_STORAGE_SAVE_CLOUD, saveCloudGames ? "1" : "0");
    writeStorage(ARENA_STORAGE_SERIES, String(seriesLength));
    if (whiteKey && blackKey) {
      writeStorage(ARENA_STORAGE_MATCHUP, JSON.stringify({ white: whiteKey, black: blackKey }));
    }
  }, [hydrated, platformFilter, dedupeIdentity, saveCloudGames, seriesLength, whiteKey, blackKey]);

  const poolOptions = useMemo(() => {
    let rows = filterByPlatform(pool.options, platformFilter);
    if (dedupeIdentity) rows = dedupeByIdentity(rows);
    return rows;
  }, [pool.options, platformFilter, dedupeIdentity]);

  useEffect(() => {
    if (!hydrated || poolOptions.length === 0) return;
    const nextW = poolOptions.some((o) => o.key === whiteKey)
      ? whiteKey
      : poolOptions[0].key;
    let nextB = poolOptions.some((o) => o.key === blackKey)
      ? blackKey
      : (poolOptions[1]?.key ?? poolOptions[0].key);
    if (nextB === nextW) {
      nextB = poolOptions.find((o) => o.key !== nextW)?.key ?? nextW;
    }
    if (nextW !== whiteKey) setWhiteKey(nextW);
    if (nextB !== blackKey) setBlackKey(nextB);
  }, [hydrated, poolOptions, whiteKey, blackKey]);

  const whiteOption = poolOptions.find((o) => o.key === whiteKey);
  const blackOption = poolOptions.find((o) => o.key === blackKey);
  const sameSide = whiteKey === blackKey;
  const awaitingHuman = view.awaitingHuman != null;
  const busy = view.running || view.thinking || awaitingHuman || betweenGames;
  const boardWhite = boardAWhite ? whiteOption : blackOption;
  const boardBlack = boardAWhite ? blackOption : whiteOption;

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  // Deep-link sync once the pairing is stable (not while a game is running).
  useEffect(() => {
    if (!hydrated || busy || !whiteKey || !blackKey) return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("white") === whiteKey && url.searchParams.get("black") === blackKey) {
        return;
      }
      url.searchParams.set("white", whiteKey);
      url.searchParams.set("black", blackKey);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* ignore */
    }
  }, [hydrated, busy, whiteKey, blackKey]);

  const resetAll = useCallback(() => {
    chainRef.current.cancelled = true;
    setBetweenGames(false);
    setSeries(null);
    setBoardAWhite(true);
    reset();
  }, [reset]);

  // A different pairing or game setup makes the current game meaningless.
  useEffect(() => {
    resetAll();
  }, [whiteKey, blackKey, timePresetId, forcedOpeningId, resetAll]);

  const buildSettings = useCallback(
    (aWhite: boolean): ArenaMatchSettings | null => {
      if (!whiteOption || !blackOption || sameSide) return null;
      const w = aWhite ? whiteOption : blackOption;
      const b = aWhite ? blackOption : whiteOption;
      return {
        white: w.config,
        black: b.config,
        depthCap: effectiveDepthCap,
        cadence,
        forcedOpeningId,
        speed,
        maxPlies,
        lang,
        arenaStyle: true,
        humanSides: { w: Boolean(w.human), b: Boolean(b.human) },
      };
    },
    [whiteOption, blackOption, sameSide, effectiveDepthCap, cadence, forcedOpeningId, speed, maxPlies, lang]
  );
  const settings = useMemo(() => buildSettings(true), [buildSettings]);

  const saveIfNeeded = useCallback(
    async (res: ArenaPlyResult | null, played: ArenaMatchSettings, startedAt: number) => {
      if (!res || res.status !== "finished" || !res.outcome) return;
      if (!saveCloudGames || !userId) return;
      if (res.history.length === 0) return;
      // Cloud history is for avatar games; local human players have no cloud identity.
      if (played.humanSides?.w || played.humanSides?.b) return;
      try {
        await saveArenaMatchToCloud({
          whiteConfig: played.white,
          blackConfig: played.black,
          uciHist: res.history,
          outcome: res.outcome,
          durationSeconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
        });
        toast.success(ap.cloudSavedToast);
      } catch (e) {
        console.error(e);
        toast.error(ap.cloudSaveErrorToast);
      }
    },
    [saveCloudGames, userId, ap.cloudSavedToast, ap.cloudSaveErrorToast]
  );

  const seriesDone = series != null && isSeriesOver(series);

  const launch = useCallback(
    async (mode: "auto" | "step") => {
      if (!settings || !isReady || busy) return;
      if (mode === "auto") setSetupOpen(false);
      const chain = { cancelled: false };
      chainRef.current = chain;

      let current = series;
      let fresh = isFinished;
      if (!current || (isFinished && isSeriesOver(current))) {
        current = createArenaSeries(seriesLength);
        setSeries(current);
      }

      for (;;) {
        const aWhite = seriesGameAWhite(current.games.length);
        const played = buildSettings(aWhite);
        if (!played) return;
        setBoardAWhite(aWhite);
        const startedAt = Date.now();
        const res = await run(played, mode, { fresh, clockPreset: timePreset });
        if (chain.cancelled || !mountedRef.current) return;
        if (!res || res.status !== "finished" || !res.outcome) return;

        void saveIfNeeded(res, played, startedAt);
        const playedWhite = aWhite ? whiteOption : blackOption;
        const playedBlack = aWhite ? blackOption : whiteOption;
        if (playedWhite && playedBlack) {
          recordArenaRatedGame(arenaEntrant(playedWhite), arenaEntrant(playedBlack), res.outcome.winner);
        }
        current = recordSeriesGame(current, res.outcome);
        setSeries(current);
        if (mode !== "auto" || isSeriesOver(current)) return;

        setBetweenGames(true);
        await new Promise((r) => setTimeout(r, SERIES_GAP_MS));
        if (chain.cancelled || !mountedRef.current) return;
        setBetweenGames(false);
        fresh = true;
      }
    },
    [
      settings,
      isReady,
      busy,
      series,
      isFinished,
      seriesLength,
      buildSettings,
      run,
      timePreset,
      saveIfNeeded,
      whiteOption,
      blackOption,
    ]
  );

  const handlePause = useCallback(() => {
    if (betweenGames) {
      chainRef.current.cancelled = true;
      setBetweenGames(false);
      return;
    }
    pause();
  }, [betweenGames, pause]);

  const handlePick = (key: string) => {
    const other = pickSide === "white" ? blackKey : whiteKey;
    if (key === other) {
      setWhiteKey(blackKey);
      setBlackKey(whiteKey);
      return;
    }
    if (pickSide === "white") setWhiteKey(key);
    else setBlackKey(key);
  };

  const handleSwap = () => {
    setWhiteKey(blackKey);
    setBlackKey(whiteKey);
  };

  const handleRandom = () => {
    const pair = pickRandomPair(poolOptions.filter((o) => !o.human));
    if (!pair) return;
    setWhiteKey(pair[0]);
    setBlackKey(pair[1]);
  };

  const flip = () => setOrientation((o) => (o === "white" ? "black" : "white"));

  useArenaShortcuts({
    onToggle: () =>
      view.running || awaitingHuman || betweenGames ? handlePause() : void launch("auto"),
    onStep: () => {
      if (!view.running && !awaitingHuman) void launch("step");
    },
    onFlip: flip,
  });

  if (pool.loading && pool.options.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
        <span className="text-sm">{ap.loadingProfiles}</span>
        <span className="text-xs text-slate-500 max-w-sm text-center">{ap.featuredLoading}</span>
      </div>
    );
  }

  if (pool.options.length < 2) {
    return (
      <div className="arena-panel border-amber-500/30 py-6 px-4 text-center text-slate-300 text-sm space-y-3">
        <p>{ap.needTwoProfiles}</p>
        <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">{ap.emptyHint}</p>
        <Button variant="outline" size="sm" onClick={() => void pool.reload()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          {ap.refreshList}
        </Button>
      </div>
    );
  }

  let statusText: string = ap.statusIdle;
  let statusTone: ArenaStatusTone = "idle";
  if (!isReady) {
    statusText = ap.needEngine;
    statusTone = "warn";
  } else if (view.error) {
    statusText = ap.engineError;
    statusTone = "warn";
  } else if (sameSide) {
    statusText = ap.pickBoth;
    statusTone = "warn";
  } else if (betweenGames) {
    statusText = ap.seriesNextSoon;
    statusTone = "live";
  } else if (view.outcome) {
    statusText = view.outcome.resultMessage;
    statusTone = "result";
  } else if (view.awaitingHuman) {
    const mover = view.awaitingHuman === "w" ? boardWhite : boardBlack;
    statusText = ap.statusHumanTurn.replace("{name}", mover?.config.name || "");
    statusTone = "live";
  } else if (busy) {
    statusText = ap.statusThinking;
    statusTone = "live";
  } else if (view.history.length > 0) {
    statusText = ap.statusPaused;
  }

  const canPlay = Boolean(settings) && isReady;

  const seriesContinues = series != null && !seriesDone && series.length > 1;
  const startLabel = isFinished
    ? seriesContinues
      ? ap.seriesNextGame
      : ap.newGame
    : view.history.length > 0
      ? ap.resume
      : ap.start;

  const controls = view.running || awaitingHuman || betweenGames ? (
    <Button size="sm" variant="destructive" onClick={handlePause} data-testid="arena-pause">
      <Pause className="h-4 w-4 mr-1" />
      {ap.pause}
    </Button>
  ) : (
    <>
      <Button
        size="sm"
        className="bg-green-600 hover:bg-green-500"
        disabled={!canPlay || view.thinking}
        onClick={() => void launch("auto")}
        data-testid="arena-start"
      >
        <Play className="h-4 w-4 mr-1" />
        {startLabel}
      </Button>
      <Button
        size="sm"
        className="bg-slate-700 hover:bg-slate-600"
        disabled={!canPlay || view.thinking || (isFinished && !seriesContinues)}
        onClick={() => void launch("step")}
        data-testid="arena-step"
      >
        <StepForward className="h-4 w-4 mr-1" />
        {ap.step}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="border-slate-600"
        disabled={(view.history.length === 0 && !series?.games.length) || view.thinking}
        onClick={resetAll}
        data-testid="arena-reset"
      >
        <RotateCcw className="h-4 w-4 mr-1" />
        {ap.reset}
      </Button>
    </>
  );

  const boardGameNumber = series
    ? Math.max(1, Math.min(series.games.length + (isFinished ? 0 : 1), series.length))
    : 1;
  const nameA = whiteOption?.config.name || "A";
  const nameB = blackOption?.config.name || "B";
  let seriesHeader: ReactNode = null;
  if (series && series.length > 1) {
    const score = seriesScore(series);
    const winner = seriesWinner(series);
    seriesHeader = (
      <div className="arena-series" data-testid="arena-series">
        <span className="font-semibold text-cyan-300">
          {winner
            ? winner === "draw"
              ? ap.seriesDrawn
              : ap.seriesWon.replace("{name}", winner === "a" ? nameA : nameB)
            : ap.seriesGameLabel
                .replace("{n}", String(boardGameNumber))
                .replace("{total}", String(series.length))}
        </span>
        <span className="arena-series__score" aria-label={ap.seriesScoreLabel}>
          <span className="truncate text-cyan-300">{nameA}</span>
          <strong className="tabular-nums text-slate-100">
            {formatPoints(score.a)} – {formatPoints(score.b)}
          </strong>
          <span className="truncate text-amber-300">{nameB}</span>
        </span>
        <span className="flex gap-1" aria-hidden>
          {Array.from({ length: series.length }, (_, i) => {
            const g = series.games[i];
            return (
              <span
                key={i}
                className="arena-series__pip"
                data-result={g ? g.winner : i === series.games.length && !seriesDone ? "live" : "pending"}
                title={g ? `${i + 1}. ${g.pgnResult}` : undefined}
              />
            );
          })}
        </span>
      </div>
    );
  }

  const platformButtons: { id: ProfilePlatformFilter; label: string }[] = [
    { id: "all", label: t.library.platformAll },
    { id: "lichess", label: t.library.platformLichess },
    { id: "chesscom", label: t.library.platformChesscom },
    { id: "human", label: ap.platformHumanShort },
  ];

  return (
    <div className="grid gap-4 items-start lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
      <div className="lg:sticky lg:top-4 min-w-0">
        <ArenaBoardPanel
          white={boardWhite}
          black={boardBlack}
          view={view}
          showEval={isReady}
          statusText={statusText}
          statusTone={statusTone}
          controls={controls}
          header={seriesHeader}
          pgnEvent="Chess Avatar Arena"
          pgnRound={series && series.length > 1 ? String(boardGameNumber) : undefined}
          pgnTimeControl={pgnTimeControl(cadence)}
          orientation={orientation}
          onFlip={flip}
          onHumanMove={submitHumanMove}
          onHumanResign={resignHuman}
          onHumanDraw={offerDrawHuman}
        />
      </div>

      <aside className="space-y-3 min-w-0">
        <ArenaMatchupBanner
          whiteOption={whiteOption}
          blackOption={blackOption}
          onSwap={handleSwap}
          onRandom={handleRandom}
          disabled={busy}
        />
        <ArenaHeadToHead a={whiteOption} b={blackOption} />

        <section className="arena-panel">
          <button
            type="button"
            className="arena-collapsible-trigger"
            aria-expanded={setupOpen}
            aria-controls="arena-setup"
            onClick={() => setSetupOpen((v) => !v)}
          >
            {ap.chooseAvatars}
            {setupOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {setupOpen && (
            <div id="arena-setup" className="space-y-3 border-t border-slate-800 px-3 pb-3 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="arena-setting__label">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  {t.library.platformFilter}
                </span>
                <div role="radiogroup" aria-label={t.library.platformFilter} className="arena-segmented">
                  {platformButtons.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      role="radio"
                      aria-checked={platformFilter === b.id}
                      data-active={platformFilter === b.id}
                      className="arena-segmented__item"
                      disabled={busy}
                      onClick={() => setPlatformFilter(b.id)}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="arena-icon-btn ml-auto"
                  onClick={() => void pool.reload()}
                  disabled={pool.loading}
                  title={ap.refreshList}
                  aria-label={ap.refreshList}
                >
                  <RefreshCw className={`h-4 w-4 ${pool.loading ? "animate-spin" : ""}`} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label
                  htmlFor="arena-dedupe"
                  className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer"
                  title={t.library.dedupeHint}
                >
                  <CopyMinus className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  {t.library.dedupeTitle}
                </Label>
                <Switch
                  id="arena-dedupe"
                  checked={dedupeIdentity}
                  onCheckedChange={setDedupeIdentity}
                  disabled={busy}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="arena-setting__label" id="arena-series-label">
                  <Swords className="h-3.5 w-3.5 text-slate-400" />
                  {ap.seriesLengthLabel}
                </span>
                <div role="radiogroup" aria-labelledby="arena-series-label" className="arena-segmented">
                  {ARENA_SERIES_LENGTHS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={seriesLength === n}
                      data-active={seriesLength === n}
                      className="arena-segmented__item"
                      disabled={busy || seriesContinues}
                      onClick={() => setSeriesLength(n)}
                      data-testid={`arena-series-${n}`}
                    >
                      {n === 1 ? ap.seriesSingle : n}
                    </button>
                  ))}
                </div>
              </div>
              <ArenaProfilePicker
                pool={poolOptions}
                whiteKey={whiteKey}
                blackKey={blackKey}
                side={pickSide}
                onSideChange={setPickSide}
                onPick={handlePick}
                disabled={busy}
              />
            </div>
          )}
        </section>

        <section className="arena-panel">
          <button
            type="button"
            className="arena-collapsible-trigger"
            aria-expanded={advancedOpen}
            aria-controls="arena-advanced"
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            {ap.advancedSettings}
            {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {advancedOpen && (
            <div id="arena-advanced" className="space-y-4 border-t border-slate-800 px-3 pb-3 pt-3">
              <div className="space-y-1">
                <Label htmlFor="arena-depth" className="text-xs text-slate-300 flex justify-between">
                  <span>{ap.depthLabel}</span>
                  <span className="font-mono text-slate-400">
                    {arenaDepth}
                    {effectiveDepthCap < arenaDepth ? ` → ${effectiveDepthCap}` : ""}
                  </span>
                </Label>
                <input
                  id="arena-depth"
                  type="range"
                  min={6}
                  max={18}
                  value={arenaDepth}
                  disabled={busy}
                  onChange={(e) => setArenaDepth(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <p className="text-[11px] text-slate-500">{ap.depthHint}</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="arena-max-plies" className="text-xs text-slate-300 flex justify-between">
                  <span>{ap.maxPliesLabel}</span>
                  <span className="font-mono text-slate-400">{maxPlies}</span>
                </Label>
                <input
                  id="arena-max-plies"
                  type="range"
                  min={20}
                  max={250}
                  step={10}
                  value={maxPlies}
                  onChange={(e) => setMaxPlies(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
              <BotEngineSelector
                chessAvatarReady={isChessAvatarReady}
                chessAvatarPlayReady={isChessAvatarPlayReady}
                chessAvatarNnueLoading={isChessAvatarNnueLoading}
                chessAvatarSearchStats={chessAvatarSearchStats}
                stockfishReady={isStockfishReady}
                lastBotEngineUsed={lastBotEngineUsed}
                botElo={Math.max(whiteOption?.config.elo ?? 0, blackOption?.config.elo ?? 0) || undefined}
                botDifficulty={
                  Math.max(whiteOption?.config.difficulty ?? 0, blackOption?.config.difficulty ?? 0) ||
                  undefined
                }
                compact
              />
            </div>
          )}
        </section>

        {isSupabaseConfigured && userId ? (
          <div className="arena-panel flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="space-y-0.5 min-w-0">
              <Label htmlFor="arena-save-cloud" className="text-sm text-slate-200">
                {ap.saveCloudLabel}
              </Label>
              <p className="text-[11px] text-slate-500 leading-snug">{ap.saveCloudHint}</p>
            </div>
            <Switch
              id="arena-save-cloud"
              checked={saveCloudGames}
              onCheckedChange={setSaveCloudGames}
              className="shrink-0"
            />
          </div>
        ) : isSupabaseConfigured && !userId ? (
          <p className="text-xs text-slate-500 px-1">{ap.saveCloudNeedLogin}</p>
        ) : null}

        <p className="flex items-center gap-1.5 text-[11px] text-slate-500 px-1">
          <Keyboard className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline">{ap.shortcutsHint}</span>
          <span className="md:hidden">{ap.shortcutsHintMobile}</span>
        </p>
      </aside>
    </div>
  );
}
