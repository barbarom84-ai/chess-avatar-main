"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import SimpleChessboard from "@/components/SimpleChessboard";
import ArenaBotClockBar from "@/components/ArenaBotClockBar";
import ArenaPlayoffBracket from "@/components/ArenaPlayoffBracket";
import EvaluationBar from "@/components/EvaluationBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useStockfish } from "@/hooks/useStockfish";
import { useLanguage } from "@/lib/language-context";
import {
  applyArenaCaps,
  classifyArenaOutcome,
  replayUci,
  stmEvalToWhitePov,
} from "@/lib/arena-chess";
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

const PLAYOFF_DEPTH = 10;
const PLAYOFF_MAX_PLIES = 200;

function playoffTiebreakKey(
  white: { key: string; config: { elo?: number } },
  black: { key: string; config: { elo?: number } }
): string {
  const w = white.config.elo ?? 1500;
  const b = black.config.elo ?? 1500;
  if (w !== b) return w > b ? white.key : black.key;
  return white.key;
}

export default function ArenaPlayoffMode() {
  const { t, lang } = useLanguage();
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
        const raw = await getPositionEvaluation(fen, PLAYOFF_DEPTH);
        if (cancelled || seq !== evalSeqRef.current) return;
        setBarEval(stmEvalToWhitePov(fen, raw));
      } catch {
        if (!cancelled && seq === evalSeqRef.current) setBarEval(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fen, isReady, getPositionEvaluation, clock, matchRunning]);

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
  const canStartTournament =
    filledSeeds >= bracketSize && !tournamentRunning && !matchRunning;

  const handleDropSeed = useCallback((slot: number, key: string | null) => {
    setBracket((prev) => setSeed(prev, slot, key));
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
      const whiteConfig = applyArenaCaps(whiteOpt.config, PLAYOFF_DEPTH);
      const blackConfig = applyArenaCaps(blackOpt.config, PLAYOFF_DEPTH);
      const whiteKey = whiteOpt.key;
      const blackKey = blackOpt.key;

      historyRef.current = [];
      let liveClock = createPlayoffClock();
      setClock(liveClock);
      setFen(new Chess().fen());
      setLastMove(null);
      setMoveCount(0);
      setStatusNote(t.arenaPlayoff.matchLive);

      const gameEndMessage = (g: Chess) => {
        if (g.isCheckmate()) return t.arenaPage.resultCheckmate;
        if (g.isDraw() || g.isStalemate()) return t.arenaPage.resultDraw;
        return t.arenaPage.gameOver;
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
          setStatusNote(outcome.resultMessage);
          return { winnerKey, note: outcome.resultMessage };
        }
        liveClock = tick.clock;
        setClock(liveClock);

        const cfg = stm === "w" ? whiteConfig : blackConfig;
        const uci = await new Promise<string | null>((resolve) => {
          getBestMove(replay.fen(), cfg, (move) => resolve(move));
        });

        if (!runningRef.current) break;

        if (!uci || uci.length < 4) {
          return {
            winnerKey: stm === "w" ? blackKey : whiteKey,
            note: t.arenaPage.gameOver,
          };
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
          return {
            winnerKey: stm === "w" ? blackKey : whiteKey,
            note: t.arenaPage.gameOver,
          };
        }

        historyRef.current = [...hist, uci];
        setFen(next.fen());
        setLastMove({ from, to });
        setMoveCount(historyRef.current.length);

        if (next.isGameOver()) {
          const outcome = classifyArenaOutcome(next, false, lang);
          setStatusNote(gameEndMessage(next));
          let winnerKey: string | null = null;
          if (outcome.winner === "white") winnerKey = whiteKey;
          else if (outcome.winner === "black") winnerKey = blackKey;
          else winnerKey = playoffTiebreakKey(whiteOpt, blackOpt);
          return { winnerKey, note: outcome.resultMessage };
        }

        if (historyRef.current.length >= PLAYOFF_MAX_PLIES) {
          const outcome = classifyArenaOutcome(next, true, lang);
          const winnerKey = playoffTiebreakKey(whiteOpt, blackOpt);
          setStatusNote(outcome.resultMessage);
          return { winnerKey, note: outcome.resultMessage };
        }

        await new Promise((r) => setTimeout(r, 280));
      }

      return { winnerKey: null, note: t.arenaPlayoff.matchPaused };
    },
    [getBestMove, lang, t.arenaPage, t.arenaPlayoff]
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

  const showBoardFirst = matchRunning || tournamentRunning;

  return (
    <div className="arena-playoff-layout space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/20 bg-slate-900/50 px-3 py-2">
        <Swords className="h-4 w-4 text-amber-400 shrink-0" />
        <span className="text-xs text-slate-400 hidden sm:inline">
          {t.arenaPlayoff.timeControl}
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

      <div
        className={`arena-playoff-grid grid gap-3 items-start ${
          showBoardFirst
            ? "grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]"
            : "grid-cols-1 xl:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.15fr)]"
        }`}
      >
        <Card
          className={`bg-slate-900/70 border-cyan-500/20 ${
            showBoardFirst ? "xl:order-1" : "xl:order-2"
          }`}
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

        <Card
          className={`bg-slate-900/50 border-slate-700/80 overflow-hidden ${
            showBoardFirst ? "xl:order-2" : "xl:order-1"
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
              dragOptionKey={dragOptionKey}
              onDragStartOption={setDragOptionKey}
              onDragEnd={() => setDragOptionKey(null)}
              rosterFilter={rosterFilter}
              onRosterFilterChange={setRosterFilter}
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
