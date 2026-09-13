"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RotateCw,
  Square,
  Crown,
  Download,
  Pause,
  Play,
  Loader2,
  BookOpen,
  ShieldAlert,
  Skull,
  Lock,
  LogOut,
  Check,
  Save,
} from "lucide-react";
import { Chess, type Move } from "chess.js";
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
import PositionTopLines from "./PositionTopLines";
import { usePositionTopLines } from "@/hooks/usePositionTopLines";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
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
import { reviewMainBoardArrows } from "@/lib/review-board-arrows";
import {
  type AnalysisStrictnessId,
  DEFAULT_ANALYSIS_STRICTNESS,
} from "@/lib/analysis-profiles";
import { type CoachToneId } from "@/lib/coach-tone";
import { loadCachedReview, saveReview } from "@/lib/game-review-storage";
import { useLanguage } from "@/lib/language-context";
import { getOpeningName, type Opening } from "@/lib/openings-library";
import {
  findBestOpeningByPrefix,
  findCompletedOpening,
} from "@/lib/openings-registry";
import { buildVerboseHistoryFromSan } from "@/lib/move-history-verbose";
import SanNotation from "@/components/SanNotation";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import type { EngineConfig } from "@/lib/analysis";
import { toast } from "sonner";
import { saveGameToCloud } from "@/lib/supabase-storage";
import {
  tryBuildCloudSavePayloadFromPgn,
  inferSavePlayerNameFromContext,
  parsePgnFileForGames,
  playerNamesFromPgnHeaders,
} from "@/lib/pgn-import";
import {
  buildAnnotatedPgn,
  sanitizeForPgnFilenameSegment,
} from "@/lib/pgn-annotated-export";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  ReviewCoachProvider,
  ReviewCoachSidebar,
  ReviewCoachChat,
} from "@/components/ReviewCoachPanel";
import ReviewDisplayToggles from "@/components/ReviewDisplayToggles";
import ReviewAnalysisControls from "@/components/ReviewAnalysisControls";
import { inferReviewPlayerColor, type ReviewPlayerColor } from "@/lib/review-coach-context";
import {
  DEFAULT_REVIEW_UI_PREFS,
  readReviewUiPrefs,
  writeReviewUiPrefs,
  type ReviewUiPrefKey,
  type ReviewUiPrefs,
} from "@/lib/review-ui-prefs";

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
  /** Opponent bot from Play — offered as an optional review coach. */
  opponentCoachConfig?: EngineConfig | null;
  /** Affiche un indicateur "déjà sauvegardée" à côté du téléchargement annoté. */
  showSavedInGamesList?: boolean;
  /** Utilisateur connecté : permet d’enregistrer le PGN dans la table cloud `games`. */
  authUserId?: string | null;
  /** Préremplit le pseudo pour matcher [White]/[Black] lors de l’enregistrement. */
  reviewCloudSavePlayerHint?: string | null;
  /**
   * Aide à déduire le pseudo sans saisie : couleur du compte pour une partie déjà en base,
   * et/ou partie locale de l’e‑mail si elle correspond à un en-tête du PGN.
   */
  cloudSaveContext?: {
    playerColor?: "white" | "black";
    emailLocalPart?: string | null;
  } | null;
  /** Après enregistrement réussi dans `games`. */
  onSavedToGamesCloud?: () => void;
}

export default function GameReviewer({
  pgn,
  isPremium,
  maxPlies,
  showAllBestArrows,
  cacheUserId,
  onRequestUpgrade,
  opponentCoachConfig = null,
  showSavedInGamesList = false,
  authUserId = null,
  reviewCloudSavePlayerHint = null,
  cloudSaveContext = null,
  onSavedToGamesCloud,
}: GameReviewerProps) {
  const { t, lang } = useLanguage();

  const [analysisStrictness, setAnalysisStrictness] =
    useState<AnalysisStrictnessId>(readStoredStrictness);
  const [premiumDepth, setPremiumDepth] = useState(readStoredPremiumDepth);
  const [coachTone, setCoachTone] = useState<CoachToneId>(readStoredCoachTone);
  const [uiPrefs, setUiPrefs] = useState<ReviewUiPrefs>(DEFAULT_REVIEW_UI_PREFS);
  const [savePlayerName, setSavePlayerName] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);

  const toggleUiPref = useCallback((key: ReviewUiPrefKey) => {
    setUiPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      writeReviewUiPrefs(next);
      return next;
    });
  }, []);

  useEffect(() => {
    setUiPrefs(readReviewUiPrefs());
  }, []);

  const engineDepth = isPremium ? premiumDepth : FREE_ENGINE_DEPTH;

  const inferredPlayerColor = useMemo(
    () =>
      inferReviewPlayerColor({
        pgn,
        hint: savePlayerName || reviewCloudSavePlayerHint,
        playerColor: cloudSaveContext?.playerColor ?? null,
        emailLocalPart: cloudSaveContext?.emailLocalPart ?? null,
      }),
    [
      pgn,
      savePlayerName,
      reviewCloudSavePlayerHint,
      cloudSaveContext?.playerColor,
      cloudSaveContext?.emailLocalPart,
    ]
  );
  const [playerColorOverride, setPlayerColorOverride] =
    useState<ReviewPlayerColor | null>(null);
  const reviewPlayerColor = playerColorOverride ?? inferredPlayerColor;

  const parsed = useMemo<ParsedGameForReview | null>(
    () => parsePgnForReview(pgn),
    [pgn]
  );

  const savePlayerOptions = useMemo(
    () => playerNamesFromPgnHeaders(parsed?.headers ?? {}),
    [parsed?.headers]
  );

  useEffect(() => {
    const inferred = inferSavePlayerNameFromContext({
      pgn,
      hint: reviewCloudSavePlayerHint,
      playerColor: cloudSaveContext?.playerColor ?? null,
      emailLocalPart: cloudSaveContext?.emailLocalPart ?? null,
    });
    let chosen = inferred ?? "";
    if (!chosen && authUserId) {
      try {
        const stored = localStorage
          .getItem(`chess-avatar.games.savePlayerName.${authUserId}`)
          ?.trim();
        if (stored) {
          const { games } = parsePgnFileForGames(pgn, stored);
          if (games.length > 0) chosen = stored;
        }
      } catch {
        // ignore
      }
    }
    if (savePlayerOptions.length > 0) {
      const norm = chosen.trim().toLowerCase();
      const match = norm
        ? savePlayerOptions.find((o) => o.toLowerCase() === norm)
        : undefined;
      chosen = match ?? "";
    }
    setSavePlayerName(chosen);
  }, [
    pgn,
    reviewCloudSavePlayerHint,
    authUserId,
    cloudSaveContext?.playerColor,
    cloudSaveContext?.emailLocalPart,
    savePlayerOptions,
  ]);

  const [cachedResult, setCachedResult] = useState<GameReviewResult | null>(null);
  const [cacheChecked, setCacheChecked] = useState(false);
  const [pendingRestart, setPendingRestart] = useState(false);

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

  const handleRelaunchAnalysis = useCallback(() => {
    try {
      cancelReview();
    } catch {
      /* best-effort */
    }
    setCachedResult(null);
    resetReview();
    setPendingRestart(true);
  }, [cancelReview, resetReview]);

  useEffect(() => {
    if (!pendingRestart) return;
    if (cachedResult) return;
    if (review.status !== "idle") return;
    if (!review.engineReady) return;
    review.start();
    setPendingRestart(false);
  }, [
    pendingRestart,
    cachedResult,
    review.status,
    review.engineReady,
    review.start,
  ]);

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

  const handleSaveGameToCloud = useCallback(async () => {
    if (!authUserId) {
      toast.error(t.review.saveToCloudNeedLogin);
      return;
    }
    if (!isSupabaseConfigured) {
      toast.error(t.review.saveToCloudSupabase);
      return;
    }
    const name =
      savePlayerName.trim() ||
      inferSavePlayerNameFromContext({
        pgn,
        hint: reviewCloudSavePlayerHint,
        playerColor: cloudSaveContext?.playerColor ?? null,
        emailLocalPart: cloudSaveContext?.emailLocalPart ?? null,
      })?.trim() ||
      "";
    if (!name) {
      toast.error(t.review.saveToCloudNeedName);
      return;
    }
    const payload = tryBuildCloudSavePayloadFromPgn(pgn, name);
    if (!payload) {
      toast.error(t.review.saveToCloudNoMatch);
      return;
    }
    setSaveBusy(true);
    try {
      const row = await saveGameToCloud(payload);
      if (!row) {
        toast.error(t.review.saveToCloudNeedLogin);
        return;
      }
      toast.success(t.review.saveToCloudSuccess);
      try {
        if (authUserId) {
          localStorage.setItem(
            `chess-avatar.games.savePlayerName.${authUserId}`,
            name
          );
        }
      } catch {
        // ignore
      }
      onSavedToGamesCloud?.();
    } catch {
      toast.error(t.review.saveToCloudFailed);
    } finally {
      setSaveBusy(false);
    }
  }, [
    authUserId,
    onSavedToGamesCloud,
    pgn,
    savePlayerName,
    cloudSaveContext?.playerColor,
    cloudSaveContext?.emailLocalPart,
    reviewCloudSavePlayerHint,
    t.review.saveToCloudFailed,
    t.review.saveToCloudNeedLogin,
    t.review.saveToCloudNeedName,
    t.review.saveToCloudNoMatch,
    t.review.saveToCloudSuccess,
    t.review.saveToCloudSupabase,
  ]);

  const totalPlies = parsed?.san.length ?? 0;
  const [orientation, setOrientation] = useState<"white" | "black">(
    inferredPlayerColor ?? "white"
  );
  const [currentIndex, setCurrentIndex] = useState(0); // 0 = initial position; 1..N after move N
  const [autoPlay, setAutoPlay] = useState(false);

  // Reset board when the game changes.
  useEffect(() => {
    setCurrentIndex(0);
    setAutoPlay(false);
    setPlayerColorOverride(null);
  }, [pgn]);

  useEffect(() => {
    if (playerColorOverride) return;
    setOrientation(inferredPlayerColor ?? "white");
  }, [pgn, inferredPlayerColor, playerColorOverride]);

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

  const displayedOpening = useMemo(() => {
    if (!parsed || currentIndex <= 0) return null;
    return findCompletedOpening(parsed.uci.slice(0, currentIndex));
  }, [parsed, currentIndex]);

  const verboseMainline = useMemo(
    () => (parsed ? buildVerboseHistoryFromSan(parsed.san) : null),
    [parsed]
  );

  const displayedFen = useMemo(() => {
    if (!parsed) return null;
    if (currentIndex === 0) return parsed.fenBefore[0] ?? null;
    return (
      parsed.fenAfter[Math.min(currentIndex, parsed.fenAfter.length) - 1] ?? null
    );
  }, [parsed, currentIndex]);

  const topLines = usePositionTopLines({
    fen: displayedFen,
    blocked: effectiveStatus === "running" || effectiveStatus === "engine-loading",
  });

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

  const goPrev = useCallback(
    () => setCurrentIndex((i) => Math.max(0, i - 1)),
    []
  );
  const goNext = useCallback(
    () => setCurrentIndex((i) => Math.min(i + 1, totalPlies)),
    [totalPlies]
  );
  const goStart = useCallback(() => setCurrentIndex(0), []);
  const goEnd = useCallback(
    () => setCurrentIndex(totalPlies),
    [totalPlies]
  );
  const flipBoard = useCallback(
    () => setOrientation((o) => (o === "white" ? "black" : "white")),
    []
  );

  // Keyboard navigation: ArrowLeft/ArrowRight to step, Home/End to jump.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      if (e.key === "Home") { e.preventDefault(); goStart(); }
      if (e.key === "End") { e.preventDefault(); goEnd(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext, goStart, goEnd]);

  const handleDownloadAnnotated = useCallback(() => {
    if (!parsed) {
      toast.error(t.review.downloadAnnotatedFailed);
      return;
    }
    try {
      const annotated = buildAnnotatedPgn(parsed, effectiveMoves ?? []);
      const white = sanitizeForPgnFilenameSegment(parsed.headers.White ?? "White");
      const black = sanitizeForPgnFilenameSegment(parsed.headers.Black ?? "Black");
      const date = sanitizeForPgnFilenameSegment(
        (parsed.headers.Date ?? new Date().toISOString().slice(0, 10)).replace(/\./g, "-")
      );
      const filename = `${white}_vs_${black}_${date}_annotated.pgn`;
      const blob = new Blob([annotated], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch {
      toast.error(t.review.downloadAnnotatedFailed);
    }
  }, [parsed, effectiveMoves, t.review.downloadAnnotatedFailed]);

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

  const isCriticalBest =
    currentMove?.classification === "blunder" ||
    currentMove?.classification === "miss";
  const showBestArrow = Boolean(
    currentMove &&
      currentMove.bestMove &&
      currentMove.uci !== currentMove.bestMove &&
      (showAllBestArrows || isCriticalBest)
  );
  const arrows = reviewMainBoardArrows({
    fen: currentFen,
    lastMoveUci: currentIndex > 0 ? parsed.uci[currentIndex - 1] : null,
    previousMoveUci: currentIndex > 1 ? parsed.uci[currentIndex - 2] : null,
    bestMoveUci: showBestArrow ? currentMove?.bestMove : null,
    showBest: showBestArrow,
    bestIsCritical: isCriticalBest,
  });

  const plyEval =
    currentIndex > 0
      ? (effectiveMoves[currentIndex - 1]?.playerEval ?? null)
      : null;
  const plyMate =
    currentIndex > 0
      ? effectiveMoves[currentIndex - 1]?.playerMateInMoves
      : undefined;
  const liveEval = topLines.liveEval;
  const preferPlyEval = topLines.paused && plyEval != null;
  const evalForBar = preferPlyEval
    ? plyEval
    : (liveEval?.evalWhitePov ?? plyEval);
  const evalMateInMoves = preferPlyEval
    ? plyMate
    : (liveEval?.mateInMovesWhite ?? plyMate);
  const evalIsMate = preferPlyEval
    ? typeof evalMateInMoves === "number" && evalMateInMoves !== 0
    : Boolean(liveEval?.isMate) ||
      (typeof evalMateInMoves === "number" && evalMateInMoves !== 0);

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
    <ReviewCoachProvider
      opponentConfig={opponentCoachConfig}
      currentMove={currentMove}
      fen={currentFen}
      fenBefore={
        currentIndex > 0 ? parsed.fenBefore[currentIndex - 1] : undefined
      }
      lastMoveSan={currentIndex > 0 ? parsed.san[currentIndex - 1] : undefined}
      lastMoveUci={currentIndex > 0 ? parsed.uci[currentIndex - 1] : undefined}
      lastMoveSide={
        currentIndex > 0 ? parsed.sideToMove[currentIndex - 1] : undefined
      }
      engineLinesNow={topLines.lines.length > 0 ? topLines.lines : undefined}
      moveNumber={
        currentIndex > 0 ? Math.floor((currentIndex - 1) / 2) + 1 : undefined
      }
      openingName={
        displayedOpening ? getOpeningName(displayedOpening, lang) : undefined
      }
      whiteName={parsed.headers.White}
      blackName={parsed.headers.Black}
      playerColor={reviewPlayerColor}
      onPlayerColorChange={(color) => {
        setPlayerColorOverride(color);
        setOrientation(color);
      }}
      coachTone={coachTone}
      orientation={orientation}
      onRequestUpgrade={onRequestUpgrade}
      autoExplain={
        effectiveStatus !== "running" && effectiveStatus !== "engine-loading"
      }
      sessionKey={pgnHash}
    >
    <div className="min-h-0 flex flex-col gap-1.5 lg:h-full lg:overflow-hidden">
      <div className={cn(
        "grid grid-cols-1 gap-2 lg:flex-1 lg:min-h-0 lg:overflow-hidden",
        uiPrefs.moves
          ? "lg:grid-cols-[minmax(12rem,0.85fr)_minmax(20rem,1.65fr)_minmax(22rem,1.5fr)]"
          : "lg:grid-cols-[minmax(22rem,1.7fr)_minmax(24rem,1.5fr)]"
      )}>
      {/* LEFT — Move list */}
      {uiPrefs.moves ? (
      <div className="order-3 lg:order-1 lg:min-h-0 lg:h-full">
        <Card className="bg-slate-900/60 border-cyan-500/20 h-full flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="pb-1 py-2 shrink-0">
            <div className="flex items-baseline justify-between gap-2 min-w-0">
              <CardTitle className="text-xs uppercase tracking-wider text-slate-400 font-bold shrink-0">
                {t.review.movesTitle}
              </CardTitle>
              {displayedOpening ? (
                <span
                  className="truncate text-[11px] font-medium text-cyan-300/90"
                  title={`${getOpeningName(displayedOpening, lang)} (${displayedOpening.eco})`}
                >
                  {getOpeningName(displayedOpening, lang)}
                  <span className="text-slate-500 font-normal">
                    {" "}
                    {displayedOpening.eco}
                  </span>
                </span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-2 pt-0 flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-[40vh] lg:h-full pr-2">
              <MovesList
                parsed={parsed}
                moves={effectiveMoves}
                verboseMainline={verboseMainline}
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
      ) : null}

      {/* CENTER — Board + move detail */}
      <div className="order-1 lg:order-2 flex flex-col gap-1.5 lg:min-h-0 lg:h-full lg:overflow-hidden">
        <EvaluationBar
          evaluation={evalForBar}
          compact
          isMate={evalIsMate}
          mateInMoves={
            evalIsMate && typeof evalMateInMoves === "number"
              ? evalMateInMoves
              : undefined
          }
        />
        <PositionTopLines
          fen={displayedFen}
          engineReady={topLines.engineReady}
          isAnalyzing={topLines.isAnalyzing}
          paused={topLines.paused}
          gameOver={topLines.gameOver}
          lines={topLines.lines}
          depth={topLines.depth}
          targetDepth={topLines.targetDepth}
        />

        <div className="flex-1 min-h-[min(70vw,48vh)] lg:min-h-0 w-full [container-type:size] flex items-center justify-center">
          <SimpleChessboard
            position={currentFen}
            orientation={orientation}
            lastMove={lastMoveSquares}
            arrows={arrows}
            boardMaxWidth="min(100cqw, 100cqh)"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={flipBoard}
            className="h-8 px-2 border-purple-500/40 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20"
            title={t.review.flipBoard}
          >
            <RotateCw className="h-3.5 w-3.5 mr-1" />
            {t.review.flipShort}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={goStart}
            className="h-8 px-2 hover:bg-slate-800"
            title={t.review.start}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="h-8 px-2"
            title={t.review.prev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center text-[11px] font-mono text-slate-300 px-2 py-1 bg-slate-900 rounded min-w-[4.5rem]">
            <span className="text-cyan-400 font-bold">{currentIndex}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span>{totalPlies}</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={goNext}
            disabled={currentIndex >= totalPlies}
            className="h-8 px-2"
            title={t.review.next}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={goEnd}
            disabled={currentIndex >= totalPlies}
            className="h-8 px-2 hover:bg-slate-800"
            title={t.review.end}
          >
            {t.review.end}
          </Button>
          <Button
            size="sm"
            variant={autoPlay ? "destructive" : "default"}
            onClick={() => setAutoPlay((p) => !p)}
            disabled={
              effectiveStatus === "running" || effectiveMoves.length === 0
            }
            className={`h-8 px-2 ${!autoPlay ? "bg-green-600 hover:bg-green-500" : ""}`}
            title={autoPlay ? t.review.pause : t.review.playAuto}
          >
            {autoPlay ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* RIGHT — compact digest + chat as the main panel */}
      <div className="order-2 lg:order-3 flex flex-col gap-1.5 lg:min-h-0 lg:h-full lg:overflow-hidden">
        {(effectiveStatus === "done" || uiPrefs.summary || uiPrefs.keyMoments) ? (
        <div className="shrink-0 space-y-1">
          {effectiveStatus === "done" && (
            <Card className="bg-slate-950/70 border-slate-700/80">
              <CardContent className="py-1.5 px-2">
                <div className="flex gap-1.5 items-center">
                  <Save className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  {!authUserId ? (
                    <p className="text-[11px] text-amber-200/90 truncate">
                      {t.review.saveToCloudNeedLogin}
                    </p>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        {savePlayerOptions.length > 0 ? (
                          <select
                            id="review-save-player-select"
                            value={savePlayerName}
                            onChange={(e) => setSavePlayerName(e.target.value)}
                            disabled={saveBusy}
                            className="flex h-7 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200"
                          >
                            <option value="">
                              {t.review.saveToCloudSelectPlaceholder}
                            </option>
                            {savePlayerOptions.map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            id="review-save-player-select"
                            value={savePlayerName}
                            onChange={(e) => setSavePlayerName(e.target.value)}
                            placeholder={t.review.saveToCloudPlaceholder}
                            className="h-7 bg-slate-900 border-slate-700 text-slate-100 text-xs"
                            autoComplete="off"
                          />
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={saveBusy}
                        onClick={() => void handleSaveGameToCloud()}
                        className="h-7 bg-cyan-700 hover:bg-cyan-600 text-white shrink-0 px-2"
                      >
                        {saveBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {uiPrefs.summary ? (
          <SummaryCard
            parsed={parsed}
            review={effectiveResult}
            status={effectiveStatus}
            compact
          />
          ) : null}
          {uiPrefs.keyMoments ? (
          <KeyMomentsCard
            count={effectiveResult?.keyMoments.length ?? 0}
            onPrev={() => goToKeyMoment(-1)}
            onNext={() => goToKeyMoment(1)}
            disabled={!effectiveResult || effectiveResult.keyMoments.length === 0}
            compact
          />
          ) : null}
        </div>
        ) : null}
        <div className="shrink-0">
          <ReviewCoachSidebar showAnalysis={uiPrefs.coachAnalysis} />
        </div>
        <div className="flex-1 min-h-[16rem] lg:min-h-0 flex flex-col">
          <ReviewCoachChat
            toolbar={
              <div className="flex flex-wrap items-center justify-end gap-1">
                <ReviewAnalysisControls
                  analysisStrictness={analysisStrictness}
                  onStrictnessChange={handleStrictnessChange}
                  isPremium={isPremium}
                  premiumDepth={premiumDepth}
                  onPremiumDepthChange={handlePremiumDepthChange}
                  freeDepth={FREE_ENGINE_DEPTH}
                  premiumDepthOptions={PREMIUM_DEPTH_OPTIONS}
                  coachTone={coachTone}
                  onCoachToneChange={handleCoachToneChange}
                />
                <ReviewDisplayToggles prefs={uiPrefs} onToggle={toggleUiPref} />
                <ProgressHeader
                  compact
                  effectiveStatus={effectiveStatus}
                  reviewStatus={review.status}
                  cacheChecked={cacheChecked}
                  hasCachedResult={!!cachedResult}
                  engineReady={review.engineReady}
                  progress={effectiveProgress}
                  total={effectiveTotal}
                  onCancel={review.cancel}
                  onStartAnalysis={() => review.start()}
                  onRelaunch={handleRelaunchAnalysis}
                  onDownloadAnnotated={handleDownloadAnnotated}
                  showSavedInGamesList={showSavedInGamesList}
                />
              </div>
            }
          />
        </div>
        {uiPrefs.evalGraph && evalSeries.length > 1 && (
          <Card className="bg-slate-900/60 border-cyan-500/20 shrink-0">
            <CardHeader className="py-1 pb-0">
              <CardTitle className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                {t.review.evalGraph}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-14 pb-1.5 pt-0">
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
      </div>
    </div>
    </ReviewCoachProvider>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressHeader({
  compact = false,
  effectiveStatus,
  reviewStatus,
  cacheChecked,
  hasCachedResult,
  engineReady,
  progress,
  total,
  onCancel,
  onStartAnalysis,
  onRelaunch,
  onDownloadAnnotated,
  showSavedInGamesList,
}: {
  compact?: boolean;
  effectiveStatus: ReviewStatus;
  reviewStatus: ReviewStatus;
  cacheChecked: boolean;
  hasCachedResult: boolean;
  engineReady: boolean;
  progress: number;
  total: number;
  onCancel: () => void;
  onStartAnalysis: () => void;
  onRelaunch: () => void;
  onDownloadAnnotated: () => void;
  showSavedInGamesList: boolean;
}) {
  const { t } = useLanguage();
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  if (effectiveStatus === "error") {
    return <div className="text-xs text-red-300">{t.review.error}</div>;
  }

  if (effectiveStatus === "done") {
    return (
      <div className={cn("flex items-center gap-1 shrink-0", !compact && "flex-wrap justify-between gap-2 w-full")}>
        {!compact ? (
          <div className="text-xs text-emerald-300 flex items-center gap-2 shrink-0">
            <Crown className="h-3 w-3" /> {t.review.done}
          </div>
        ) : (
          <span className="text-[11px] text-emerald-300 flex items-center gap-1 shrink-0">
            <Crown className="h-3 w-3" />
          </span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/10"
            onClick={onDownloadAnnotated}
            title={t.review.downloadAnnotated}
          >
            <Download className="h-3 w-3" />
            {compact ? null : <span className="ml-1">{t.review.downloadAnnotated}</span>}
          </Button>
          {showSavedInGamesList && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10"
              title={t.review.savedInGamesList}
              disabled
            >
              <Check className="h-3 w-3" />
              {compact ? null : <span className="ml-1">{t.review.savedInGamesList}</span>}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/10"
            onClick={onRelaunch}
            title={t.review.relaunch}
          >
            <RotateCcw className="h-3 w-3" />
            {compact ? null : <span className="ml-1">{t.review.relaunch}</span>}
          </Button>
        </div>
      </div>
    );
  }

  if (!cacheChecked) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
        {compact ? null : t.review.engineLoading}
      </div>
    );
  }

  if (!hasCachedResult) {
    if (reviewStatus === "running") {
      return (
        <div className={cn("flex items-center gap-2", compact ? "min-w-[9rem]" : "w-full flex-col space-y-1")}>
          {!compact ? (
            <div className="flex items-center justify-between text-xs text-slate-300 w-full">
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
          ) : (
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {pct}%
            </span>
          )}
          <Progress value={pct} className={cn("h-1.5", compact ? "w-16" : "w-full")} />
          {compact ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-300 hover:text-red-100 hover:bg-red-500/10"
              onClick={onCancel}
              title={t.review.stop}
            >
              <Square className="h-3 w-3" />
            </Button>
          ) : null}
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
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            {compact ? null : t.review.engineLoading}
          </div>
        );
      }
      if (reviewStatus === "idle") {
        return (
          <Button
            size="sm"
            className="h-7 bg-cyan-600 hover:bg-cyan-500 text-white px-2"
            onClick={onStartAnalysis}
          >
            <Play className="h-3.5 w-3.5 mr-1" />
            {t.review.startAnalysis}
          </Button>
        );
      }
      return (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
          {compact ? null : t.review.engineLoading}
        </div>
      );
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
      {compact ? null : t.review.engineLoading}
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
  verboseMainline,
  currentIndex,
  openingByPly,
  moveFlagsByPly,
  exitTheoryPly,
  onSelect,
}: {
  parsed: ParsedGameForReview;
  moves: ReviewedMove[];
  verboseMainline: ReturnType<typeof buildVerboseHistoryFromSan>;
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
            verboseMove={verboseMainline?.[row.white.ply] ?? null}
            isActive={currentIndex === row.white.ply + 1}
            t={t}
            onSelect={onSelect}
          />
          {row.black ? (
            <MoveCell
              sanPly={row.black}
              verboseMove={verboseMainline?.[row.black.ply] ?? null}
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
  verboseMove,
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
  verboseMove: Move | null;
  isActive: boolean;
  t: ReturnType<typeof useLanguage>["t"];
  onSelect: (idx: number) => void;
}) {
  const { settings } = useChessboardSettings();
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
      <SanNotation
        verboseMove={verboseMove}
        fallbackSan={sanPly.san}
        movingColor={sanPly.ply % 2 === 0 ? "w" : "b"}
        pieceSet={settings.pieceSet}
        size="sm"
      />
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

function SummaryCard({
  parsed,
  review,
  status,
  compact = false,
}: {
  parsed: ParsedGameForReview;
  review: import("@/lib/game-review").GameReviewResult | null;
  status: ReviewStatus;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const whiteName = parsed.headers.White ?? t.review.white;
  const blackName = parsed.headers.Black ?? t.review.black;
  const result = parsed.headers.Result ?? "*";
  const event = parsed.headers.Event;

  if (compact) {
    return (
      <Card className="bg-slate-900/60 border-cyan-500/20">
        <CardContent className="py-1.5 px-2 space-y-1 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold shrink-0">
              {t.review.summaryTitle}
            </span>
            <span className="text-slate-200 truncate">{whiteName}</span>
            <span className="text-cyan-300 font-mono shrink-0">{result}</span>
            <span className="text-slate-200 truncate">{blackName}</span>
          </div>
          {review ? (
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="truncate">
                {whiteName}:{" "}
                <strong className="text-cyan-300">{review.white.accuracy.toFixed(0)}%</strong>
              </span>
              <span className="truncate">
                {blackName}:{" "}
                <strong className="text-cyan-300">{review.black.accuracy.toFixed(0)}%</strong>
              </span>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500">
              {status === "running" ? t.review.computing : t.review.notYetAvailable}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/60 border-cyan-500/20">
      <CardHeader className="py-2 pb-1">
        <CardTitle className="text-xs uppercase tracking-wider text-slate-400 font-bold">
          {t.review.summaryTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm pt-0 pb-3">
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
    { key: "brilliant", label: t.review.classBrilliant },
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
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-0.5">
        {items.map((it) => {
          const c = CLASSIFICATION_COLORS[it.key];
          const n = counts[it.key] ?? 0;
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
  compact = false,
}: {
  count: number;
  onPrev: () => void;
  onNext: () => void;
  disabled: boolean;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-slate-900/60 px-2 py-1">
        <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold truncate">
          {t.review.keyMomentsTitle}{" "}
          <span className="text-slate-400 font-normal">({count})</span>
        </span>
        <div className="ml-auto flex gap-1 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={onPrev}
            disabled={disabled}
            className="h-6 w-7 p-0 border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
            title={t.review.prev}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onNext}
            disabled={disabled}
            className="h-6 w-7 p-0 border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
            title={t.review.next}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }
  return (
    <Card className="bg-slate-900/60 border-amber-500/20">
      <CardHeader className="py-2 pb-1">
        <CardTitle className="text-xs uppercase tracking-wider text-amber-300 font-bold">
          {t.review.keyMomentsTitle}{" "}
          <span className="text-slate-400 font-normal">({count})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2 pt-0 pb-2">
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
