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
} from "lucide-react";
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
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { ScrollArea } from "./ui/scroll-area";
import { useGameReview, type ReviewStatus } from "@/hooks/useGameReview";
import {
  CLASSIFICATION_COLORS,
  hashPgn,
  parsePgnForReview,
  uciToSan,
  uciToSquares,
  type GameReviewResult,
  type ParsedGameForReview,
  type ReviewedMove,
} from "@/lib/game-review";
import { loadCachedReview, saveReview } from "@/lib/game-review-storage";
import { useLanguage } from "@/lib/language-context";
import { useCoachExplain } from "@/hooks/useCoachExplain";

interface GameReviewerProps {
  pgn: string;
  /** Search depth used per position. */
  depth: number;
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
  depth,
  maxPlies,
  showAllBestArrows,
  cacheUserId,
  onRequestUpgrade,
}: GameReviewerProps) {
  const { t } = useLanguage();

  const parsed = useMemo<ParsedGameForReview | null>(
    () => parsePgnForReview(pgn),
    [pgn]
  );

  const [cachedResult, setCachedResult] = useState<GameReviewResult | null>(null);
  const [cacheChecked, setCacheChecked] = useState(false);

  const pgnHash = useMemo(() => hashPgn(pgn), [pgn]);

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
        depth,
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
  }, [cacheUserId, pgnHash, depth, parsed]);

  // Skip live analysis if we already have a cached result.
  const review = useGameReview({
    parsed: cachedResult ? null : parsed,
    depth,
    maxPlies,
  });

  // Persist completed reviews to the cache.
  useEffect(() => {
    if (!cacheUserId) return;
    if (review.status !== "done" || !review.result) return;
    void saveReview({
      userId: cacheUserId,
      pgnHash,
      depth,
      result: review.result,
    });
  }, [cacheUserId, pgnHash, depth, review.status, review.result]);

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

  // Auto-start the review as soon as the engine is ready (skip if cache hit).
  useEffect(() => {
    if (!parsed || cachedResult || !cacheChecked) return;
    if (review.status === "idle" && review.engineReady) {
      review.start();
    }
  }, [parsed, cachedResult, cacheChecked, review]);

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

  return (
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
                onSelect={(idx) => setCurrentIndex(idx)}
              />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* CENTER — Board + Eval + Controls + per-move detail */}
      <div className="lg:col-span-6 order-1 lg:order-2 space-y-3">
        <ProgressHeader
          status={effectiveStatus}
          progress={effectiveProgress}
          total={effectiveTotal}
          onCancel={review.cancel}
        />

        <EvaluationBar evaluation={evalForBar} playerColor={orientation} />

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
          fenBefore={
            currentIndex > 0 ? parsed.fenBefore[currentIndex - 1] : undefined
          }
          moveNumber={
            currentIndex > 0 ? Math.floor((currentIndex - 1) / 2) + 1 : undefined
          }
          onRequestUpgrade={onRequestUpgrade}
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
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressHeader({
  status,
  progress,
  total,
  onCancel,
}: {
  status: ReviewStatus;
  progress: number;
  total: number;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  if (status === "idle" || status === "engine-loading") {
    return (
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
        {t.review.engineLoading}
      </div>
    );
  }
  if (status === "running") {
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
  if (status === "cancelled") {
    return (
      <div className="text-xs text-yellow-300">{t.review.cancelled}</div>
    );
  }
  if (status === "error") {
    return <div className="text-xs text-red-300">{t.review.error}</div>;
  }
  return (
    <div className="text-xs text-emerald-300 flex items-center gap-2">
      <Crown className="h-3 w-3" /> {t.review.done}
    </div>
  );
}

function MovesList({
  parsed,
  moves,
  currentIndex,
  onSelect,
}: {
  parsed: ParsedGameForReview;
  moves: ReviewedMove[];
  currentIndex: number;
  onSelect: (idx: number) => void;
}) {
  const rows: Array<{
    moveNumber: number;
    white: { san: string; ply: number; reviewed?: ReviewedMove };
    black?: { san: string; ply: number; reviewed?: ReviewedMove };
  }> = [];

  for (let i = 0; i < parsed.san.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteSan = parsed.san[i];
    const blackSan = parsed.san[i + 1];
    rows.push({
      moveNumber,
      white: { san: whiteSan, ply: i, reviewed: moves[i] },
      black: blackSan
        ? { san: blackSan, ply: i + 1, reviewed: moves[i + 1] }
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
            onSelect={onSelect}
          />
          {row.black ? (
            <MoveCell
              sanPly={row.black}
              isActive={currentIndex === row.black.ply + 1}
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
  onSelect,
}: {
  sanPly: { san: string; ply: number; reviewed?: ReviewedMove };
  isActive: boolean;
  onSelect: (idx: number) => void;
}) {
  const r = sanPly.reviewed;
  const colors = r ? CLASSIFICATION_COLORS[r.classification] : null;
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

function CurrentMoveDetail({
  move,
  fenBefore,
  moveNumber,
  onRequestUpgrade,
}: {
  move?: ReviewedMove;
  fenBefore?: string;
  moveNumber?: number;
  onRequestUpgrade?: () => void;
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
          <span className="text-xs text-slate-400">
            {t.review.cpl}: <strong className="text-slate-200">{move.cpl}</strong>
          </span>
        </div>
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
  onRequestUpgrade,
}: {
  move: ReviewedMove;
  fenBefore: string;
  moveNumber?: number;
  lang: "fr" | "en";
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
    void coach.explain({ move, fenBefore, lang, moveNumber });
  }, [coach, move, fenBefore, lang, moveNumber]);

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
