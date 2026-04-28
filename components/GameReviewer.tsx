"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RotateCw,
  Square,
  Crown,
  AlertTriangle,
  Pause,
  Play,
  Sparkles,
  Loader2,
  MessageCircleQuestion,
  BarChart3,
  BookOpen,
  ShieldAlert,
  Skull,
  Lock,
  LogOut,
} from "lucide-react";
import { Chess } from "chess.js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip as ReTooltip,
} from "recharts";

import SimpleChessboard from "./SimpleChessboard";
import EvaluationBar from "./EvaluationBar";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { ScrollArea } from "./ui/scroll-area";
import { useGameReview, type ReviewStatus } from "@/hooks/useGameReview";
import {
  CLASSIFICATION_COLORS,
  hashReviewCacheKey,
  parsePgnForReview,
  uciToSan,
  uciToSquares,
  type GameReviewResult,
  type ParsedGameForReview,
  type ReviewedMove,
} from "@/lib/game-review";
import {
  type AnalysisStrictnessId,
  DEFAULT_ANALYSIS_STRICTNESS,
} from "@/lib/analysis-profiles";
import { type CoachToneId } from "@/lib/coach-tone";
import { loadCachedReview, saveReview } from "@/lib/game-review-storage";
import { useLanguage } from "@/lib/language-context";
import { useCoachExplain } from "@/hooks/useCoachExplain";
import { getOpeningName, type Opening } from "@/lib/openings-library";
import { findBestOpeningByPrefix } from "@/lib/openings-registry";
import {
  describeTheoryHitsForUi,
  getOpeningTheorySans,
} from "@/lib/opening-theory";

const FREE_ENGINE_DEPTH = 12;
const PREMIUM_DEPTH_OPTIONS = [14, 18, 22] as const;

const STORAGE_STRICTNESS = "chess-avatar.review.strictness";
const STORAGE_PREMIUM_DEPTH = "chess-avatar.review.premiumDepth";
const STORAGE_COACH_TONE = "chess-avatar.review.coachTone";

function readStoredStrictness(): AnalysisStrictnessId {
  if (typeof window === "undefined") return DEFAULT_ANALYSIS_STRICTNESS;
  const v = localStorage.getItem(STORAGE_STRICTNESS);
  if (v === "relaxed" || v === "standard" || v === "strict") return v;
  return DEFAULT_ANALYSIS_STRICTNESS;
}

function readStoredPremiumDepth(): number {
  if (typeof window === "undefined") return 18;
  const v = localStorage.getItem(STORAGE_PREMIUM_DEPTH);
  const n = v ? parseInt(v, 10) : NaN;
  if (PREMIUM_DEPTH_OPTIONS.includes(n as (typeof PREMIUM_DEPTH_OPTIONS)[number])) {
    return n;
  }
  return 18;
}

function readStoredCoachTone(): CoachToneId {
  if (typeof window === "undefined") return "pedagogical";
  const v = localStorage.getItem(STORAGE_COACH_TONE);
  if (v === "pedagogical" || v === "concise" || v === "witty") return v;
  return "pedagogical";
}

interface GameReviewerProps {
  pgn: string;
  /** When true, user may choose deeper engine search (see PREMIUM_DEPTH_OPTIONS). */
  isPremium: boolean;
  /** Maximum number of plies analyzed (Infinity = full game). */
  maxPlies: number;
  /**
   * Whether the user is allowed to see the engine "best move" arrow on every
   * sub-optimal move. When false the arrow is shown only on blunders/misses.
   */
  showAllBestArrows: boolean;
  /** When provided, attempt to load/save the review from Supabase. */
  cacheUserId?: string | null;
  /** Triggered when the Coach UI asks the user to upgrade (e.g. quota reached). */
  onRequestUpgrade?: () => void;
}

export default function GameReviewer({
  pgn,
  isPremium,
  maxPlies,
  showAllBestArrows,
  cacheUserId,
  onRequestUpgrade,
}: GameReviewerProps) {
  const { t, lang } = useLanguage();

  const [analysisStrictness, setAnalysisStrictness] =
    useState<AnalysisStrictnessId>(readStoredStrictness);
  const [premiumDepth, setPremiumDepth] = useState(readStoredPremiumDepth);
  const [coachTone, setCoachTone] = useState<CoachToneId>(readStoredCoachTone);

  const engineDepth = isPremium ? premiumDepth : FREE_ENGINE_DEPTH;

  const parsed = useMemo<ParsedGameForReview | null>(
    () => parsePgnForReview(pgn),
    [pgn]
  );

  const [cachedResult, setCachedResult] = useState<GameReviewResult | null>(null);
  const [cacheChecked, setCacheChecked] = useState(false);

  const pgnHash = useMemo(
    () => hashReviewCacheKey(pgn, analysisStrictness, engineDepth),
    [pgn, analysisStrictness, engineDepth]
  );

  // Try to load a cached review for premium logged-in users.
  useEffect(() => {
    let cancelled = false;
    setCachedResult(null);
    setCacheChecked(false);
    if (!cacheUserId) {
      setCacheChecked(true);
      return;
    }
    void (async () => {
      const cached = await loadCachedReview({
        userId: cacheUserId,
        pgnHash,
        depth: engineDepth,
      });
      if (cancelled) return;
      // Older cache entries may contain a `bestMove` (UCI) that is illegal in
      // the position it claims to apply to (a stale-search bug fixed in
      // useStockfish). Re-validate against the live FEN and strip bad fields
      // so we don't draw a wrong arrow or mislabel "Best was: …".
      if (cached && parsed) {
        cached.moves = cached.moves.map((m, idx) => {
          const fenBefore = parsed.fenBefore[idx];
          if (!fenBefore || !m.bestMove) return m;
          const validatedSan = uciToSan(fenBefore, m.bestMove);
          if (!validatedSan) {
            return { ...m, bestMove: "", bestSan: "" };
          }
          return m.bestSan ? m : { ...m, bestSan: validatedSan };
        });
      }
      if (cached) setCachedResult(cached);
      setCacheChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [cacheUserId, pgnHash, engineDepth, parsed]);

  // Skip live analysis if we already have a cached result.
  const review = useGameReview({
    parsed: cachedResult ? null : parsed,
    depth: engineDepth,
    maxPlies,
    analysisStrictness,
  });

  const { cancel: cancelReview, reset: resetReview } = review;

  // Persist completed reviews to the cache.
  useEffect(() => {
    if (!cacheUserId) return;
    if (review.status !== "done" || !review.result) return;
    void saveReview({
      userId: cacheUserId,
      pgnHash,
      depth: engineDepth,
      result: review.result,
    });
  }, [cacheUserId, pgnHash, engineDepth, review.status, review.result]);

  const invalidateCacheAndReanalyze = useCallback(() => {
    try {
      cancelReview();
    } catch {
      /* best-effort */
    }
    setCachedResult(null);
    resetReview();
  }, [cancelReview, resetReview]);

  const handleStrictnessChange = useCallback(
    (next: AnalysisStrictnessId) => {
      setAnalysisStrictness(next);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_STRICTNESS, next);
      }
      invalidateCacheAndReanalyze();
    },
    [invalidateCacheAndReanalyze]
  );

  const handlePremiumDepthChange = useCallback(
    (next: number) => {
      setPremiumDepth(next);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_PREMIUM_DEPTH, String(next));
      }
      invalidateCacheAndReanalyze();
    },
    [invalidateCacheAndReanalyze]
  );

  const handleCoachToneChange = useCallback((next: CoachToneId) => {
    setCoachTone(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_COACH_TONE, next);
    }
  }, []);

  // Effective values consumed by the UI: cache hit takes precedence over live run.
  const effectiveStatus: ReviewStatus = cachedResult
    ? "done"
    : !cacheChecked
    ? "engine-loading"
    : review.status;
  const effectiveMoves = cachedResult ? cachedResult.moves : review.moves;
  const effectiveResult = cachedResult ?? review.result;
  const effectiveProgress = cachedResult
    ? cachedResult.moves.length
    : review.progress;
  const effectiveTotal = cachedResult ? cachedResult.moves.length : review.total;

  const totalPlies = parsed?.san.length ?? 0;
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [currentIndex, setCurrentIndex] = useState(0); // 0 = initial position; 1..N after move N
  const [autoPlay, setAutoPlay] = useState(false);

  // Reset board when the game changes.
  useEffect(() => {
    setCurrentIndex(0);
    setAutoPlay(false);
  }, [pgn]);

  // Keep the selected ply in range when analysis resets or move list shrinks.
  useEffect(() => {
    const max = effectiveMoves.length;
    setCurrentIndex((i) => (max === 0 ? 0 : Math.min(i, max)));
  }, [effectiveMoves.length]);

  // Auto-advance the board to follow the engine while it's analyzing.
  useEffect(() => {
    if (effectiveStatus !== "running") return;
    setCurrentIndex(effectiveProgress);
  }, [effectiveProgress, effectiveStatus]);

  // Auto-play playback when review is done.
  useEffect(() => {
    if (!autoPlay) return;
    if (currentIndex >= totalPlies) {
      setAutoPlay(false);
      return;
    }
    const id = setInterval(
      () => setCurrentIndex((i) => Math.min(i + 1, totalPlies)),
      900
    );
    return () => clearInterval(id);
  }, [autoPlay, currentIndex, totalPlies]);

  const evalSeries = useMemo(
    () =>
      effectiveMoves.map((m) => ({
        ply: m.ply + 1,
        eval: clamp(m.playerEval, -10, 10),
      })),
    [effectiveMoves]
  );

  // Per-ply opening detection (longest-prefix-match against the local opening
  // database). `openingByPly[i]` is the opening whose UCI prefix matches the
  // first `i + 1` plies of the game, or null when we've left book theory.
  const openingByPly = useMemo<Array<Opening | null>>(() => {
    if (!parsed) return [];
    const result: Array<Opening | null> = [];
    let stillInBook = true;
    for (let i = 0; i < parsed.uci.length; i++) {
      if (!stillInBook) {
        result.push(null);
        continue;
      }
      const slice = parsed.uci.slice(0, i + 1);
      const { opening, matchedPlies } = findBestOpeningByPrefix(slice);
      if (opening && matchedPlies === slice.length) {
        result.push(opening);
      } else {
        stillInBook = false;
        result.push(null);
      }
    }
    return result;
  }, [parsed]);

  /** Ligne théorique + transpositions pour le coup courant (revue). */
  const openingTheorySnapshot = useMemo(() => {
    if (!parsed || currentIndex === 0) return null;
    const slice = parsed.uci.slice(0, currentIndex);
    const { opening, matchedPlies } = findBestOpeningByPrefix(slice);
    if (!opening) return null;
    const sans = getOpeningTheorySans(opening);
    if (sans.length === 0) return null;
    const fen = parsed.fenAfter[currentIndex - 1];
    const aligned = matchedPlies === slice.length;
    const transpositionHints = describeTheoryHitsForUi(fen, lang, {
      skipOpeningId: aligned ? opening.id : undefined,
      skipTheoryStep: aligned ? matchedPlies : undefined,
    });
    return {
      opening,
      matchedPlies,
      sans,
      aligned,
      transpositionHints,
    };
  }, [parsed, currentIndex, lang]);

  // Per-ply tactical flags computed entirely from the FEN snapshots that
  // chess.js already produced. No engine round-trips, runs once when the
  // game changes and is then memoized.
  //   - isForced: the side to move had exactly ONE legal move at fenBefore.
  //   - isCheck:  fenAfter is a check (but not mate).
  //   - isCheckmate: fenAfter is mate. Implies isCheck conceptually but we
  //     keep them mutually exclusive in this struct so the UI can pick the
  //     right badge directly.
  const moveFlagsByPly = useMemo(() => {
    if (!parsed) {
      return [] as Array<{
        isForced: boolean;
        isCheck: boolean;
        isCheckmate: boolean;
      }>;
    }
    return parsed.fenBefore.map((fen, i) => {
      let isForced = false;
      let isCheck = false;
      let isCheckmate = false;
      try {
        const before = new Chess(fen);
        isForced = before.moves().length === 1;
      } catch {
        // ignore
      }
      try {
        const after = new Chess(parsed.fenAfter[i]);
        isCheckmate = after.isCheckmate();
        isCheck = !isCheckmate && after.inCheck();
      } catch {
        // ignore
      }
      return { isForced, isCheck, isCheckmate };
    });
  }, [parsed]);

  // Index of the first ply that exits opening theory, or -1 if the entire
  // game stays in book / no theory was ever entered.
  const exitTheoryPly = useMemo(() => {
    if (!openingByPly.length) return -1;
    let everInBook = false;
    for (let i = 0; i < openingByPly.length; i++) {
      if (openingByPly[i]) {
        everInBook = true;
      } else if (everInBook) {
        return i;
      }
    }
    return -1;
  }, [openingByPly]);

  if (!parsed) {
    return (
      <Card className="bg-slate-900/50 border-red-500/30">
        <CardContent className="py-10 text-center text-red-300">
          {t.review.invalidPgn}
        </CardContent>
      </Card>
    );
  }

  const currentFen =
    currentIndex === 0
      ? parsed.fenBefore[0]
      : parsed.fenAfter[Math.min(currentIndex, parsed.fenAfter.length) - 1];

  // The move that just played to reach currentFen (when currentIndex > 0).
  const currentMove: ReviewedMove | undefined =
    currentIndex > 0 ? effectiveMoves[currentIndex - 1] : undefined;
  const lastMoveSquares =
    currentIndex > 0 ? uciToSquares(parsed.uci[currentIndex - 1]) : null;

  // Engine "best move" arrow: shown on the position BEFORE the move that was
  // just played, if the played move was sub-optimal.
  const arrows: Array<{ from: string; to: string; color?: string }> = [];
  if (currentMove && currentMove.bestMove && currentMove.uci !== currentMove.bestMove) {
    const isCritical =
      currentMove.classification === "blunder" ||
      currentMove.classification === "miss";
    if (showAllBestArrows || isCritical) {
      const sq = uciToSquares(currentMove.bestMove);
      if (sq) {
        arrows.push({
          from: sq.from,
          to: sq.to,
          color: isCritical
            ? "rgba(239, 68, 68, 0.85)"
            : "rgba(34, 197, 94, 0.85)",
        });
      }
    }
  }

  const evalForBar =
    currentIndex === 0
      ? 0
      : effectiveMoves[currentIndex - 1]?.playerEval ?? null;

  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goNext = () =>
    setCurrentIndex((i) =>
      Math.min(i + 1, Math.max(effectiveMoves.length, currentIndex))
    );
  const goStart = () => setCurrentIndex(0);
  const goEnd = () => setCurrentIndex(effectiveMoves.length);
  const flipBoard = () =>
    setOrientation((o) => (o === "white" ? "black" : "white"));

  const goToKeyMoment = (direction: 1 | -1) => {
    if (!effectiveResult) return;
    const moments = effectiveResult.keyMoments;
    if (moments.length === 0) return;
    const target =
      direction === 1
        ? moments.find((m) => m + 1 > currentIndex)
        : [...moments].reverse().find((m) => m + 1 < currentIndex);
    if (target !== undefined) setCurrentIndex(target + 1);
  };

  const strictnessSelectClass =
    "mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40";

  return (
    <div className="space-y-3">
      <Card className="bg-slate-900/70 border-cyan-500/25">
        <CardHeader className="py-3 pb-2">
          <CardTitle className="text-sm text-cyan-300 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t.review.analysisSettings.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-0">
          <div>
            <Label className="text-[11px] uppercase tracking-wide text-slate-500">
              {t.review.analysisSettings.strictnessLabel}
            </Label>
            <select
              className={strictnessSelectClass}
              value={analysisStrictness}
              onChange={(e) =>
                handleStrictnessChange(e.target.value as AnalysisStrictnessId)
              }
              aria-label={t.review.analysisSettings.strictnessLabel}
            >
              <option value="relaxed">{t.review.analysisSettings.strictnessRelaxed}</option>
              <option value="standard">{t.review.analysisSettings.strictnessStandard}</option>
              <option value="strict">{t.review.analysisSettings.strictnessStrict}</option>
            </select>
            <p className="mt-1 text-[10px] text-slate-500 leading-snug">
              {analysisStrictness === "relaxed" && t.review.analysisSettings.strictnessHintRelaxed}
              {analysisStrictness === "standard" && t.review.analysisSettings.strictnessHintStandard}
              {analysisStrictness === "strict" && t.review.analysisSettings.strictnessHintStrict}
            </p>
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wide text-slate-500">
              {t.review.analysisSettings.depthLabel}
            </Label>
            {isPremium ? (
              <>
                <select
                  className={strictnessSelectClass}
                  value={premiumDepth}
                  onChange={(e) =>
                    handlePremiumDepthChange(Number(e.target.value))
                  }
                  aria-label={t.review.analysisSettings.depthLabel}
                >
                  {PREMIUM_DEPTH_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {t.review.analysisSettings.depthOption.replace("{n}", String(d))}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-500">
                  {t.review.analysisSettings.depthHintPremium}
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                {t.review.analysisSettings.depthLocked.replace(
                  "{n}",
                  String(FREE_ENGINE_DEPTH)
                )}
              </p>
            )}
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wide text-slate-500">
              {t.review.analysisSettings.coachToneLabel}
            </Label>
            <select
              className={strictnessSelectClass}
              value={coachTone}
              onChange={(e) =>
                handleCoachToneChange(e.target.value as CoachToneId)
              }
              aria-label={t.review.analysisSettings.coachToneLabel}
            >
              <option value="pedagogical">{t.review.analysisSettings.coachTonePedagogical}</option>
              <option value="concise">{t.review.analysisSettings.coachToneConcise}</option>
              <option value="witty">{t.review.analysisSettings.coachToneWitty}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* LEFT — Move list */}
      <div className="lg:col-span-3 order-2 lg:order-1">
        <Card className="bg-slate-900/60 border-cyan-500/20 h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-slate-400 font-bold">
              {t.review.movesTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[55vh] lg:h-[600px] pr-2">
              <MovesList
                parsed={parsed}
                moves={effectiveMoves}
                currentIndex={currentIndex}
                openingByPly={openingByPly}
                moveFlagsByPly={moveFlagsByPly}
                exitTheoryPly={exitTheoryPly}
                onSelect={(idx) => setCurrentIndex(idx)}
              />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* CENTER — Board + Eval + Controls + per-move detail */}
      <div className="lg:col-span-6 order-1 lg:order-2 space-y-3">
        <ProgressHeader
          effectiveStatus={effectiveStatus}
          reviewStatus={review.status}
          cacheChecked={cacheChecked}
          hasCachedResult={!!cachedResult}
          engineReady={review.engineReady}
          progress={effectiveProgress}
          total={effectiveTotal}
          onCancel={review.cancel}
          onStartAnalysis={() => review.start()}
        />

        <EvaluationBar evaluation={evalForBar} />

        <div className="flex items-start gap-3">
          <div className="flex-1">
            <SimpleChessboard
              position={currentFen}
              orientation={orientation}
              lastMove={lastMoveSquares}
              arrows={arrows}
            />
          </div>

          <div className="flex flex-col gap-2 w-32 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={flipBoard}
              className="w-full border-purple-500/40 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20"
              title={t.review.flipBoard}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              {t.review.flipShort}
            </Button>
            <Card className="p-2 bg-slate-950/60 border-slate-800">
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={goStart}
                  className="w-full hover:bg-slate-800"
                  title={t.review.start}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t.review.start}
                </Button>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className="flex-1"
                    title={t.review.prev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={goNext}
                    disabled={currentIndex >= effectiveMoves.length}
                    className="flex-1"
                    title={t.review.next}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-center text-[11px] font-mono text-slate-300 py-1 bg-slate-900 rounded">
                  <span className="text-cyan-400 font-bold">
                    {currentIndex}
                  </span>
                  <span className="text-slate-600 mx-1">/</span>
                  <span>{totalPlies}</span>
                </div>
                <Button
                  size="sm"
                  variant={autoPlay ? "destructive" : "default"}
                  onClick={() => setAutoPlay((p) => !p)}
                  disabled={
                    effectiveStatus === "running" || effectiveMoves.length === 0
                  }
                  className={`w-full ${!autoPlay ? "bg-green-600 hover:bg-green-500" : ""}`}
                  title={autoPlay ? t.review.pause : t.review.playAuto}
                >
                  {autoPlay ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      {t.review.pause}
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      {t.review.playAuto}
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={goEnd}
                  disabled={currentIndex >= effectiveMoves.length}
                  className="w-full hover:bg-slate-800"
                  title={t.review.end}
                >
                  {t.review.end}
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <CurrentMoveDetail
          move={currentMove}
          explorerFen={currentFen}
          fenBefore={
            currentIndex > 0 ? parsed.fenBefore[currentIndex - 1] : undefined
          }
          moveNumber={
            currentIndex > 0 ? Math.floor((currentIndex - 1) / 2) + 1 : undefined
          }
          opening={
            currentIndex > 0 ? openingByPly[currentIndex - 1] ?? null : null
          }
          previousOpening={
            currentIndex > 1 ? openingByPly[currentIndex - 2] ?? null : null
          }
          flags={
            currentIndex > 0
              ? moveFlagsByPly[currentIndex - 1] ?? null
              : null
          }
          isExitingTheory={
            currentIndex > 0 && exitTheoryPly === currentIndex - 1
          }
          onRequestUpgrade={onRequestUpgrade}
          coachTone={coachTone}
          theorySnapshot={openingTheorySnapshot}
        />

        {evalSeries.length > 1 && (
          <Card className="bg-slate-900/60 border-cyan-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                {t.review.evalGraph}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evalSeries}>
                  <XAxis dataKey="ply" hide />
                  <YAxis domain={[-10, 10]} hide />
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                  <ReTooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [value.toFixed(2), t.review.eval]}
                    labelFormatter={(label: number) => `${t.review.ply} ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="eval"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* RIGHT — Summary + key moments */}
      <div className="lg:col-span-3 order-3 space-y-3">
        <SummaryCard
          parsed={parsed}
          review={effectiveResult}
          status={effectiveStatus}
        />
        <KeyMomentsCard
          count={effectiveResult?.keyMoments.length ?? 0}
          onPrev={() => goToKeyMoment(-1)}
          onNext={() => goToKeyMoment(1)}
          disabled={!effectiveResult || effectiveResult.keyMoments.length === 0}
        />
      </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressHeader({
  effectiveStatus,
  reviewStatus,
  cacheChecked,
  hasCachedResult,
  engineReady,
  progress,
  total,
  onCancel,
  onStartAnalysis,
}: {
  effectiveStatus: ReviewStatus;
  reviewStatus: ReviewStatus;
  cacheChecked: boolean;
  hasCachedResult: boolean;
  engineReady: boolean;
  progress: number;
  total: number;
  onCancel: () => void;
  onStartAnalysis: () => void;
}) {
  const { t } = useLanguage();
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  if (effectiveStatus === "error") {
    return <div className="text-xs text-red-300">{t.review.error}</div>;
  }

  if (effectiveStatus === "done") {
    return (
      <div className="text-xs text-emerald-300 flex items-center gap-2">
        <Crown className="h-3 w-3" /> {t.review.done}
      </div>
    );
  }

  if (!cacheChecked) {
    return (
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
        {t.review.engineLoading}
      </div>
    );
  }

  if (!hasCachedResult) {
    if (reviewStatus === "running") {
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>
              {t.review.analyzing.replace("{n}", String(progress)).replace(
                "{total}",
                String(total)
              )}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-red-300 hover:text-red-100 hover:bg-red-500/10"
              onClick={onCancel}
            >
              <Square className="h-3 w-3 mr-1" />
              {t.review.stop}
            </Button>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
      );
    }
    if (reviewStatus === "cancelled") {
      return (
        <div className="text-xs text-yellow-300">{t.review.cancelled}</div>
      );
    }
    if (reviewStatus === "idle" || reviewStatus === "engine-loading") {
      if (!engineReady) {
        return (
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            {t.review.engineLoading}
          </div>
        );
      }
      if (reviewStatus === "idle") {
        return (
          <div className="flex items-center justify-end">
            <Button
              size="sm"
              className="h-8 bg-cyan-600 hover:bg-cyan-500 text-white"
              onClick={onStartAnalysis}
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              {t.review.startAnalysis}
            </Button>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
          {t.review.engineLoading}
        </div>
      );
    }
  }

  return (
    <div className="flex items-center gap-3 text-xs text-slate-400">
      <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
      {t.review.engineLoading}
    </div>
  );
}

interface MoveFlags {
  isForced: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
}

function MovesList({
  parsed,
  moves,
  currentIndex,
  openingByPly,
  moveFlagsByPly,
  exitTheoryPly,
  onSelect,
}: {
  parsed: ParsedGameForReview;
  moves: ReviewedMove[];
  currentIndex: number;
  openingByPly: Array<Opening | null>;
  moveFlagsByPly: MoveFlags[];
  exitTheoryPly: number;
  onSelect: (idx: number) => void;
}) {
  const { t } = useLanguage();
  const rows: Array<{
    moveNumber: number;
    white: {
      san: string;
      ply: number;
      reviewed?: ReviewedMove;
      opening: Opening | null;
      flags: MoveFlags | null;
      isExitTheory: boolean;
    };
    black?: {
      san: string;
      ply: number;
      reviewed?: ReviewedMove;
      opening: Opening | null;
      flags: MoveFlags | null;
      isExitTheory: boolean;
    };
  }> = [];

  for (let i = 0; i < parsed.san.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteSan = parsed.san[i];
    const blackSan = parsed.san[i + 1];
    rows.push({
      moveNumber,
      white: {
        san: whiteSan,
        ply: i,
        reviewed: moves[i],
        opening: openingByPly[i] ?? null,
        flags: moveFlagsByPly[i] ?? null,
        isExitTheory: exitTheoryPly === i,
      },
      black: blackSan
        ? {
            san: blackSan,
            ply: i + 1,
            reviewed: moves[i + 1],
            opening: openingByPly[i + 1] ?? null,
            flags: moveFlagsByPly[i + 1] ?? null,
            isExitTheory: exitTheoryPly === i + 1,
          }
        : undefined,
    });
  }

  return (
    <div className="text-sm font-mono">
      {rows.map((row) => (
        <div
          key={row.moveNumber}
          className="grid grid-cols-[2.2rem_1fr_1fr] gap-1 py-0.5 border-b border-slate-800/60"
        >
          <span className="text-slate-500 text-right pr-1">
            {row.moveNumber}.
          </span>
          <MoveCell
            sanPly={row.white}
            isActive={currentIndex === row.white.ply + 1}
            t={t}
            onSelect={onSelect}
          />
          {row.black ? (
            <MoveCell
              sanPly={row.black}
              isActive={currentIndex === row.black.ply + 1}
              t={t}
              onSelect={onSelect}
            />
          ) : (
            <span />
          )}
        </div>
      ))}
    </div>
  );
}

function MoveCell({
  sanPly,
  isActive,
  t,
  onSelect,
}: {
  sanPly: {
    san: string;
    ply: number;
    reviewed?: ReviewedMove;
    opening: Opening | null;
    flags: MoveFlags | null;
    isExitTheory: boolean;
  };
  isActive: boolean;
  t: ReturnType<typeof useLanguage>["t"];
  onSelect: (idx: number) => void;
}) {
  const r = sanPly.reviewed;
  const colors = r ? CLASSIFICATION_COLORS[r.classification] : null;
  const isBook = sanPly.opening !== null;
  const flags = sanPly.flags;
  return (
    <button
      type="button"
      onClick={() => onSelect(sanPly.ply + 1)}
      className={`text-left px-1 py-0.5 rounded transition-colors flex items-center gap-1 ${
        isActive
          ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-500/50"
          : "text-slate-200 hover:bg-slate-800/60"
      }`}
    >
      <span>{sanPly.san}</span>
      {isBook && (
        <BookOpen
          className="h-3 w-3 text-amber-300/80 shrink-0"
          aria-label={t.review.opening.bookMove}
        />
      )}
      {sanPly.isExitTheory && (
        <LogOut
          className="h-3 w-3 text-orange-300 shrink-0"
          aria-label={t.review.opening.exitTheoryNow}
        />
      )}
      {flags?.isCheckmate && (
        <Skull
          className="h-3 w-3 text-rose-400 shrink-0"
          aria-label={t.review.flags.checkmate}
        />
      )}
      {flags?.isCheck && !flags?.isCheckmate && (
        <ShieldAlert
          className="h-3 w-3 text-orange-400 shrink-0"
          aria-label={t.review.flags.check}
        />
      )}
      {flags?.isForced && (
        <Lock
          className="h-3 w-3 text-sky-300 shrink-0"
          aria-label={t.review.flags.forced}
        />
      )}
      {colors && (
        <span
          className={`text-[10px] leading-none px-1 rounded ${colors.bg} ${colors.text} ${colors.border} border`}
        >
          {colors.emoji}
        </span>
      )}
    </button>
  );
}

interface MastersExplorerBody {
  white?: number;
  draws?: number;
  black?: number;
  moves?: Array<{
    san?: string;
    uci?: string;
    white?: number;
    draws?: number;
    black?: number;
  }>;
}

function OpeningExplorerPanel({ fen }: { fen: string }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState<MastersExplorerBody | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!expanded || !fen) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const res = await fetch(
          `/api/openings/explorer?fen=${encodeURIComponent(fen)}&pool=masters`
        );
        const json = (await res.json().catch(() => null)) as {
          data?: MastersExplorerBody;
          cached?: boolean;
        } | null;
        if (cancelled) return;
        if (!res.ok || !json?.data) {
          setError(true);
          setBody(null);
          return;
        }
        setBody(json.data);
        setFromCache(Boolean(json.cached));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expanded, fen]);

  return (
    <div className="rounded border border-sky-500/25 bg-sky-950/30 px-2 py-2 text-[11px]">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 w-full text-left font-semibold text-sky-200 hover:text-sky-100"
      >
        <BarChart3 className="h-3.5 w-3.5 shrink-0" />
        {t.review.opening.explorerTitle}
      </button>
      {expanded && loading && (
        <div className="flex items-center gap-2 mt-2 text-sky-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t.review.opening.explorerLoading}
        </div>
      )}
      {expanded && error && (
        <p className="mt-2 text-red-300">{t.review.opening.explorerError}</p>
      )}
      {expanded && body?.moves && body.moves.length > 0 && (
        <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
          {body.moves.slice(0, 10).map((m, i) => (
            <li
              key={`${m.uci ?? m.san}-${i}`}
              className="flex justify-between gap-2 font-mono text-[10px] text-slate-200"
            >
              <span>{m.san ?? m.uci}</span>
              <span className="text-slate-500 shrink-0">
                W{m.white ?? 0} · D{m.draws ?? 0} · B{m.black ?? 0}
              </span>
            </li>
          ))}
        </ul>
      )}
      {expanded && fromCache && !loading && (
        <p className="text-[10px] text-slate-500 mt-1">{t.review.opening.explorerCached}</p>
      )}
    </div>
  );
}

function CurrentMoveDetail({
  move,
  explorerFen,
  fenBefore,
  moveNumber,
  opening,
  previousOpening,
  flags,
  isExitingTheory,
  onRequestUpgrade,
  coachTone,
  theorySnapshot,
}: {
  move?: ReviewedMove;
  /** Position affichée (explorer Lichess : stats depuis cette position). */
  explorerFen: string;
  fenBefore?: string;
  moveNumber?: number;
  opening?: Opening | null;
  previousOpening?: Opening | null;
  flags?: MoveFlags | null;
  isExitingTheory?: boolean;
  onRequestUpgrade?: () => void;
  coachTone: CoachToneId;
  theorySnapshot:
    | {
        opening: Opening;
        matchedPlies: number;
        sans: string[];
        aligned: boolean;
        transpositionHints: string[];
      }
    | null;
}) {
  const { t, lang } = useLanguage();
  if (!move) {
    return (
      <Card className="bg-slate-900/60 border-cyan-500/20">
        <CardContent className="py-3 text-xs text-slate-400">
          {t.review.startPosition}
        </CardContent>
      </Card>
    );
  }
  const colors = CLASSIFICATION_COLORS[move.classification];
  const labels: Record<string, string> = {
    best: t.review.classBest,
    excellent: t.review.classExcellent,
    good: t.review.classGood,
    inaccuracy: t.review.classInaccuracy,
    mistake: t.review.classMistake,
    blunder: t.review.classBlunder,
    miss: t.review.classMiss,
  };
  const isSubOptimal = move.uci !== move.bestMove;
  const showCoach =
    isSubOptimal &&
    !!move.bestMove &&
    !!fenBefore &&
    move.classification !== "best" &&
    move.classification !== "excellent";

  return (
    <Card className={`${colors.bg} ${colors.border} border`}>
      <CardContent className="py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={`${colors.bg} ${colors.text} ${colors.border} border font-bold`}>
              {colors.emoji} {labels[move.classification]}
            </Badge>
            <span className="text-sm font-mono text-slate-100">
              {move.sideToMove === "white" ? "♔" : "♚"} {move.san}
            </span>
          </div>
          <div className="text-right text-xs text-slate-400 space-y-0.5">
            <div>
              {t.review.cpl}:{" "}
              <strong className="text-slate-200">{move.cpl}</strong>
            </div>
            {isSubOptimal && (
              <div className="text-[10px]">
                {t.review.evalSwing}:{" "}
                <span className="font-mono text-slate-300">
                  {Math.abs(move.bestEval - move.playerEval).toFixed(2)}
                </span>{" "}
                {t.review.evalSwingUnit}
              </div>
            )}
          </div>
        </div>
        {opening ? (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1">
            <BookOpen className="h-3 w-3 shrink-0" />
            <span className="font-semibold uppercase tracking-wider text-amber-300/90">
              {t.review.opening.theory}
            </span>
            <span className="text-amber-100">
              {getOpeningName(opening, lang)}
            </span>
            <span className="font-mono text-amber-300/70">({opening.eco})</span>
          </div>
        ) : isExitingTheory && previousOpening ? (
          <div className="flex items-center gap-1.5 text-[11px] text-orange-100 bg-orange-500/15 border border-orange-500/40 rounded px-2 py-1">
            <LogOut className="h-3.5 w-3.5 shrink-0 text-orange-300" />
            <span className="uppercase tracking-wider font-bold text-orange-200">
              {t.review.opening.exitTheoryNow}
            </span>
            <span className="text-orange-200/70">·</span>
            <span className="text-orange-100">
              {getOpeningName(previousOpening, lang)}
            </span>
            <span className="font-mono text-orange-300/80">
              ({previousOpening.eco})
            </span>
          </div>
        ) : null}
        {theorySnapshot && (
          <div className="rounded border border-amber-500/25 bg-amber-950/40 px-2 py-2 space-y-1.5 text-[11px]">
            <div className="font-semibold text-amber-200/95 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              {t.review.opening.theoryMainLine}
            </div>
            <p className="text-amber-100/90">
              {getOpeningName(theorySnapshot.opening, lang)}
              <span className="font-mono text-amber-300/60 ml-1">
                ({theorySnapshot.opening.eco})
              </span>
            </p>
            {!theorySnapshot.aligned && (
              <p className="text-orange-300/95">{t.review.opening.divergedFromBook}</p>
            )}
            <p className="text-slate-300 leading-relaxed break-words font-mono text-[10px]">
              {theorySnapshot.sans.map((san, i) => (
                <span
                  key={`${san}-${i}`}
                  className={
                    i < theorySnapshot.matchedPlies
                      ? "text-amber-100 font-semibold"
                      : "text-slate-500"
                  }
                >
                  {san}
                  {i < theorySnapshot.sans.length - 1 ? " " : ""}
                </span>
              ))}
            </p>
            {theorySnapshot.transpositionHints.length > 0 && (
              <p className="text-slate-400 text-[10px] leading-snug border-t border-amber-500/20 pt-1.5">
                <span className="text-slate-500">{t.review.opening.transpositions}: </span>
                {theorySnapshot.transpositionHints.join(" · ")}
              </p>
            )}
          </div>
        )}
        <OpeningExplorerPanel fen={explorerFen} />
        {(flags?.isCheckmate ||
          flags?.isCheck ||
          flags?.isForced ||
          (typeof move.bestMateInMoves === "number" &&
            move.bestMateInMoves !== 0) ||
          (typeof move.playerMateInMoves === "number" &&
            move.playerMateInMoves !== 0)) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {flags?.isCheckmate && (
              <Badge className="bg-rose-500/15 text-rose-200 border-rose-500/40 border font-bold">
                <Skull className="h-3 w-3 mr-1" />
                {t.review.flags.checkmate}
              </Badge>
            )}
            {flags?.isCheck && !flags?.isCheckmate && (
              <Badge className="bg-orange-500/15 text-orange-200 border-orange-500/40 border font-semibold">
                <ShieldAlert className="h-3 w-3 mr-1" />
                {t.review.flags.check}
              </Badge>
            )}
            {flags?.isForced && (
              <Badge className="bg-sky-500/15 text-sky-200 border-sky-500/40 border font-semibold">
                <Lock className="h-3 w-3 mr-1" />
                {t.review.flags.forced}
              </Badge>
            )}
            {typeof move.bestMateInMoves === "number" &&
              move.bestMateInMoves !== 0 && (
                <Badge className="bg-emerald-500/15 text-emerald-200 border-emerald-500/40 border font-mono">
                  {formatMateBadge(
                    t.review.flags.mateInBest,
                    move.bestMateInMoves,
                    t.review.flags.whiteShort,
                    t.review.flags.blackShort
                  )}
                </Badge>
              )}
            {typeof move.playerMateInMoves === "number" &&
              move.playerMateInMoves !== 0 &&
              move.playerMateInMoves !== move.bestMateInMoves && (
                <Badge className="bg-purple-500/15 text-purple-200 border-purple-500/40 border font-mono">
                  {formatMateBadge(
                    t.review.flags.mateInPlayer,
                    move.playerMateInMoves,
                    t.review.flags.whiteShort,
                    t.review.flags.blackShort
                  )}
                </Badge>
              )}
          </div>
        )}
        <div className="text-xs text-slate-300 space-y-1">
          <div>
            {t.review.evalAfterPlayed}:{" "}
            <span className="font-mono">{formatEval(move.playerEval)}</span>
          </div>
          {isSubOptimal && move.bestMove && (
            <div className="flex items-center gap-1 text-emerald-300">
              <AlertTriangle className="h-3 w-3" />
              <span>
                {t.review.bestWas}{" "}
                <strong className="font-mono">
                  {move.bestSan || move.bestMove}
                </strong>
                {move.bestSan && (
                  <span className="text-[10px] text-emerald-400/60 font-mono ml-1">
                    ({move.bestMove})
                  </span>
                )}{" "}
                ({formatEval(move.bestEval)})
              </span>
            </div>
          )}
        </div>

        {showCoach && (
          <CoachSubCard
            move={move}
            fenBefore={fenBefore!}
            moveNumber={moveNumber}
            lang={lang}
            coachTone={coachTone}
            onRequestUpgrade={onRequestUpgrade}
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Sub-card hosted inside CurrentMoveDetail: shows a "Why?" button that fires
 * an LLM call to /api/coach/explain. Resets when the parent move changes.
 */
function CoachSubCard({
  move,
  fenBefore,
  moveNumber,
  lang,
  coachTone,
  onRequestUpgrade,
}: {
  move: ReviewedMove;
  fenBefore: string;
  moveNumber?: number;
  lang: "fr" | "en";
  coachTone: CoachToneId;
  onRequestUpgrade?: () => void;
}) {
  const { t } = useLanguage();
  const coach = useCoachExplain();

  // Reset whenever the user navigates to a new move.
  useEffect(() => {
    coach.reset();
    // We intentionally key only on move identity (ply + uci), not on the
    // unstable `coach` object reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [move.ply, move.uci]);

  const handleClick = useCallback(() => {
    void coach.explain({ move, fenBefore, lang, moveNumber, coachTone });
  }, [coach, move, fenBefore, lang, moveNumber, coachTone]);

  // Idle state: show the Why? button.
  if (coach.status === "idle") {
    return (
      <div className="pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={handleClick}
          className="border-purple-500/40 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20"
        >
          <MessageCircleQuestion className="h-3.5 w-3.5 mr-1.5" />
          {t.review.coach.whyButton}
        </Button>
      </div>
    );
  }

  if (coach.status === "loading") {
    return (
      <div className="rounded border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs text-purple-200 flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t.review.coach.loading}
      </div>
    );
  }

  if (coach.status === "ready" && coach.explanation) {
    const remaining = coach.remaining;
    const limit = coach.limit;
    return (
      <div className="rounded border border-purple-500/30 bg-purple-500/10 px-3 py-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-purple-200 font-bold">
            <Sparkles className="h-3 w-3" />
            {t.review.coach.title}
          </div>
          {coach.cached && (
            <span className="text-[10px] text-purple-300/70 font-mono">
              {t.review.coach.cached}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-100 leading-relaxed whitespace-pre-wrap">
          {coach.explanation}
        </p>
        <div className="flex items-center justify-between pt-1 border-t border-purple-500/20">
          <span className="text-[10px] text-slate-500 italic">
            {t.review.coach.disclaimer}
          </span>
          {limit !== null && remaining !== null ? (
            <span className="text-[10px] text-purple-300/80 font-mono">
              {t.review.coach.quotaRemaining
                .replace("{remaining}", String(remaining))
                .replace("{limit}", String(limit))}
            </span>
          ) : limit === null ? (
            <span className="text-[10px] text-amber-300/80">
              {t.review.coach.unlimited}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  // Error state.
  const code = coach.error;
  const isQuota = code === "QUOTA_EXCEEDED";
  const isAuth = code === "NOT_AUTHENTICATED";

  let message: string;
  if (isQuota) {
    message = t.review.coach.quotaReached
      .replace("{used}", String(coach.used ?? coach.limit ?? "?"))
      .replace("{limit}", String(coach.limit ?? "?"));
  } else if (isAuth) {
    message = t.review.coach.loginRequired;
  } else if (code === "OPENAI_KEY_MISSING") {
    message = t.review.coach.openaiKeyMissing;
  } else if (code === "SUPABASE_NOT_CONFIGURED") {
    message = t.review.coach.supabaseNotConfigured;
  } else if (code === "OPENAI_ERROR") {
    message = t.review.coach.openaiError;
  } else if (code === "RATE_LIMITED") {
    message = t.review.coach.rateLimited;
  } else if (code === "NETWORK") {
    message = t.review.coach.network;
  } else if (code === "INVALID_BODY") {
    message = t.review.coach.invalidBody;
  } else {
    message = t.review.coach.unavailable;
  }

  return (
    <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 space-y-2">
      <p className="text-xs text-red-200">{message}</p>
      {coach.detail && (
        <p className="text-[10px] text-red-300/70 font-mono break-words">
          {coach.detail}
        </p>
      )}
      <div className="text-[10px] text-red-300/60 font-mono">
        code: {code ?? "UNKNOWN"}
      </div>
      <div className="flex gap-2">
        {isQuota && onRequestUpgrade && (
          <Button
            size="sm"
            onClick={onRequestUpgrade}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold"
          >
            <Crown className="h-3.5 w-3.5 mr-1.5" />
            {t.review.coach.upgradeCta}
          </Button>
        )}
        {!isQuota && !isAuth && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleClick}
            className="border-red-500/40 text-red-200 hover:bg-red-500/10"
          >
            {t.review.coach.retry}
          </Button>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  parsed,
  review,
  status,
}: {
  parsed: ParsedGameForReview;
  review: import("@/lib/game-review").GameReviewResult | null;
  status: ReviewStatus;
}) {
  const { t } = useLanguage();
  const whiteName = parsed.headers.White ?? t.review.white;
  const blackName = parsed.headers.Black ?? t.review.black;
  const result = parsed.headers.Result ?? "*";
  const event = parsed.headers.Event;

  return (
    <Card className="bg-slate-900/60 border-cyan-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wider text-slate-400 font-bold">
          {t.review.summaryTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-200 font-medium truncate">{whiteName}</span>
          <span className="text-cyan-300 font-mono">{result}</span>
          <span className="text-slate-200 font-medium truncate">{blackName}</span>
        </div>
        {event && (
          <div className="text-[11px] text-slate-500 truncate">{event}</div>
        )}

        {review ? (
          <>
            <SideStat
              label={whiteName}
              accuracy={review.white.accuracy}
              avgCpl={review.white.averageCpl}
              counts={review.white.classifications}
            />
            <SideStat
              label={blackName}
              accuracy={review.black.accuracy}
              avgCpl={review.black.averageCpl}
              counts={review.black.classifications}
            />
          </>
        ) : (
          <div className="text-xs text-slate-500">
            {status === "running" ? t.review.computing : t.review.notYetAvailable}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SideStat({
  label,
  accuracy,
  avgCpl,
  counts,
}: {
  label: string;
  accuracy: number;
  avgCpl: number;
  counts: import("@/lib/analysis-engine").GameAccuracyResult["classifications"];
}) {
  const { t } = useLanguage();
  const items: Array<{ key: keyof typeof counts; label: string }> = [
    { key: "best", label: t.review.classBest },
    { key: "excellent", label: t.review.classExcellent },
    { key: "good", label: t.review.classGood },
    { key: "inaccuracy", label: t.review.classInaccuracy },
    { key: "mistake", label: t.review.classMistake },
    { key: "blunder", label: t.review.classBlunder },
    { key: "miss", label: t.review.classMiss },
  ];
  return (
    <div className="rounded border border-slate-800 bg-slate-950/40 p-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-300 truncate">{label}</span>
        <div className="flex items-center gap-2 text-xs">
          <span>
            <span className="text-slate-400">{t.review.accuracy}:</span>{" "}
            <strong className="text-cyan-300">{accuracy.toFixed(1)}%</strong>
          </span>
          <span>
            <span className="text-slate-400">CPL:</span>{" "}
            <strong className="text-slate-200">{avgCpl}</strong>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {items.map((it) => {
          const c = CLASSIFICATION_COLORS[it.key];
          const n = counts[it.key];
          return (
            <div
              key={it.key}
              title={`${it.label}: ${n}`}
              className={`text-center text-[10px] py-0.5 rounded border ${c.bg} ${c.text} ${c.border}`}
            >
              {n}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KeyMomentsCard({
  count,
  onPrev,
  onNext,
  disabled,
}: {
  count: number;
  onPrev: () => void;
  onNext: () => void;
  disabled: boolean;
}) {
  const { t } = useLanguage();
  return (
    <Card className="bg-slate-900/60 border-amber-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wider text-amber-300 font-bold">
          {t.review.keyMomentsTitle}{" "}
          <span className="text-slate-400 font-normal">({count})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onPrev}
          disabled={disabled}
          className="flex-1 border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t.review.prev}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onNext}
          disabled={disabled}
          className="flex-1 border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
        >
          {t.review.next}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function formatEval(pawns: number): string {
  const v = clamp(pawns, -99, 99);
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
}

/**
 * Render the localized "Mate in N (side)" badge text.
 * `mateInMovesWhitePov` is signed: > 0 => white mates, < 0 => black mates.
 */
function formatMateBadge(
  template: string,
  mateInMovesWhitePov: number,
  whiteLabel: string,
  blackLabel: string
): string {
  const n = Math.abs(mateInMovesWhitePov);
  const side = mateInMovesWhitePov > 0 ? whiteLabel : blackLabel;
  return template.replace("{n}", String(n)).replace("{side}", side);
}
