"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import SimpleChessboard from "@/components/SimpleChessboard";
import ArenaBotClockBar from "@/components/ArenaBotClockBar";
import ArenaPlayoffBracket from "@/components/ArenaPlayoffBracket";
import ArenaPlayoffRosterDeck from "@/components/ArenaPlayoffRosterDeck";
import EvaluationBar from "@/components/EvaluationBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useStockfish } from "@/hooks/useStockfish";
import { usePremium } from "@/hooks/usePremium";
import { useLanguage } from "@/lib/language-context";
import {
  playoffOutcomeForSave,
  saveArenaMatchToCloud,
} from "@/lib/arena-cloud-save";
import { isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import {
  classifyArenaOutcome,
  replayUci,
  stmEvalToWhitePov,
} from "@/lib/arena-chess";
import { prepareArenaEngineConfig } from "@/lib/arena-forced-opening";
import {
  getArenaThinkBudgetMs,
  getCadenceDepthCap,
  getSingleLegalMoveUci,
  isArenaTheoreticalOpening,
  sleepArenaThinkRemainder,
} from "@/lib/arena-move-timing";
import {
  cadenceFromPreset,
  resolveArenaTimePreset,
} from "@/lib/arena-time-controls";
import type { PlayoffBracketSize } from "@/lib/arena-playoff-bracket";
import {
  createPlayoffBracket,
  getNextReadyMatch,
  getOptionByKey,
  recordMatchResult,
  resolveMatchSideKeys,
  setSeed,
} from "@/lib/arena-playoff-bracket";
import type { PlayoffBracketState } from "@/lib/arena-playoff-bracket";
import {
  commitPlayoffClockTurn,
  createPlayoffClock,
  getPlayoffClockDisplay,
  switchPlayoffClockTurn,
  tickPlayoffClock,
} from "@/lib/arena-playoff-clock";
import type { PlayoffClockState } from "@/lib/arena-playoff-clock";
import {
  dedupeByIdentity,
  filterByPlatform,
  loadArenaProfilePool,
  type ProfilePlatformFilter,
} from "@/lib/arena-profile-pool";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Swords,
} from "lucide-react";

const PLAYOFF_DEPTH_CAP = 14;
const PLAYOFF_MAX_PLIES = 200;
const ARENA_PLAYOFF_SAVE_CLOUD = "chess-arena.playoff.saveCloud";

/** En Playoff Arène uniquement : toute nulle est remportée par les noirs. */
function playoffDrawWinnerKey(blackKey: string): string {
  return blackKey;
}

export default function ArenaPlayoffMode({
  forcedOpeningId = null,
  timePresetId,
}: {
  forcedOpeningId?: string | null;
  timePresetId: string;
}) {
  const { t, lang } = useLanguage();
  const { userId } = usePremium();
  const { isReady, getBestMove, stopThinking, getPositionEvaluation } =
    useStockfish();

  const [rawOptions, setRawOptions] = useState<
    import("@/lib/arena-types").ProfileOption[]
  >([]);
  const [listLoading, setListLoading] = useState(true);
  const [platformFilter] = useState<ProfilePlatformFilter>("all");
  const [bracketSize, setBracketSize] = useState<PlayoffBracketSize>(8);
  const [bracket, setBracket] = useState<PlayoffBracketState>(() =>
    createPlayoffBracket(8)
  );
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [dragOptionKey, setDragOptionKey] = useState<string | null>(null);
  const [tapPickKey, setTapPickKey] = useState<string | null>(null);
  const [rosterFilter, setRosterFilter] = useState("");
  const [setupOpen, setSetupOpen] = useState(true);
  const [fen, setFen] = useState(() => new Chess().fen());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(
    null
  );
  const [moveCount, setMoveCount] = useState(0);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [clock, setClock] = useState<PlayoffClockState | null>(null);
  const [matchRunning, setMatchRunning] = useState(false);
  const [tournamentRunning, setTournamentRunning] = useState(false);
  const [barEval, setBarEval] = useState<number | null>(null);
  const [saveCloudGames, setSaveCloudGames] = useState(false);

  const timePreset = useMemo(
    () => resolveArenaTimePreset(timePresetId),
    [timePresetId]
  );
  const cadence = useMemo(() => cadenceFromPreset(timePreset), [timePreset]);
  const playoffDepthCap = useMemo(
    () => getCadenceDepthCap(cadence, PLAYOFF_DEPTH_CAP),
    [cadence]
  );
  const presetLabels = t.playOnline.presets as Record<string, string>;
  const timeControlLabel = presetLabels[timePreset.id] ?? timePreset.id;

  const historyRef = useRef<string[]>([]);
  const runningRef = useRef(false);
  const evalSeqRef = useRef(0);

  const loadOptions = useCallback(async () => {
    setListLoading(true);
    try {
      const merged = await loadArenaProfilePool({
        savedProfiles: t.arenaPage.savedProfiles,
        recentProfiles: t.arenaPage.recentProfiles,
        cloudLibrary: t.arenaPage.cloudLibrary,
        featuredChampions: t.arenaPage.featuredChampions,
      });
      setRawOptions(merged);
    } finally {
      setListLoading(false);
    }
  }, [
    t.arenaPage.savedProfiles,
    t.arenaPage.recentProfiles,
    t.arenaPage.cloudLibrary,
    t.arenaPage.featuredChampions,
  ]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const sc = localStorage.getItem(ARENA_PLAYOFF_SAVE_CLOUD);
      if (sc === "1") setSaveCloudGames(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        ARENA_PLAYOFF_SAVE_CLOUD,
        saveCloudGames ? "1" : "0"
      );
    } catch {
      /* ignore */
    }
  }, [saveCloudGames]);

  const poolOptions = useMemo(() => {
    let rows = filterByPlatform(rawOptions, platformFilter);
    rows = dedupeByIdentity(rows);
    return rows;
  }, [rawOptions, platformFilter]);

  useEffect(() => {
    setBracket(createPlayoffBracket(bracketSize));
    setActiveMatchId(null);
    runningRef.current = false;
    setMatchRunning(false);
    setTournamentRunning(false);
    historyRef.current = [];
    setMoveCount(0);
    setLastMove(null);
    setFen(new Chess().fen());
    setStatusNote(null);
    setClock(null);
  }, [bracketSize]);

  const resetBoard = useCallback(() => {
    runningRef.current = false;
    setMatchRunning(false);
    stopThinking();
    historyRef.current = [];
    setMoveCount(0);
    setLastMove(null);
    setFen(new Chess().fen());
    setStatusNote(null);
    setClock(null);
  }, [stopThinking]);

  useEffect(() => {
    if (!isReady || !clock || !matchRunning) return;
    const seq = ++evalSeqRef.current;
    let cancelled = false;
    void (async () => {
      try {
        const raw = await getPositionEvaluation(fen, playoffDepthCap);
        if (cancelled || seq !== evalSeqRef.current) return;
        setBarEval(stmEvalToWhitePov(fen, raw));
      } catch {
        if (!cancelled && seq === evalSeqRef.current) setBarEval(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fen, isReady, getPositionEvaluation, clock, matchRunning, playoffDepthCap]);

  const activeMatch = useMemo(
    () => bracket.matches.find((m) => m.id === activeMatchId) ?? null,
    [bracket, activeMatchId]
  );

  const activeSides = useMemo(() => {
    if (!activeMatch) return { white: undefined, black: undefined };
    const { keyA, keyB } = resolveMatchSideKeys(activeMatch, bracket);
    return {
      white: getOptionByKey(poolOptions, keyA),
      black: getOptionByKey(poolOptions, keyB),
    };
  }, [activeMatch, bracket, poolOptions]);

  const filledSeeds = bracket.seeds.filter(Boolean).length;
  const rosterComplete = filledSeeds >= bracketSize;
  const showBoard =
    rosterComplete && (matchRunning || tournamentRunning);
  const placedKeys = useMemo(
    () => new Set(bracket.seeds.filter(Boolean) as string[]),
    [bracket.seeds]
  );
  const canStartTournament =
    filledSeeds >= bracketSize && !tournamentRunning && !matchRunning;

  const handleTapPickKey = useCallback((key: string) => {
    setTapPickKey((prev) => (prev === key ? null : key));
  }, []);

  const handleDropSeed = useCallback((slot: number, key: string | null) => {
    setBracket((prev) => setSeed(prev, slot, key));
    setTapPickKey(null);
  }, []);

  const handleAutoSeed = useCallback(() => {
    const keys = poolOptions.slice(0, bracketSize).map((o) => o.key);
    let next = createPlayoffBracket(bracketSize);
    keys.forEach((k, i) => {
      next = setSeed(next, i, k);
    });
    setBracket(next);
  }, [poolOptions, bracketSize]);

  const runSingleMatch = useCallback(
    async (
      matchId: string,
      whiteOpt: NonNullable<typeof activeSides.white>,
      blackOpt: NonNullable<typeof activeSides.black>
    ): Promise<{ winnerKey: string | null; note: string }> => {
      const whiteConfig = whiteOpt.config;
      const blackConfig = blackOpt.config;
      const whiteKey = whiteOpt.key;
      const blackKey = blackOpt.key;

      historyRef.current = [];
      let liveClock = createPlayoffClock(timePreset);
      setClock(liveClock);
      setFen(new Chess().fen());
      setLastMove(null);
      setMoveCount(0);
      setStatusNote(t.arenaPlayoff.matchLive);
      const matchStartedAt = Date.now();

      const complete = async (
        winnerKey: string | null,
        note: string,
        uciHist: string[],
        maxMovesReached = false
      ): Promise<{ winnerKey: string | null; note: string }> => {
        setStatusNote(note);
        if (winnerKey && saveCloudGames && userId && uciHist.length > 0) {
          const game = replayUci(uciHist);
          const base = classifyArenaOutcome(game, maxMovesReached, lang);
          const outcome = playoffOutcomeForSave(
            winnerKey,
            whiteKey,
            blackKey,
            note,
            base
          );
          const durationSeconds = Math.max(
            0,
            Math.round((Date.now() - matchStartedAt) / 1000)
          );
          try {
            await saveArenaMatchToCloud({
              whiteConfig,
              blackConfig,
              uciHist,
              outcome,
              durationSeconds,
              event: "Chess Avatar Arena Playoff",
              round: matchId,
            });
            toast.success(t.arenaPage.cloudSavedToast);
          } catch (e) {
            console.error(e);
            toast.error(t.arenaPage.cloudSaveErrorToast);
          }
        }
        return { winnerKey, note };
      };

      while (runningRef.current) {
        const hist = historyRef.current;
        const replay = replayUci(hist);
        const stm = replay.turn();

        const tick = tickPlayoffClock(liveClock, stm);
        if (tick.kind === "timeout") {
          liveClock = tick.clock;
          setClock(liveClock);
          const outcome = classifyArenaOutcome(
            replay,
            false,
            lang,
            tick.winner
          );
          const winnerKey =
            tick.winner === "white" ? whiteKey : blackKey;
          return complete(winnerKey, outcome.resultMessage, hist);
        }
        liveClock = tick.clock;
        setClock(liveClock);

        const clockView = getPlayoffClockDisplay(liveClock, stm);
        const sideClockMs =
          stm === "w" ? clockView.whiteMs : clockView.blackMs;

        const base = stm === "w" ? whiteConfig : blackConfig;
        const cfg = prepareArenaEngineConfig(base, {
          depthCap: playoffDepthCap,
          ply: hist.length,
          game: replay,
          forcedOpeningId,
          cadence,
          historyUci: hist,
          sideClockMs,
        });
        const thinkBudgetMs = getArenaThinkBudgetMs(
          isArenaTheoreticalOpening(cfg, hist.length, hist),
          sideClockMs
        );
        const singleUci = getSingleLegalMoveUci(replay);
        let uci: string | null;

        if (singleUci) {
          uci = singleUci;
        } else {
          const thinkStartedAt = Date.now();
          uci = await new Promise<string | null>((resolve) => {
            getBestMove(replay.fen(), cfg, (move) => resolve(move), {
              moveHistoryUci: hist,
              playerColor: stm === "w" ? "black" : "white",
            });
          });
          await sleepArenaThinkRemainder(thinkStartedAt, thinkBudgetMs);
        }

        if (!runningRef.current) break;

        if (!uci || uci.length < 4) {
          return complete(
            stm === "w" ? blackKey : whiteKey,
            t.arenaPage.gameOver,
            hist
          );
        }

        liveClock = commitPlayoffClockTurn(liveClock, stm);
        liveClock = switchPlayoffClockTurn(liveClock);
        setClock(liveClock);

        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion =
          uci.length > 4 ? (uci[4] as "q" | "r" | "b" | "n") : undefined;
        const next = replayUci(hist);
        const ok = next.move(
          promotion ? { from, to, promotion } : { from, to }
        );
        if (!ok) {
          return complete(
            stm === "w" ? blackKey : whiteKey,
            t.arenaPage.gameOver,
            hist
          );
        }

        historyRef.current = [...hist, uci];
        setFen(next.fen());
        setLastMove({ from, to });
        setMoveCount(historyRef.current.length);

        if (next.isGameOver()) {
          const outcome = classifyArenaOutcome(next, false, lang);
          let winnerKey: string | null = null;
          let note: string;
          if (outcome.winner === "white") {
            winnerKey = whiteKey;
            note = outcome.resultMessage;
          } else if (outcome.winner === "black") {
            winnerKey = blackKey;
            note = outcome.resultMessage;
          } else {
            winnerKey = playoffDrawWinnerKey(blackKey);
            note = t.arenaPlayoff.drawBlackWins;
          }
          return complete(winnerKey, note, historyRef.current);
        }

        if (historyRef.current.length >= PLAYOFF_MAX_PLIES) {
          const winnerKey = playoffDrawWinnerKey(blackKey);
          const note = t.arenaPlayoff.moveLimitBlackWins;
          return complete(winnerKey, note, historyRef.current, true);
        }
      }

      return complete(null, t.arenaPlayoff.matchPaused, historyRef.current);
    },
    [
      getBestMove,
      lang,
      saveCloudGames,
      userId,
      forcedOpeningId,
      cadence,
      playoffDepthCap,
      timePreset,
      t.arenaPage,
      t.arenaPlayoff,
    ]
  );

  const playMatchById = useCallback(
    async (matchId: string) => {
      const match = bracket.matches.find((m) => m.id === matchId);
      if (!match || match.status !== "ready") return;

      const { keyA, keyB } = resolveMatchSideKeys(match, bracket);
      const whiteOpt = getOptionByKey(poolOptions, keyA);
      const blackOpt = getOptionByKey(poolOptions, keyB);
      if (!whiteOpt || !blackOpt) return;

      setActiveMatchId(matchId);
      runningRef.current = true;
      setMatchRunning(true);

      try {
        const { winnerKey, note } = await runSingleMatch(
          matchId,
          whiteOpt,
          blackOpt
        );
        if (winnerKey) {
          setBracket((prev) =>
            recordMatchResult(prev, matchId, winnerKey, note)
          );
        }
      } finally {
        runningRef.current = false;
        setMatchRunning(false);
        setClock(null);
      }
    },
    [bracket, poolOptions, runSingleMatch]
  );

  const handleRunTournament = async () => {
    if (!canStartTournament || !isReady) return;
    setTournamentRunning(true);
    resetBoard();
    try {
      let state = bracket;
      for (;;) {
        const next = getNextReadyMatch(state);
        if (!next) break;
        setActiveMatchId(next.id);
        const { keyA, keyB } = resolveMatchSideKeys(next, state);
        const whiteOpt = getOptionByKey(poolOptions, keyA);
        const blackOpt = getOptionByKey(poolOptions, keyB);
        if (!whiteOpt || !blackOpt) break;

        runningRef.current = true;
        setMatchRunning(true);
        const { winnerKey, note } = await runSingleMatch(
          next.id,
          whiteOpt,
          blackOpt
        );
        runningRef.current = false;
        setMatchRunning(false);
        if (!winnerKey) break;
        state = recordMatchResult(state, next.id, winnerKey, note);
        setBracket(state);
        setClock(null);
        await new Promise((r) => setTimeout(r, 600));
      }
    } finally {
      setTournamentRunning(false);
      runningRef.current = false;
      setMatchRunning(false);
    }
  };

  const handlePause = () => {
    runningRef.current = false;
    setMatchRunning(false);
    setTournamentRunning(false);
    stopThinking();
  };

  const stm = useMemo(() => {
    try {
      return new Chess(fen).turn();
    } catch {
      return "w" as const;
    }
  }, [fen]);

  if (listLoading && rawOptions.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-slate-400 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        <span className="text-sm">{t.arenaPage.loadingProfiles}</span>
      </div>
    );
  }

  return (
    <div className="arena-playoff-layout space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/20 bg-slate-900/50 px-3 py-2">
        <Swords className="h-4 w-4 text-amber-400 shrink-0" />
        <span className="text-xs text-slate-400 hidden sm:inline">
          {timeControlLabel}
          <span className="text-slate-500"> · {t.arenaPlayoff.drawRuleHint}</span>
        </span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={bracketSize === 4 ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setBracketSize(4)}
            disabled={matchRunning || tournamentRunning}
          >
            4
          </Button>
          <Button
            size="sm"
            variant={bracketSize === 8 ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setBracketSize(8)}
            disabled={matchRunning || tournamentRunning}
          >
            8
          </Button>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={handleAutoSeed}
          disabled={poolOptions.length < bracketSize}
        >
          {t.arenaPlayoff.autoSeed}
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs bg-amber-600 hover:bg-amber-500"
          disabled={!canStartTournament || !isReady}
          onClick={() => void handleRunTournament()}
        >
          <Play className="h-3.5 w-3.5 mr-1" />
          {t.arenaPlayoff.runTournament}
        </Button>
        <span className="text-[10px] text-slate-500 ml-auto">
          {filledSeeds}/{bracketSize}
        </span>
      </div>

      {isSupabaseConfigured && userId ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-slate-900/50 px-3 py-2">
          <div className="space-y-0.5 min-w-0">
            <Label
              htmlFor="playoff-save-cloud"
              className="text-sm text-slate-200"
            >
              {t.arenaPlayoff.saveCloudLabel}
            </Label>
            <p className="text-[11px] text-slate-500 leading-snug">
              {t.arenaPlayoff.saveCloudHint}
            </p>
          </div>
          <Switch
            id="playoff-save-cloud"
            checked={saveCloudGames}
            onCheckedChange={setSaveCloudGames}
            className="shrink-0"
          />
        </div>
      ) : isSupabaseConfigured && !userId ? (
        <p className="text-xs text-slate-500 px-1">
          {t.arenaPlayoff.saveCloudNeedLogin}
        </p>
      ) : null}

      {!showBoard && (
        <ArenaPlayoffRosterDeck
          pool={poolOptions}
          rosterFilter={rosterFilter}
          onRosterFilterChange={setRosterFilter}
          tapPickKey={tapPickKey}
          onTapPickKey={handleTapPickKey}
          dragOptionKey={dragOptionKey}
          onDragStartOption={setDragOptionKey}
          onDragEnd={() => setDragOptionKey(null)}
          placedKeys={placedKeys}
        />
      )}

      <div
        className={`arena-playoff-grid grid gap-3 items-start ${
          showBoard
            ? "grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]"
            : "grid-cols-1"
        }`}
      >
        {showBoard && (
        <Card
          className="bg-slate-900/70 border-cyan-500/20 xl:order-1"
        >
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-cyan-300 text-sm">
              {activeSides.white && activeSides.black
                ? `${activeSides.white.config.name} vs ${activeSides.black.config.name}`
                : t.arenaPlayoff.selectMatch}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            {clock && activeSides.white && activeSides.black && (
              <ArenaBotClockBar
                clock={clock}
                sideToMove={stm}
                whiteLabel={activeSides.white.config.name || "W"}
                blackLabel={activeSides.black.config.name || "B"}
                active={matchRunning}
              />
            )}

            <div className="flex justify-center">
              <div className="w-full max-w-md space-y-2 min-w-0">
                {isReady && matchRunning && (
                  <EvaluationBar evaluation={barEval} />
                )}
                <div className="w-full aspect-square min-h-0 overflow-hidden">
                  <SimpleChessboard
                    position={fen}
                    lastMove={lastMove}
                    orientation="white"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {matchRunning ? (
                <Button variant="outline" size="sm" onClick={handlePause}>
                  <Pause className="h-4 w-4 mr-1" />
                  {t.arenaPage.pause}
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={resetBoard}>
                <RotateCcw className="h-4 w-4 mr-1" />
                {t.arenaPage.reset}
              </Button>
            </div>

            <p className="text-center text-xs text-slate-400 min-h-[1.25rem]">
              {statusNote ??
                (matchRunning
                  ? t.arenaPage.statusThinking
                  : !isReady
                    ? t.arenaPage.needEngine
                    : t.arenaPage.statusIdle)}
            </p>
            <p className="text-center text-[10px] text-slate-500">
              {t.arenaPage.movesPlayed}: {moveCount}
            </p>

            {bracket.championKey && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-center">
                <Label className="text-amber-400 text-xs">
                  {t.arenaPlayoff.champion}
                </Label>
                <p className="text-lg font-bold text-cyan-100">
                  {getOptionByKey(poolOptions, bracket.championKey)?.config.name}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        <Card
          className={`bg-slate-900/50 border-slate-700/80 overflow-hidden ${
            showBoard ? "xl:order-2" : ""
          }`}
        >
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-400 border-b border-slate-800 xl:hidden"
            onClick={() => setSetupOpen((v) => !v)}
          >
            {t.arenaPlayoff.bracketTitle}
            {setupOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <CardContent
            className={`p-3 ${setupOpen ? "block" : "hidden xl:block"}`}
          >
            <ArenaPlayoffBracket
              state={bracket}
              pool={poolOptions}
              activeMatchId={activeMatchId}
              onSelectMatch={(id) => {
                if (!matchRunning && !tournamentRunning) {
                  setActiveMatchId(id);
                }
              }}
              onDropSeed={handleDropSeed}
              tapPickKey={tapPickKey}
              onTapPickKey={setTapPickKey}
            />
            {activeMatch?.status === "ready" && !tournamentRunning && (
              <Button
                className="w-full mt-2 h-8 text-xs"
                disabled={!isReady || matchRunning}
                onClick={() => void playMatchById(activeMatch.id)}
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                {t.arenaPlayoff.playSelectedMatch}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
