"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  RotateCcw,
  Undo2,
  Crown,
  AlertTriangle,
  Sparkles,
  Loader2,
  MessageCircleQuestion,
  BookOpen,
  ShieldAlert,
  Skull,
  Lock,
  LogOut,
  Bot,
  Save,
} from "lucide-react";
import { Chess, type Move, type Square as ChessSquare } from "chess.js";
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
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { useGameReview, type ReviewStatus } from "@/hooks/useGameReview";
import { useContinuousAnalysis } from "@/hooks/useContinuousAnalysis";
import ReviewLayout from "./game-reviewer/ReviewLayout";
import ReviewToolbar from "./game-reviewer/ReviewToolbar";
import EngineModule from "./game-reviewer/EngineModule";
import BoardNavigationBar from "./game-reviewer/BoardNavigationBar";
import ReviewDetailsPanel from "./game-reviewer/ReviewDetailsPanel";
import SaveGameDialog from "./game-reviewer/SaveGameDialog";
import { isLegalUciMove } from "@/lib/continuous-analysis-utils";
import {
  CLASSIFICATION_COLORS,
  hashReviewCacheKey,
  nextMainlineUciIfAlignedWithGame,
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
import {
  computeOpeningByPly,
  ensureOpeningsPartitionsLoaded,
  findBestOpeningByPrefix,
} from "@/lib/openings-registry";
import {
  describeTheoryHitsForUi,
  getOpeningTheorySans,
  preloadTheoryFenIndex,
  type TheoryTranspositionHit,
} from "@/lib/opening-theory";
import { buildVerboseHistoryFromSan } from "@/lib/move-history-verbose";
import { uciToVerboseMoveFromFen } from "@/lib/learn-chess-utils";
import SanNotation from "@/components/SanNotation";
import { OpeningExplorerPanel } from "@/components/game-reviewer/OpeningExplorerPanel";
import { MovesList, type MoveFlags } from "@/components/game-reviewer/MovesList";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import type { EngineConfig } from "@/lib/analysis";
import { getRecentConfigs } from "@/lib/storage";
import { toast } from "sonner";
import { saveGameToCloud } from "@/lib/supabase-storage";
import { track } from "@/lib/track";
import {
  buildArchiveSavePayloadFromPgn,
  tryBuildCloudSavePayloadFromSide,
  inferDefaultSaveSide,
  isPlaceholderPlayerName,
  type PgnGameSavePayload,
} from "@/lib/pgn-import";
import {
  buildAnnotatedPgn,
  sanitizeForPgnFilenameSegment,
} from "@/lib/pgn-annotated-export";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  appendMoveOnPath,
  enumerateAllPathsInTree,
  fenAfterPath,
  newExplorationForest,
  removeLastNodeOnPath,
  sanLineFromPath,
  walkPath,
  clearForest,
  type ExplorationForest,
  type ExplorationVarNode,
} from "@/lib/review-exploration-tree";

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
  /**
   * Profil moteur pour le paradoxe clone. Si absent, le dernier profil Â« rÃ©cent Â»
   * du stockage local est utilisÃ©.
   */
  paradoxAvatarConfig?: EngineConfig;
  /** Affiche un indicateur "dÃ©jÃ  sauvegardÃ©e" Ã  cÃ´tÃ© du tÃ©lÃ©chargement annotÃ©. */
  showSavedInGamesList?: boolean;
  /** Utilisateur connectÃ© : permet dâ€™enregistrer le PGN dans la table cloud `games`. */
  authUserId?: string | null;
  /** PrÃ©remplit le pseudo pour matcher [White]/[Black] lors de lâ€™enregistrement. */
  reviewCloudSavePlayerHint?: string | null;
  /**
   * Aide Ã  dÃ©duire le pseudo sans saisie : couleur du compte pour une partie dÃ©jÃ  en base,
   * et/ou partie locale de lâ€™eâ€‘mail si elle correspond Ã  un en-tÃªte du PGN.
   */
  cloudSaveContext?: {
    playerColor?: "white" | "black";
    emailLocalPart?: string | null;
  } | null;
  /** AprÃ¨s enregistrement rÃ©ussi dans `games`. */
  onSavedToGamesCloud?: () => void;
  /** CSS length subtracted from 100dvh for viewport-fit layout (page header). */
  viewportOffset?: string;
}

export default function GameReviewer({
  pgn,
  isPremium,
  maxPlies,
  showAllBestArrows,
  cacheUserId,
  onRequestUpgrade,
  paradoxAvatarConfig,
  showSavedInGamesList = false,
  authUserId = null,
  reviewCloudSavePlayerHint = null,
  cloudSaveContext = null,
  onSavedToGamesCloud,
  viewportOffset = "7rem",
}: GameReviewerProps) {
  const { t, lang } = useLanguage();

  useEffect(() => {
    void ensureOpeningsPartitionsLoaded();
    void preloadTheoryFenIndex();
  }, []);

  const [analysisStrictness, setAnalysisStrictness] =
    useState<AnalysisStrictnessId>(readStoredStrictness);
  const [premiumDepth, setPremiumDepth] = useState(readStoredPremiumDepth);
  const [coachTone, setCoachTone] = useState<CoachToneId>(readStoredCoachTone);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const engineDepth = isPremium ? premiumDepth : FREE_ENGINE_DEPTH;

  const [storedPersona, setStoredPersona] = useState<EngineConfig | null>(null);
  useEffect(() => {
    const sync = () => {
      try {
        setStoredPersona(getRecentConfigs()[0]?.config ?? null);
      } catch {
        setStoredPersona(null);
      }
    };
    sync();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, []);

  useEffect(() => {
    try {
      setStoredPersona(getRecentConfigs()[0]?.config ?? null);
    } catch {
      setStoredPersona(null);
    }
  }, [pgn]);

  const effectivePersona = paradoxAvatarConfig ?? storedPersona;

  const parsed = useMemo<ParsedGameForReview | null>(
    () => parsePgnForReview(pgn),
    [pgn]
  );

  const defaultSaveSide = useMemo(
    () =>
      inferDefaultSaveSide({
        pgn,
        hint: reviewCloudSavePlayerHint,
        playerColor: cloudSaveContext?.playerColor ?? null,
        emailLocalPart: cloudSaveContext?.emailLocalPart ?? null,
      }),
    [
      pgn,
      reviewCloudSavePlayerHint,
      cloudSaveContext?.playerColor,
      cloudSaveContext?.emailLocalPart,
    ]
  );

  const saveDialogWhiteName = parsed?.headers?.White?.trim() ?? "?";
  const saveDialogBlackName = parsed?.headers?.Black?.trim() ?? "?";

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
      // so we don't draw a wrong arrow or mislabel "Best was: â€¦".
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

  const continuous = useContinuousAnalysis({
    blocked: review.status === "running",
  });

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

  const totalPlies = parsed?.san.length ?? 0;
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [currentIndex, setCurrentIndex] = useState(0); // 0 = initial position; 1..N after move N
  const [autoPlay, setAutoPlay] = useState(false);
  /** Variantes par coup de branchement (index sur la ligne principale). */
  const [explorationByPly, setExplorationByPly] = useState<
    Record<number, ExplorationForest>
  >({});
  /** Chemin courant dans lâ€™arbre par coup de branchement. */
  const [explorationPathByPly, setExplorationPathByPly] = useState<
    Record<number, number[]>
  >({});
  /** Prochain coup : suite de la ligne, ou branche parallÃ¨le (sÅ“ur). */
  const [explorationBranchMode, setExplorationBranchMode] = useState<
    "line" | "sibling"
  >("line");
  const [explorationOpen, setExplorationOpen] = useState(false);

  const explorationForest = useMemo(
    () => explorationByPly[currentIndex] ?? newExplorationForest(currentIndex),
    [explorationByPly, currentIndex]
  );

  const explorationPath = explorationPathByPly[currentIndex] ?? [];

  const patchExplorationForest = useCallback(
    (
      patch:
        | ExplorationForest
        | ((prev: ExplorationForest) => ExplorationForest)
    ) => {
      setExplorationByPly((prev) => {
        const cur = prev[currentIndex] ?? newExplorationForest(currentIndex);
        const next = typeof patch === "function" ? patch(cur) : patch;
        return { ...prev, [currentIndex]: next };
      });
    },
    [currentIndex]
  );

  const setExplorationPath = useCallback(
    (next: number[] | ((prev: number[]) => number[])) => {
      setExplorationPathByPly((prev) => {
        const cur = prev[currentIndex] ?? [];
        const out = typeof next === "function" ? next(cur) : next;
        return { ...prev, [currentIndex]: out };
      });
    },
    [currentIndex]
  );

  // Reset board when the game changes.
  useEffect(() => {
    setCurrentIndex(0);
    setAutoPlay(false);
  }, [pgn]);

  useEffect(() => {
    setExplorationByPly({});
    setExplorationPathByPly({});
  }, [pgn]);

  const baseMainlineFenForExplore = useMemo(() => {
    if (!parsed) return null;
    return currentIndex === 0
      ? parsed.fenBefore[0]
      : parsed.fenAfter[Math.min(currentIndex, parsed.fenAfter.length) - 1];
  }, [parsed, currentIndex]);

  const displayFen = useMemo(() => {
    const base = baseMainlineFenForExplore;
    if (!base) return new Chess().fen();
    try {
      return fenAfterPath(base, explorationForest, explorationPath);
    } catch {
      return base;
    }
  }, [baseMainlineFenForExplore, explorationForest, explorationPath]);

  useEffect(() => {
    continuous.bindFen(displayFen);
  }, [displayFen, continuous.bindFen]);

  const explorationSanLine = useMemo(() => {
    if (!baseMainlineFenForExplore || explorationPath.length === 0) return "";
    return sanLineFromPath(
      baseMainlineFenForExplore,
      explorationForest,
      explorationPath
    );
  }, [baseMainlineFenForExplore, explorationForest, explorationPath]);

  const explorationNavPaths = useMemo(
    () => enumerateAllPathsInTree(explorationForest),
    [explorationForest]
  );

  const explorationPathOptions = useMemo(() => {
    if (explorationForest.roots.length === 0) return explorationNavPaths;
    return [[], ...explorationNavPaths] as number[][];
  }, [explorationForest, explorationNavPaths]);

  const explorationPathInOptions = useMemo(() => {
    const key = JSON.stringify(explorationPath);
    return explorationPathOptions.some((p) => JSON.stringify(p) === key);
  }, [explorationPath, explorationPathOptions]);

  const explorationSelectValue = useMemo(() => {
    if (explorationPathInOptions) return JSON.stringify(explorationPath);
    return JSON.stringify(explorationPathOptions[0] ?? []);
  }, [
    explorationPath,
    explorationPathInOptions,
    explorationPathOptions,
  ]);

  useEffect(() => {
    if (explorationPathOptions.length === 0) return;
    if (explorationPathInOptions) return;
    setExplorationPath(explorationPathOptions[0] ?? []);
  }, [explorationPathOptions, explorationPathInOptions]);

  const explorationLastSquares = useMemo(() => {
    const chain = walkPath(explorationForest, explorationPath);
    if (chain.length === 0) return null;
    const last = chain[chain.length - 1];
    return uciToSquares(last.uci);
  }, [explorationForest, explorationPath]);

  const hasExplorationTree = explorationForest.roots.length > 0;

  const handleExplorationDrop = useCallback(
    (from: string, to: string) => {
      if (effectiveStatus === "running") return false;
      if (!baseMainlineFenForExplore) return false;
      try {
        const g = new Chess(displayFen);
        const piece = g.get(from as ChessSquare);
        const isPromotion =
          piece &&
          piece.type === "p" &&
          ((piece.color === "w" && to[1] === "8") ||
            (piece.color === "b" && to[1] === "1"));
        const attempt = (promotion?: "q" | "r" | "b" | "n") => {
          const trial = new Chess(displayFen);
          return trial.move({
            from,
            to,
            ...(promotion ? { promotion } : {}),
          });
        };
        let m: Move | null = null;
        if (isPromotion) {
          for (const p of ["q", "r", "b", "n"] as const) {
            m = attempt(p);
            if (m) break;
          }
        } else {
          m = attempt();
        }
        if (!m) return false;
        const uci = `${m.from}${m.to}${m.promotion ?? ""}`;
        const mode = explorationBranchMode;
        if (parsed) {
          const prefixChain =
            mode === "sibling"
              ? walkPath(explorationForest, explorationPath.slice(0, -1))
              : walkPath(explorationForest, explorationPath);
          const nextMain = nextMainlineUciIfAlignedWithGame(
            parsed,
            currentIndex,
            prefixChain
          );
          if (nextMain !== null && uci === nextMain) {
            return false;
          }
        }
        const { forest, newPath } = appendMoveOnPath(
          explorationForest,
          explorationPath,
          uci,
          mode
        );
        patchExplorationForest(forest);
        setExplorationPath(newPath);
        setExplorationBranchMode("line");
        return true;
      } catch {
        return false;
      }
    },
    [
      effectiveStatus,
      baseMainlineFenForExplore,
      displayFen,
      parsed,
      currentIndex,
      patchExplorationForest,
      explorationForest,
      explorationPath,
      explorationBranchMode,
    ]
  );

  const handleSaveClick = useCallback(() => {
    if (!parsed) {
      toast.error(t.review.invalidPgn);
      return;
    }
    if (!authUserId) {
      toast.error(t.review.saveToCloudNeedLogin);
      return;
    }
    if (!isSupabaseConfigured) {
      toast.error(t.review.saveToCloudSupabase);
      return;
    }
    setSaveDialogOpen(true);
  }, [
    authUserId,
    parsed,
    t.review.invalidPgn,
    t.review.saveToCloudNeedLogin,
    t.review.saveToCloudSupabase,
  ]);

  const executeSave = useCallback(
    async (mode: { kind: "player"; side: "white" | "black" } | { kind: "archive" }) => {
      if (!parsed) {
        toast.error(t.review.invalidPgn);
        return;
      }
      let payload: PgnGameSavePayload | null =
        mode.kind === "archive"
          ? buildArchiveSavePayloadFromPgn(pgn)
          : tryBuildCloudSavePayloadFromSide(pgn, mode.side);
      if (!payload) {
        toast.error(t.review.saveToCloudFailed);
        return;
      }
      if (effectiveMoves && effectiveMoves.length > 0) {
        payload.pgn = buildAnnotatedPgn(parsed, effectiveMoves, {
          explorationsByPly: explorationByPly,
        });
      }
      setSaveBusy(true);
      try {
        const row = await saveGameToCloud({
          opponentName: payload.opponentName,
          opponentPlatform: payload.opponentPlatform,
          result: payload.result,
          resultType: payload.resultType,
          resultMessage: payload.resultMessage,
          playerColor: payload.playerColor,
          pgn: payload.pgn,
          finalFen: payload.finalFen,
          movesCount: payload.movesCount,
        });
        if (!row) {
          toast.error(t.review.saveToCloudNeedLogin);
          return;
        }
        toast.success(t.review.saveToCloudSuccess);
        track("review_completed", { saved_to_cloud: true });
        if (mode.kind === "player" && authUserId) {
          const headerName =
            mode.side === "white"
              ? parsed.headers.White?.trim()
              : parsed.headers.Black?.trim();
          if (headerName && !isPlaceholderPlayerName(headerName)) {
            try {
              localStorage.setItem(
                `chess-avatar.games.savePlayerName.${authUserId}`,
                headerName
              );
            } catch {
              // ignore
            }
          }
        }
        setSaveDialogOpen(false);
        onSavedToGamesCloud?.();
      } catch {
        toast.error(t.review.saveToCloudFailed);
      } finally {
        setSaveBusy(false);
      }
    },
    [
      authUserId,
      effectiveMoves,
      explorationByPly,
      onSavedToGamesCloud,
      parsed,
      pgn,
      t.review.invalidPgn,
      t.review.saveToCloudFailed,
      t.review.saveToCloudNeedLogin,
      t.review.saveToCloudSuccess,
    ]
  );

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
    return computeOpeningByPly(parsed.uci);
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

  const verboseMainline = useMemo(
    () => (parsed ? buildVerboseHistoryFromSan(parsed.san) : null),
    [parsed]
  );

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
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "Home") {
        e.preventDefault();
        goStart();
      }
      if (e.key === "End") {
        e.preventDefault();
        goEnd();
      }
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
      const annotated = buildAnnotatedPgn(parsed, effectiveMoves ?? [], {
        explorationsByPly: explorationByPly,
      });
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
  }, [
    parsed,
    effectiveMoves,
    explorationByPly,
    t.review.downloadAnnotatedFailed,
  ]);

  if (!parsed) {
    return (
      <Card className="bg-slate-900/50 border-red-500/30">
        <CardContent className="py-10 text-center text-red-300">
          {t.review.invalidPgn}
        </CardContent>
      </Card>
    );
  }

  // The move that just played to reach the mainline position at currentIndex (when currentIndex > 0).
  const currentMove: ReviewedMove | undefined =
    currentIndex > 0 ? effectiveMoves[currentIndex - 1] : undefined;
  const lastMoveSquares =
    currentIndex > 0 ? uciToSquares(parsed.uci[currentIndex - 1]) : null;

  const lastMoveForBoard = explorationLastSquares ?? lastMoveSquares;

  // Engine "best move" arrow: shown on the position BEFORE the move that was
  // just played, if the played move was sub-optimal.
  const arrows: Array<{ from: string; to: string; color?: string }> = [];
  if (
    explorationPath.length === 0 &&
    currentMove &&
    currentMove.bestMove &&
    currentMove.uci !== currentMove.bestMove
  ) {
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

  if (
    arrows.length === 0 &&
    continuous.enabled &&
    continuous.display?.bestMoveUci &&
    isLegalUciMove(displayFen, continuous.display.bestMoveUci)
  ) {
    const sq = uciToSquares(continuous.display.bestMoveUci);
    if (sq) {
      arrows.push({
        from: sq.from,
        to: sq.to,
        color: "rgba(34, 197, 94, 0.85)",
      });
    }
  }

  const evalForBar =
    explorationPath.length > 0
      ? null
      : continuous.enabled && continuous.display
        ? continuous.display.evalWhitePov
        : currentIndex === 0
          ? 0
          : effectiveMoves[currentIndex - 1]?.playerEval ?? null;

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

  const explorationPanel =
    effectiveStatus !== "running" ? (
      <div className="rounded-lg border border-slate-700/80 bg-slate-950/60 overflow-hidden">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full h-8 justify-between text-xs text-slate-400 hover:text-slate-200 rounded-none"
          onClick={() => setExplorationOpen((o) => !o)}
        >
          <span>{t.review.explorationMoveListTitle}</span>
          {explorationOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>
        {explorationOpen && (
          <div className="px-2 pb-2 space-y-2 border-t border-slate-700/60">
            <p className="text-[10px] text-slate-500 leading-snug pt-2">
              {t.review.explorationHint}
            </p>
            <div className="flex flex-wrap gap-1.5 items-center">
              <Button
                type="button"
                size="sm"
                variant={explorationBranchMode === "line" ? "default" : "outline"}
                className="h-7 border-slate-600 text-xs"
                onClick={() => setExplorationBranchMode("line")}
                title={t.review.explorationBranchLineHint}
              >
                {t.review.explorationBranchLine}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={explorationBranchMode === "sibling" ? "default" : "outline"}
                className="h-7 border-slate-600 text-xs"
                onClick={() => setExplorationBranchMode("sibling")}
                title={t.review.explorationBranchSiblingHint}
              >
                {t.review.explorationBranchSibling}
              </Button>
            </div>
            {explorationPathOptions.length > 1 && baseMainlineFenForExplore && (
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-slate-500">
                  {t.review.explorationLeafSelect}
                </Label>
                <select
                  className="flex h-8 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                  value={explorationSelectValue}
                  onChange={(e) => {
                    try {
                      const p = JSON.parse(e.target.value) as number[];
                      if (Array.isArray(p)) setExplorationPath(p.map(Number));
                    } catch {
                      /* ignore */
                    }
                  }}
                >
                  {explorationPathOptions.map((p) => (
                    <option key={JSON.stringify(p)} value={JSON.stringify(p)}>
                      {p.length === 0
                        ? t.review.explorationPathStart
                        : sanLineFromPath(
                            baseMainlineFenForExplore,
                            explorationForest,
                            p
                          )}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 border-slate-600 text-slate-200 text-xs"
                disabled={!hasExplorationTree}
                onClick={() => {
                  const { forest, newPath } = removeLastNodeOnPath(
                    explorationForest,
                    explorationPath
                  );
                  patchExplorationForest(forest);
                  setExplorationPath(newPath);
                }}
              >
                <Undo2 className="h-3 w-3 mr-1" />
                {t.review.explorationUndo}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 border-slate-600 text-slate-200 text-xs"
                disabled={!hasExplorationTree && !explorationForest.note.trim()}
                onClick={() => {
                  patchExplorationForest((f) => clearForest(f));
                  setExplorationPath([]);
                }}
              >
                {t.review.explorationClear}
              </Button>
              {explorationSanLine ? (
                <span className="text-[10px] font-mono text-cyan-300/90">
                  {explorationSanLine}
                </span>
              ) : null}
            </div>
            <textarea
              value={explorationForest.note}
              onChange={(e) =>
                patchExplorationForest((f) => ({ ...f, note: e.target.value }))
              }
              placeholder={t.review.explorationNotePlaceholder}
              rows={2}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-y min-h-[2rem]"
            />
          </div>
        )}
      </div>
    ) : undefined;

  const saveCloudPanel = (
    <div className="space-y-2 text-sm">
      <p className="text-xs font-semibold text-slate-200">{t.review.saveToCloudTitle}</p>
      <p className="text-[11px] text-slate-500 leading-snug">{t.review.saveToCloudHint}</p>
      {!authUserId ? (
        <p className="text-[11px] text-amber-200/90">{t.review.saveToCloudNeedLogin}</p>
      ) : (
        <Button
          type="button"
          size="sm"
          disabled={saveBusy}
          onClick={handleSaveClick}
          className="bg-cyan-700 hover:bg-cyan-600 text-white w-full"
        >
          {saveBusy ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t.review.saveToCloudButton}
        </Button>
      )}
    </div>
  );

  const evalGraphPanel =
    evalSeries.length > 1 ? (
      <div className="h-36 w-full">
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
      </div>
    ) : null;

  return (
    <>
    <ReviewLayout
      viewportOffset={viewportOffset}
      toolbar={
        <ReviewToolbar
          analysisStrictness={analysisStrictness}
          onStrictnessChange={handleStrictnessChange}
          isPremium={isPremium}
          premiumDepth={premiumDepth}
          onPremiumDepthChange={handlePremiumDepthChange}
          coachTone={coachTone}
          onCoachToneChange={handleCoachToneChange}
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
          canSaveToGames={!showSavedInGamesList}
          onSaveToGames={handleSaveClick}
          saveBusy={saveBusy}
          continuousEnabled={continuous.enabled}
          onContinuousToggle={continuous.toggle}
        />
      }
      board={
        <SimpleChessboard
          position={displayFen}
          orientation={orientation}
          lastMove={lastMoveForBoard}
          arrows={arrows}
          boardMaxWidth="100%"
          onDrop={
            effectiveStatus === "running" ? undefined : handleExplorationDrop
          }
        />
      }
      boardNav={
        <BoardNavigationBar
          currentIndex={currentIndex}
          totalPlies={totalPlies}
          autoPlay={autoPlay}
          onGoStart={goStart}
          onGoPrev={goPrev}
          onGoNext={goNext}
          onGoEnd={goEnd}
          onToggleAutoPlay={() => setAutoPlay((p) => !p)}
          onFlipBoard={flipBoard}
          autoPlayDisabled={
            effectiveStatus === "running" || effectiveMoves.length === 0
          }
        />
      }
      exploration={explorationPanel}
      movesPanel={
        <MovesList
          parsed={parsed}
          moves={effectiveMoves}
          verboseMainline={verboseMainline}
          currentIndex={currentIndex}
          openingByPly={openingByPly}
          moveFlagsByPly={moveFlagsByPly}
          exitTheoryPly={exitTheoryPly}
          onSelect={(idx) => setCurrentIndex(idx)}
          explorationByPly={explorationByPly}
          explorationPathByPly={explorationPathByPly}
          onExplorationPathSelect={(branchPly, path) => {
            setExplorationPathByPly((prev) => ({
              ...prev,
              [branchPly]: path,
            }));
            setCurrentIndex(branchPly);
          }}
        />
      }
      enginePanel={
        <EngineModule
          evaluation={evalForBar}
          continuousEnabled={continuous.enabled}
          engineReady={continuous.engineReady}
          isAnalyzing={continuous.isAnalyzing}
          paused={continuous.paused}
          display={continuous.display}
        />
      }
      detailsPanel={
        <ReviewDetailsPanel
          summary={
            <div className="space-y-2">
              <SummaryCard
                parsed={parsed}
                review={effectiveResult}
                status={effectiveStatus}
              />
              <KeyMomentsCard
                count={effectiveResult?.keyMoments.length ?? 0}
                onPrev={() => goToKeyMoment(-1)}
                onNext={() => goToKeyMoment(1)}
                disabled={
                  !effectiveResult || effectiveResult.keyMoments.length === 0
                }
              />
            </div>
          }
          moveDetail={
            <CurrentMoveDetail
              move={currentMove}
              explorerFen={displayFen}
              fenBefore={
                currentIndex > 0 ? parsed.fenBefore[currentIndex - 1] : undefined
              }
              moveNumber={
                currentIndex > 0
                  ? Math.floor((currentIndex - 1) / 2) + 1
                  : undefined
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
              personaConfig={effectivePersona}
              getPersonaStyleMove={review.getPersonaStyleMove}
              reviewBlocked={effectiveStatus === "running"}
            />
          }
          evalGraph={evalGraphPanel}
          savePanel={saveCloudPanel}
          showGraphTab={evalSeries.length > 1}
          showSaveTab
        />
      }
    />
    <SaveGameDialog
      open={saveDialogOpen}
      onOpenChange={setSaveDialogOpen}
      whiteName={saveDialogWhiteName}
      blackName={saveDialogBlackName}
      defaultSide={defaultSaveSide}
      busy={saveBusy}
      onSaveAs={(side) => void executeSave({ kind: "player", side })}
      onSaveArchive={() => void executeSave({ kind: "archive" })}
    />
    </>
  );
}

function ExplorerCollapsible({ fen }: { fen: string }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded border border-slate-700/60 overflow-hidden">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full h-7 justify-between text-[10px] text-slate-400 hover:text-slate-200 rounded-none px-2"
        onClick={() => setOpen((o) => !o)}
      >
        <span>{t.review.opening.explorerTitle}</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>
      {open && (
        <div className="border-t border-slate-700/60 px-1 pb-1">
          <OpeningExplorerPanel fen={fen} />
        </div>
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
  personaConfig,
  getPersonaStyleMove,
  reviewBlocked,
}: {
  move?: ReviewedMove;
  /** Position affichÃ©e (explorer Lichess : stats depuis cette position). */
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
        transpositionHints: TheoryTranspositionHit[];
      }
    | null;
  personaConfig: EngineConfig | null;
  getPersonaStyleMove: (
    fen: string,
    config: EngineConfig,
    opts?: { depth?: number; movetime?: number }
  ) => Promise<string>;
  reviewBlocked: boolean;
}) {
  const { t, lang } = useLanguage();
  const { settings: boardSettings } = useChessboardSettings();

  const MAX_TRANSPOSITIONS_VISIBLE = 6;
  const [showAllTranspositions, setShowAllTranspositions] = useState(false);

  const theoryVerbose = useMemo(() => {
    if (!theorySnapshot?.sans?.length) return null;
    return buildVerboseHistoryFromSan(theorySnapshot.sans);
  }, [theorySnapshot]);

  useEffect(() => {
    setShowAllTranspositions(false);
  }, [theorySnapshot]);

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
            <span className="text-sm font-mono text-slate-100 inline-flex items-center gap-1">
              <SanNotation
                verboseMove={
                  fenBefore && move.uci
                    ? uciToVerboseMoveFromFen(fenBefore, move.uci)
                    : null
                }
                fallbackSan={move.san}
                movingColor={move.sideToMove === "white" ? "w" : "b"}
                pieceSet={boardSettings.pieceSet}
                size="md"
              />
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
            <span className="text-orange-200/70">Â·</span>
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
            <p className="text-slate-300 leading-relaxed break-words font-mono text-[10px] inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
              {theorySnapshot.sans.map((san, i) => (
                <span
                  key={`${san}-${i}`}
                  className={
                    i < theorySnapshot.matchedPlies
                      ? "text-amber-100 font-semibold inline-flex items-center"
                      : "text-slate-500 inline-flex items-center"
                  }
                >
                  <SanNotation
                    verboseMove={theoryVerbose?.[i] ?? null}
                    fallbackSan={san}
                    movingColor={i % 2 === 0 ? "w" : "b"}
                    pieceSet={boardSettings.pieceSet}
                    size="sm"
                  />
                </span>
              ))}
            </p>
            {theorySnapshot.transpositionHints.length > 0 && (
              <div className="border-t border-amber-500/20 pt-1.5 space-y-1.5">
                <div className="text-slate-500 text-[10px]">
                  {t.review.opening.transpositions}
                </div>
                <div className="inline-flex flex-wrap items-center gap-1">
                  {(showAllTranspositions
                    ? theorySnapshot.transpositionHints
                    : theorySnapshot.transpositionHints.slice(
                        0,
                        MAX_TRANSPOSITIONS_VISIBLE
                      )
                  ).map((hit) => (
                    <Badge
                      key={`${hit.openingId}-${hit.theoryStep}`}
                      variant="outline"
                      className="border-slate-700/60 bg-slate-800/60 font-normal text-[10px] px-1.5 py-0 text-slate-300 max-w-[min(100%,14rem)]"
                    >
                      <span className="truncate">{hit.name}</span>
                      <span className="font-mono text-amber-300/70 shrink-0 ml-1">
                        Â· {lang === "en" ? "move" : "coup"} {hit.theoryStep}
                      </span>
                    </Badge>
                  ))}
                  {theorySnapshot.transpositionHints.length >
                    MAX_TRANSPOSITIONS_VISIBLE && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-slate-400 hover:text-slate-200"
                      onClick={() =>
                        setShowAllTranspositions((v) => !v)
                      }
                    >
                      {showAllTranspositions
                        ? t.review.opening.showLessTranspositions
                        : t.review.opening.showMoreTranspositions.replace(
                            "{n}",
                            String(
                              theorySnapshot.transpositionHints.length -
                                MAX_TRANSPOSITIONS_VISIBLE
                            )
                          )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        <ExplorerCollapsible fen={explorerFen} />
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
            <div className="flex items-start gap-1 text-emerald-300 flex-wrap">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
              <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
                {t.review.bestWas}{" "}
                <strong className="inline-flex items-center font-mono font-semibold">
                  <SanNotation
                    verboseMove={
                      fenBefore && move.bestMove
                        ? uciToVerboseMoveFromFen(fenBefore, move.bestMove)
                        : null
                    }
                    fallbackSan={move.bestSan || move.bestMove}
                    movingColor={
                      move.sideToMove === "white" ? "w" : "b"
                    }
                    pieceSet={boardSettings.pieceSet}
                    size="sm"
                  />
                </strong>
                {move.bestSan && (
                  <span className="text-[10px] text-emerald-400/60 font-mono">
                    ({move.bestMove})
                  </span>
                )}
                <span className="font-mono">({formatEval(move.bestEval)})</span>
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
        {showCoach && (
          <CloneParadoxCard
            move={move}
            fenBefore={fenBefore!}
            personaConfig={personaConfig}
            getPersonaStyleMove={getPersonaStyleMove}
            reviewBlocked={reviewBlocked}
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Coup Â« style clone Â» (Stockfish + MultiPV + profil) pour les coups sous-optimaux.
 */
function CloneParadoxCard({
  move,
  fenBefore,
  personaConfig,
  getPersonaStyleMove,
  reviewBlocked,
}: {
  move: ReviewedMove;
  fenBefore: string;
  personaConfig: EngineConfig | null;
  getPersonaStyleMove: (
    fen: string,
    config: EngineConfig,
    opts?: { depth?: number; movetime?: number }
  ) => Promise<string>;
  reviewBlocked: boolean;
}) {
  const { t } = useLanguage();
  const { settings: boardSettings } = useChessboardSettings();
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [cloneUci, setCloneUci] = useState<string | null>(null);

  useEffect(() => {
    setStatus("idle");
    setCloneUci(null);
  }, [move.ply, move.uci]);

  const handleClick = useCallback(() => {
    if (!personaConfig || reviewBlocked) return;
    setStatus("loading");
    void getPersonaStyleMove(fenBefore, personaConfig, {
      depth: Math.min(14, personaConfig.depth),
      movetime: Math.min(800, personaConfig.timeControl),
    })
      .then((uci) => {
        setCloneUci(uci);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [personaConfig, reviewBlocked, fenBefore, getPersonaStyleMove]);

  const cloneSan =
    cloneUci && fenBefore ? uciToSan(fenBefore, cloneUci) : null;

  return (
    <div className="pt-2 border-t border-cyan-500/25 mt-2 space-y-2">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-cyan-200/90 uppercase tracking-wide">
        <Bot className="h-3.5 w-3.5 shrink-0" />
        {t.review.paradox.title}
      </div>
      <p className="text-[10px] text-slate-500 leading-snug">
        {t.review.paradox.subtitle}
      </p>
      {!personaConfig ? (
        <p className="text-xs text-slate-400">
          {t.review.paradox.noPersona}{" "}
          <Link href="/analyze" className="text-cyan-400 hover:underline">
            {t.review.paradox.openAnalyze}
          </Link>
        </p>
      ) : reviewBlocked ? (
        <p className="text-xs text-amber-200/80">{t.review.paradox.busy}</p>
      ) : status === "idle" ? (
        <Button
          size="sm"
          variant="outline"
          onClick={handleClick}
          className="border-cyan-500/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          {t.review.paradox.button}
        </Button>
      ) : status === "loading" ? (
        <div className="rounded border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100 flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          {t.review.paradox.loading}
        </div>
      ) : status === "error" ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-red-300">{t.review.paradox.error}</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleClick}>
            {t.review.paradox.retry}
          </Button>
        </div>
      ) : (
        <div className="rounded border border-cyan-500/25 bg-slate-950/50 px-3 py-2 text-xs space-y-1.5">
          <div className="text-cyan-200/90 font-medium">
            {t.review.paradox.cloneWouldPlay}
          </div>
          {cloneUci && move.bestMove && cloneUci === move.bestMove && (
            <p className="text-emerald-300/90">{t.review.paradox.sameAsEngine}</p>
          )}
          {cloneUci && cloneUci === move.uci && cloneUci !== move.bestMove && (
            <p className="text-amber-200/90">{t.review.paradox.sameAsPlayed}</p>
          )}
          {cloneSan && (
            <div className="inline-flex items-center gap-1 font-mono text-slate-100">
              <SanNotation
                verboseMove={uciToVerboseMoveFromFen(fenBefore, cloneUci!)}
                fallbackSan={cloneSan}
                movingColor={move.sideToMove === "white" ? "w" : "b"}
                pieceSet={boardSettings.pieceSet}
                size="sm"
              />
              <span className="text-[10px] text-slate-500">({cloneUci})</span>
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] text-slate-400"
            onClick={handleClick}
          >
            {t.review.paradox.retry}
          </Button>
        </div>
      )}
    </div>
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
