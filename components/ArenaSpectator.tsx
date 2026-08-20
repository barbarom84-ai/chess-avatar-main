"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import SimpleChessboard from "@/components/SimpleChessboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useStockfish } from "@/hooks/useStockfish";
import BotEngineSelector from "@/components/BotEngineSelector";
import { saveArenaMatchToCloud } from "@/lib/arena-cloud-save";
import {
  classifyArenaOutcome,
  replayUci,
  stmEvalToWhitePov,
  type ArenaOutcome,
} from "@/lib/arena-spectator-helpers";
import {
  dedupeByIdentity,
  filterByPlatform,
  type ProfilePlatformFilter,
} from "@/lib/arena-profile-pool";
import ArenaProfilePicker from "@/components/arena/spectator/ArenaProfilePicker";
import ArenaMatchupBanner from "@/components/arena/spectator/ArenaMatchupBanner";
import type { ProfileOption } from "@/lib/arena-types";
import { prepareArenaEngineConfig } from "@/lib/arena-forced-opening";
import {
  getArenaMoveDisplayDelayMs,
  getArenaPhase,
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
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { usePremium } from "@/hooks/usePremium";
import EvaluationBar from "@/components/EvaluationBar";
import { toast } from "sonner";
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  CopyMinus,
  Globe,
  Loader2,
} from "lucide-react";

const ARENA_STORAGE_PLATFORM = "chess-arena.platform";
const ARENA_STORAGE_DEDUPE = "chess-arena.dedupe";
const ARENA_STORAGE_SAVE_CLOUD = "chess-arena.saveCloud";

export default function ArenaSpectator({
  embedded = false,
  forcedOpeningId = null,
  timePresetId,
}: {
  embedded?: boolean;
  forcedOpeningId?: string | null;
  timePresetId: string;
}) {
  const { t, lang } = useLanguage();
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
  } = useStockfish();
  const [rawOptions, setRawOptions] = useState<ProfileOption[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [whiteKey, setWhiteKey] = useState("");
  const [blackKey, setBlackKey] = useState("");
  const [whiteSearch, setWhiteSearch] = useState("");
  const [blackSearch, setBlackSearch] = useState("");
  const [platformFilter, setPlatformFilter] =
    useState<ProfilePlatformFilter>("all");
  const [dedupeIdentity, setDedupeIdentity] = useState(true);
  const [arenaDepth, setArenaDepth] = useState(10);
  const [maxPlies, setMaxPlies] = useState(120);
  const timePreset = useMemo(
    () => resolveArenaTimePreset(timePresetId),
    [timePresetId]
  );
  const cadence = useMemo(() => cadenceFromPreset(timePreset), [timePreset]);
  const effectiveDepthCap = useMemo(
    () => getCadenceDepthCap(cadence, arenaDepth),
    [cadence, arenaDepth]
  );
  const [fen, setFen] = useState(() => new Chess().fen());
  const historyRef = useRef<string[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(
    null
  );
  const [autoPlay, setAutoPlay] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const runningRef = useRef(false);
  const arenaClockStartRef = useRef<number | null>(null);
  const arenaSavedRef = useRef(false);
  const evalSeqRef = useRef(0);
  const lastMoveDelayRef = useRef(400);
  const [saveCloudGames, setSaveCloudGames] = useState(false);
  const [barEval, setBarEval] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const p = localStorage.getItem(ARENA_STORAGE_PLATFORM);
      if (p === "lichess" || p === "chesscom" || p === "all") {
        setPlatformFilter(p);
      }
      const d = localStorage.getItem(ARENA_STORAGE_DEDUPE);
      if (d === "1") setDedupeIdentity(true);
      else if (d === "0") setDedupeIdentity(false);
      const sc = localStorage.getItem(ARENA_STORAGE_SAVE_CLOUD);
      if (sc === "1") setSaveCloudGames(true);
      else if (sc === "0") setSaveCloudGames(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        ARENA_STORAGE_SAVE_CLOUD,
        saveCloudGames ? "1" : "0"
      );
    } catch {
      /* ignore */
    }
  }, [saveCloudGames]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ARENA_STORAGE_PLATFORM, platformFilter);
  }, [platformFilter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ARENA_STORAGE_DEDUPE, dedupeIdentity ? "1" : "0");
  }, [dedupeIdentity]);

  const loadOptions = useCallback(async () => {
    setListLoading(true);
    try {
      const { loadArenaProfilePool } = await import("@/lib/arena-profile-pool");
      setRawOptions(
        await loadArenaProfilePool({
          savedProfiles: t.arenaPage.savedProfiles,
          recentProfiles: t.arenaPage.recentProfiles,
          cloudLibrary: t.arenaPage.cloudLibrary,
          featuredChampions: t.arenaPage.featuredChampions,
        })
      );
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
    if (dedupeIdentity) rows = dedupeByIdentity(rows);
    return rows;
  }, [rawOptions, platformFilter, dedupeIdentity]);

  useEffect(() => {
    if (poolOptions.length === 0) return;
    const nextW =
      whiteKey && poolOptions.some((o) => o.key === whiteKey)
        ? whiteKey
        : poolOptions[0].key;
    let nextB =
      blackKey && poolOptions.some((o) => o.key === blackKey)
        ? blackKey
        : poolOptions[1]?.key ?? poolOptions[0].key;
    if (nextB === nextW) {
      nextB =
        poolOptions.find((o) => o.key !== nextW)?.key ?? nextW;
    }
    if (nextW !== whiteKey) setWhiteKey(nextW);
    if (nextB !== blackKey) setBlackKey(nextB);
  }, [poolOptions, whiteKey, blackKey]);

  const whiteConfig = poolOptions.find((o) => o.key === whiteKey)?.config;
  const blackConfig = poolOptions.find((o) => o.key === blackKey)?.config;

  const resetBoard = useCallback(() => {
    runningRef.current = false;
    setAutoPlay(false);
    stopThinking();
    historyRef.current = [];
    arenaClockStartRef.current = null;
    arenaSavedRef.current = false;
    setMoveCount(0);
    setLastMove(null);
    setFen(new Chess().fen());
    setStatusNote(null);
  }, [stopThinking]);

  useEffect(() => {
    if (!isReady) return;
    const seq = ++evalSeqRef.current;
    let cancelled = false;
    void (async () => {
      try {
        const raw = await getPositionEvaluation(fen, 10);
        if (cancelled || seq !== evalSeqRef.current) return;
        setBarEval(stmEvalToWhitePov(fen, raw));
      } catch {
        if (!cancelled && seq === evalSeqRef.current) setBarEval(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fen, isReady, getPositionEvaluation]);

  const trySaveArenaCloud = useCallback(
    async (game: Chess, uciHist: string[], outcome: ArenaOutcome) => {
      if (!whiteConfig || !blackConfig || !userId) return;
      try {
        const started = arenaClockStartRef.current;
        const durationSeconds =
          started != null
            ? Math.max(0, Math.round((Date.now() - started) / 1000))
            : undefined;
        await saveArenaMatchToCloud({
          whiteConfig,
          blackConfig,
          uciHist,
          outcome: {
            ...outcome,
            winner:
              outcome.pgnResult === "1-0"
                ? "white"
                : outcome.pgnResult === "0-1"
                  ? "black"
                  : "draw",
          },
          durationSeconds,
        });
        toast.success(t.arenaPage.cloudSavedToast);
      } catch (e) {
        console.error(e);
        arenaSavedRef.current = false;
        toast.error(t.arenaPage.cloudSaveErrorToast);
      }
    },
    [
      whiteConfig,
      blackConfig,
      userId,
      t.arenaPage.cloudSavedToast,
      t.arenaPage.cloudSaveErrorToast,
    ]
  );

  const gameEndMessage = useCallback(
    (game: Chess) => {
      if (game.isCheckmate()) return t.arenaPage.resultCheckmate;
      if (game.isStalemate()) return t.arenaPage.resultStalemate;
      if (game.isDraw()) return t.arenaPage.resultDraw;
      return t.arenaPage.gameOver;
    },
    [t.arenaPage]
  );

  const playStep = useCallback(async (): Promise<boolean> => {
    if (!isReady || !whiteConfig || !blackConfig) return true;
    if (whiteKey === blackKey) {
      setStatusNote(t.arenaPage.pickBoth);
      return true;
    }

    const hist = historyRef.current;
    const game = replayUci(hist);
    if (game.isGameOver()) {
      setStatusNote(gameEndMessage(game));
      return true;
    }
    if (hist.length >= maxPlies) {
      setStatusNote(t.arenaPage.gameOver);
      const gLimit = replayUci(hist);
      if (
        saveCloudGames &&
        userId &&
        hist.length > 0 &&
        !arenaSavedRef.current
      ) {
        arenaSavedRef.current = true;
        void trySaveArenaCloud(
          gLimit,
          [...hist],
          classifyArenaOutcome(gLimit, true, lang)
        );
      }
      return true;
    }

    const stm = game.turn();
    const base = stm === "w" ? whiteConfig : blackConfig;
    const cfg = prepareArenaEngineConfig(base, {
      depthCap: effectiveDepthCap,
      ply: hist.length,
      game,
      forcedOpeningId,
      cadence,
      historyUci: hist,
    });
    const phase = getArenaPhase(hist.length, game);
    const singleUci = getSingleLegalMoveUci(game);
    let uci: string;

    if (singleUci) {
      uci = singleUci;
    } else {
      const thinkBudgetMs = getArenaThinkBudgetMs(
        isArenaTheoreticalOpening(cfg, hist.length, hist)
      );
      const thinkStartedAt = Date.now();
      const playerColor = stm === "w" ? "black" : "white";

      uci = await new Promise<string>((resolve) => {
        getBestMove(game.fen(), cfg, (m) => resolve(m || ""), {
          moveHistoryUci: hist,
          playerColor,
          arenaStyle: true,
        });
      });

      await sleepArenaThinkRemainder(thinkStartedAt, thinkBudgetMs);
    }

    lastMoveDelayRef.current = getArenaMoveDisplayDelayMs(
      phase,
      cfg.timeControl,
      "spectator"
    );

    if (!uci || uci.length < 4) {
      setStatusNote(t.arenaPage.gameOver);
      return true;
    }

    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion =
      uci.length > 4 ? (uci[4] as "q" | "r" | "b" | "n") : undefined;
    const next = replayUci(hist);
    const ok = next.move(
      promotion ? { from, to, promotion } : { from, to }
    );
    if (!ok) {
      setStatusNote(t.arenaPage.gameOver);
      return true;
    }

    const wasEmpty = hist.length === 0;
    historyRef.current = [...hist, uci];
    if (wasEmpty) arenaClockStartRef.current = Date.now();

    setFen(next.fen());
    setLastMove({ from, to });
    setMoveCount(historyRef.current.length);
    setStatusNote(null);

    const snapshot = [...historyRef.current];

    if (next.isGameOver()) {
      setStatusNote(gameEndMessage(next));
      if (
        saveCloudGames &&
        userId &&
        snapshot.length > 0 &&
        !arenaSavedRef.current
      ) {
        arenaSavedRef.current = true;
        void trySaveArenaCloud(
          next,
          snapshot,
          classifyArenaOutcome(next, false, lang)
        );
      }
      return true;
    }
    if (snapshot.length >= maxPlies) {
      setStatusNote(t.arenaPage.gameOver);
      if (saveCloudGames && userId && !arenaSavedRef.current) {
        arenaSavedRef.current = true;
        void trySaveArenaCloud(
          next,
          snapshot,
          classifyArenaOutcome(next, true, lang)
        );
      }
      return true;
    }
    return false;
  }, [
    isReady,
    whiteConfig,
    blackConfig,
    whiteKey,
    blackKey,
    arenaDepth,
    effectiveDepthCap,
    cadence,
    maxPlies,
    getBestMove,
    t.arenaPage,
    gameEndMessage,
    saveCloudGames,
    userId,
    trySaveArenaCloud,
    lang,
    forcedOpeningId,
  ]);

  const handleStartAuto = async () => {
    if (runningRef.current || !isReady) return;
    runningRef.current = true;
    setAutoPlay(true);
    try {
      while (runningRef.current) {
        const done = await playStep();
        if (done) break;
        await new Promise((r) =>
          setTimeout(r, lastMoveDelayRef.current)
        );
      }
    } finally {
      runningRef.current = false;
      setAutoPlay(false);
    }
  };

  const handlePause = () => {
    runningRef.current = false;
    setAutoPlay(false);
    stopThinking();
  };

  const handleOneMove = async () => {
    await playStep();
  };

  const needsProfiles = !listLoading && rawOptions.length < 2;

  return (
    <div
      className={
        embedded ? "space-y-6" : "max-w-6xl mx-auto space-y-6 p-4 md:p-6"
      }
    >
      {!embedded && (
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-cyan-400">{t.pages.arena.title}</h1>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            {t.pages.arena.subtitle}
          </p>
        </div>
      )}

      {listLoading && rawOptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
          <span className="text-sm">{t.arenaPage.loadingProfiles}</span>
          <span className="text-xs text-slate-500 max-w-sm text-center">
            {t.arenaPage.featuredLoading}
          </span>
        </div>
      ) : needsProfiles ? (
        <Card className="bg-slate-900/70 border-amber-500/30">
          <CardContent className="py-6 text-center text-slate-300 text-sm space-y-3">
            <p>
              {lang === "fr"
                ? "Il faut au moins deux profils (locaux ou publics dans la bibliothèque cloud) pour lancer l’arène."
                : "You need at least two profiles (local or public in the cloud library) to run the arena."}
            </p>
            <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
              {t.arenaPage.emptyHint}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="bg-slate-900/60 border-cyan-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-cyan-300 text-lg">
                {t.arenaPage.selectWhite} / {t.arenaPage.selectBlack}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-end gap-4 pb-2 border-b border-slate-800">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-1">
                    <Globe className="h-3 w-3 text-slate-400" />
                    <span className="text-xs text-slate-400">
                      {t.library.platformFilter}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant={platformFilter === "all" ? "default" : "outline"}
                      onClick={() => setPlatformFilter("all")}
                      className={
                        platformFilter === "all"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-950 border-slate-700"
                      }
                    >
                      {t.library.platformAll}
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        platformFilter === "lichess" ? "default" : "outline"
                      }
                      onClick={() => setPlatformFilter("lichess")}
                      className={
                        platformFilter === "lichess"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-950 border-slate-700"
                      }
                    >
                      {t.library.platformLichess}
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        platformFilter === "chesscom" ? "default" : "outline"
                      }
                      onClick={() => setPlatformFilter("chesscom")}
                      className={
                        platformFilter === "chesscom"
                          ? "bg-green-700 text-white"
                          : "bg-slate-950 border-slate-700"
                      }
                    >
                      {t.library.platformChesscom}
                    </Button>
                  </div>
                </div>
                <div className="flex-1 rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-2 max-w-md">
                  <div className="flex items-center justify-between gap-3">
                    <Label
                      htmlFor="arena-dedupe"
                      className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer"
                    >
                      <CopyMinus className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      {t.library.dedupeTitle}
                    </Label>
                    <Switch
                      id="arena-dedupe"
                      checked={dedupeIdentity}
                      onCheckedChange={setDedupeIdentity}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug">
                    {t.library.dedupeHint}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <ArenaProfilePicker
                  sideLabel={t.arenaPage.whiteSide}
                  selectedKey={whiteKey}
                  pool={poolOptions}
                  searchQuery={whiteSearch}
                  onSearchChange={setWhiteSearch}
                  onSelectKey={setWhiteKey}
                  searchPlaceholder={t.arenaPage.pickSearchPlaceholder}
                  noMatches={t.arenaPage.pickNoMatches}
                  listHint={t.arenaPage.pickListHint}
                  cardsHint={t.arenaPage.pickCardsHint}
                />
                <ArenaProfilePicker
                  sideLabel={t.arenaPage.blackSide}
                  selectedKey={blackKey}
                  pool={poolOptions}
                  searchQuery={blackSearch}
                  onSearchChange={setBlackSearch}
                  onSelectKey={setBlackKey}
                  searchPlaceholder={t.arenaPage.pickSearchPlaceholder}
                  noMatches={t.arenaPage.pickNoMatches}
                  listHint={t.arenaPage.pickListHint}
                  cardsHint={t.arenaPage.pickCardsHint}
                />
              </div>

              <ArenaMatchupBanner
                whiteOption={poolOptions.find((o) => o.key === whiteKey)}
                blackOption={poolOptions.find((o) => o.key === blackKey)}
                vsLabel={t.arenaPage.matchupVs}
              />

              <div className="grid sm:grid-cols-2 gap-4 md:col-span-2 pt-2">
                <div>
                  <Label className="text-xs text-slate-400">
                    {t.arenaPage.depthLabel}
                  </Label>
                  <input
                    type="range"
                    min={6}
                    max={16}
                    value={arenaDepth}
                    onChange={(e) => setArenaDepth(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                  <div className="text-[11px] text-slate-500 font-mono">
                    {arenaDepth}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">
                    {t.arenaPage.maxPliesLabel}
                  </Label>
                  <input
                    type="range"
                    min={20}
                    max={250}
                    step={10}
                    value={maxPlies}
                    onChange={(e) => setMaxPlies(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                  <div className="text-[11px] text-slate-500 font-mono">
                    {maxPlies}
                  </div>
                </div>
              </div>

              <BotEngineSelector
                chessAvatarReady={isChessAvatarReady}
                chessAvatarPlayReady={isChessAvatarPlayReady}
                chessAvatarNnueLoading={isChessAvatarNnueLoading}
                chessAvatarSearchStats={chessAvatarSearchStats}
                stockfishReady={isStockfishReady}
                lastBotEngineUsed={lastBotEngineUsed}
                botElo={Math.max(whiteConfig?.elo ?? 0, blackConfig?.elo ?? 0) || undefined}
                botDifficulty={Math.max(whiteConfig?.difficulty ?? 0, blackConfig?.difficulty ?? 0) || undefined}
                compact
              />

              {isSupabaseConfigured && userId ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5">
                  <div className="space-y-0.5 min-w-0">
                    <Label
                      htmlFor="arena-save-cloud"
                      className="text-sm text-slate-200"
                    >
                      {t.arenaPage.saveCloudLabel}
                    </Label>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {t.arenaPage.saveCloudHint}
                    </p>
                  </div>
                  <Switch
                    id="arena-save-cloud"
                    checked={saveCloudGames}
                    onCheckedChange={setSaveCloudGames}
                    className="shrink-0"
                  />
                </div>
              ) : isSupabaseConfigured && !userId ? (
                <p className="text-xs text-slate-500">
                  {t.arenaPage.saveCloudNeedLogin}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              onClick={() => void loadOptions()}
              disabled={listLoading}
              variant="outline"
              size="sm"
              className="border-slate-600"
            >
              {listLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t.arenaPage.refreshList
              )}
            </Button>
            <Button
              onClick={resetBoard}
              variant="outline"
              size="sm"
              className="border-slate-600"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              {t.arenaPage.reset}
            </Button>
            <Button
              onClick={() => void handleOneMove()}
              disabled={!isReady || autoPlay || whiteKey === blackKey}
              size="sm"
              className="bg-slate-700 hover:bg-slate-600"
            >
              <StepForward className="h-4 w-4 mr-1" />
              {t.arenaPage.step}
            </Button>
            {!autoPlay ? (
              <Button
                onClick={() => void handleStartAuto()}
                disabled={!isReady || whiteKey === blackKey}
                size="sm"
                className="bg-green-600 hover:bg-green-500"
              >
                <Play className="h-4 w-4 mr-1" />
                {t.arenaPage.start}
              </Button>
            ) : (
              <Button
                onClick={handlePause}
                size="sm"
                variant="destructive"
              >
                <Pause className="h-4 w-4 mr-1" />
                {t.arenaPage.pause}
              </Button>
            )}
          </div>

          <div className="text-center text-xs text-slate-400 space-y-1">
            {!isReady ? (
              <p>{t.arenaPage.needEngine}</p>
            ) : (
              <p>
                {autoPlay ? t.arenaPage.statusThinking : t.arenaPage.statusIdle}
                {" · "}
                {t.arenaPage.movesPlayed}: {moveCount}
              </p>
            )}
            {statusNote && (
              <p className="text-amber-200 font-medium">{statusNote}</p>
            )}
            {whiteKey === blackKey && (
              <p className="text-amber-300">{t.arenaPage.pickBoth}</p>
            )}
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-md space-y-2">
              {isReady && <EvaluationBar evaluation={barEval} />}
              <div className="chessboard-frame chessboard-frame--md w-full">
                <SimpleChessboard
                  position={fen}
                  orientation="white"
                  lastMove={lastMove}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
