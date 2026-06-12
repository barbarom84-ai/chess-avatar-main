"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Chess, type Square } from "chess.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RotateCcw,
  Flag,
  Bot,
  RotateCw,
  BookOpen,
  AlertCircle,
  GitBranch,
  Undo2,
  Smile,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import SimpleChessboard from "./SimpleChessboard";
import EngineConfigPanel from "./EngineConfigPanel";
import GameResultModal from "./GameResultModal";
import PromotionDialog from "./PromotionDialog";
import { useStockfish } from "@/hooks/useStockfish";
import BotEngineSelector from "@/components/BotEngineSelector";
import { saveGameToCloud } from "@/lib/supabase-storage";
import { track } from "@/lib/track";
import { useLanguage } from "@/lib/language-context";
import type { EngineConfig } from "@/lib/analysis";
import { LICHESS_ARROW_COLORS } from "@/lib/chess-arrows";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import { playChessMoveSound } from "@/lib/chess-sound";
import {
  chessWithExplorationStack,
  mainlineMoveTargetSquare,
} from "@/lib/review-chess";
import {
  analyzeParsedGameForReview,
  buildParsedGameFromSanHistory,
  ReviewCancelledError,
} from "@/lib/game-review";
import { DEFAULT_ANALYSIS_STRICTNESS } from "@/lib/analysis-profiles";
import { buildVerboseHistoryFromSan } from "@/lib/move-history-verbose";
import { Input } from "@/components/ui/input";
import SanNotation from "./SanNotation";
import EvaluationBar from "./EvaluationBar";
import { Switch } from "@/components/ui/switch";
import {
  computePlayOpeningHints,
  PLAY_EVAL_BAR_STORAGE_KEY,
  PLAY_THEORY_ARROWS_STORAGE_KEY,
} from "@/lib/play-opening-hints";
import { stmEvalToWhitePov } from "@/lib/arena-spectator-helpers";

const REVIEW_EMOJI_CHOICES = ["💡", "🔥", "❓", "!!", "!?", "⭐", "👍", "📌"];

/** Depth for post-game CAPS-style accuracy (balance speed vs stability). */
const POST_GAME_REVIEW_DEPTH = 14;

/** Live evaluation bar depth during play (single Stockfish worker). */
const LIVE_EVAL_DEPTH = 10;

/**
 * Heuristic display ELO: performance rating plus accuracy vs baseline (~70 from analysis curve).
 * Not a Glicko/Lichess official rating.
 */
function hybridEstimatedElo(
  perfElo: number,
  accuracyPercent: number | null,
  baseline = 70,
  k = 3,
  clampAmt = 80
): number {
  if (accuracyPercent == null || !Number.isFinite(accuracyPercent)) return perfElo;
  const delta = Math.min(
    clampAmt,
    Math.max(-clampAmt, k * (accuracyPercent - baseline))
  );
  return Math.round(perfElo + delta);
}

interface PlayableChessboardProps {
  config: EngineConfig;
  playerColor: "white" | "black";
  onConfigChange?: (config: EngineConfig) => void;
  onColorChange?: () => void;
  /** Partie enregistrée (page Mes parties) : review + variantes, sans moteur. */
  archivePgn?: string | null;
  /** Libellé affiché à la place du nom du bot (ex. adversaire). */
  archiveViewLabel?: string;
}

export interface ReviewVariant {
  id: string;
  label: string;
  moves: string[];
}

interface GameStats {
  totalMoves: number;
  captures: number;
  checks: number;
  duration?: string;
  bestEval: number | null;
  worstEval: number | null;
  averageEval: number | null;
  precisionWhite: number | null;
  precisionBlack: number | null;
  eloWhite: number | null;
  eloBlack: number | null;
}

/** Rejoue l'historique SAN pour conserver l'historique interne (triple répétition, etc.). */
function chessFromSanHistory(history: string[]): Chess {
  const c = new Chess();
  for (const san of history) {
    const m = c.move(san);
    if (!m) {
      console.error('Coup illégal dans l\'historique SAN:', san);
      break;
    }
  }
  return c;
}

export default function PlayableChessboard({
  config,
  playerColor,
  onConfigChange,
  onColorChange,
  archivePgn,
  archiveViewLabel,
}: PlayableChessboardProps) {
  const isArchiveMode = Boolean(archivePgn?.trim());
  const [game, setGame] = useState(new Chess());
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<string>("");
  const [gameResultType, setGameResultType] = useState<'win' | 'loss' | 'draw'>('draw');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [moveCount50, setMoveCount50] = useState<number>(0);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<EngineConfig>(config);
  const [showResultModal, setShowResultModal] = useState(false);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>(playerColor);
  
  // Navigation dans l'historique
  const [reviewMode, setReviewMode] = useState(false);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1); // -1 = position initiale
  const [reviewExplorationMoves, setReviewExplorationMoves] = useState<string[]>([]);
  const [reviewExplorationSegments, setReviewExplorationSegments] = useState<string[][]>([]);
  const [reviewVariantsByAnchor, setReviewVariantsByAnchor] = useState<
    Record<number, ReviewVariant[]>
  >({});
  const [moveAnnotations, setMoveAnnotations] = useState<
    Record<number, { emoji?: string; note?: string }>
  >({});
  const [annotatingMoveIndex, setAnnotatingMoveIndex] = useState<number | null>(null);
  const [showReviewPromotion, setShowReviewPromotion] = useState(false);
  const [reviewPromotionPending, setReviewPromotionPending] = useState<{
    from: string;
    to: string;
  } | null>(null);
  
  // Promotion
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  
  // Stats de la partie
  const [gameStats, setGameStats] = useState<GameStats>({
    totalMoves: 0,
    captures: 0,
    checks: 0,
    bestEval: null,
    worstEval: null,
    averageEval: null,
    precisionWhite: null,
    precisionBlack: null,
    eloWhite: null,
    eloBlack: null,
  });
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [forcedLineArrows, setForcedLineArrows] = useState<Array<{ from: string; to: string; color: string }>>([]);
  const [archiveLoadError, setArchiveLoadError] = useState(false);
  /** Post-game CAPS analysis: null when idle or finished. */
  const [postGamePrecisionProgress, setPostGamePrecisionProgress] = useState<
    null | { current: number; total: number }
  >(null);

  /** Incremented on reset so in-flight post-game analysis does not apply stale state. */
  const postGameStatsCancelRef = useRef(0);

  const [liveEval, setLiveEval] = useState<number | null>(null);
  const [showEvalBar, setShowEvalBar] = useState(false);
  const [showTheoryHints, setShowTheoryHints] = useState(false);
  const liveEvalRequestRef = useRef(0);
  const isThinkingRef = useRef(false);

  const {
    isReady,
    isBotEngineReady,
    isStockfishReady,
    isChessAvatarReady,
    isChessAvatarPlayReady,
    isChessAvatarNnueLoading,
    chessAvatarSearchStats,
    lastBotEngineUsed,
    isThinking,
    getBestMove,
    getBestMoveAndEval,
    getPositionEvaluation,
    resetForcedLine,
    remainingForcedMoves,
    stopThinking,
  } = useStockfish();

  useEffect(() => {
    isThinkingRef.current = isThinking;
  }, [isThinking]);
  const { t, lang } = useLanguage();
  const { settings: boardUiSettings } = useChessboardSettings();

  const moveHistoryVerbose = useMemo(
    () => buildVerboseHistoryFromSan(moveHistory),
    [moveHistory]
  );

  useEffect(() => {
    try {
      if (localStorage.getItem(PLAY_EVAL_BAR_STORAGE_KEY) === "1") {
        setShowEvalBar(true);
      }
      if (localStorage.getItem(PLAY_THEORY_ARROWS_STORAGE_KEY) === "1") {
        setShowTheoryHints(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const openingHints = useMemo(() => {
    if (isArchiveMode || reviewMode) return null;
    return computePlayOpeningHints(moveHistory, game.fen(), lang);
  }, [moveHistory, game, isArchiveMode, reviewMode, lang]);

  const isHumanTurn = useMemo(() => {
    if (isArchiveMode || reviewMode || gameOver) return false;
    const turn = game.turn();
    return (
      (turn === "w" && playerColor === "white") ||
      (turn === "b" && playerColor === "black")
    );
  }, [isArchiveMode, reviewMode, gameOver, game, playerColor]);

  const theoryBoardArrows = useMemo(() => {
    if (!showTheoryHints || !isHumanTurn || isArchiveMode || reviewMode) {
      return [] as Array<{ from: string; to: string; color: string }>;
    }
    const ucis = openingHints?.theoryArrowUcis ?? [];
    return ucis.map((uci) => ({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      color: LICHESS_ARROW_COLORS.altBlue,
    }));
  }, [showTheoryHints, isHumanTurn, isArchiveMode, reviewMode, openingHints]);

  useEffect(() => {
    if (!showEvalBar) {
      setLiveEval(null);
      return;
    }
    if (isArchiveMode || reviewMode || gameOver || !isReady || isThinking) {
      return;
    }
    const fen = game.fen();
    const id = ++liveEvalRequestRef.current;
    let cancelled = false;
    const timer = setTimeout(() => {
      getPositionEvaluation(fen, LIVE_EVAL_DEPTH)
        .then((v) => {
          if (cancelled || id !== liveEvalRequestRef.current) return;
          setLiveEval(stmEvalToWhitePov(fen, v));
        })
        .catch(() => {
          if (cancelled || id !== liveEvalRequestRef.current) return;
          setLiveEval(null);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    showEvalBar,
    isArchiveMode,
    reviewMode,
    gameOver,
    isReady,
    isThinking,
    game,
    getPositionEvaluation,
    moveHistory.length,
  ]);

  const playMoveSoundIfEnabled = () => {
    if (boardUiSettings.soundEnabled) playChessMoveSound();
  };

  const reviewPositionChess = useMemo(() => {
    if (!reviewMode) return null;
    return chessWithExplorationStack(
      moveHistory,
      currentMoveIndex,
      reviewExplorationSegments,
      reviewExplorationMoves
    );
  }, [
    reviewMode,
    moveHistory,
    currentMoveIndex,
    reviewExplorationSegments,
    reviewExplorationMoves,
  ]);

  const boardLastMoveForDisplay = useMemo(() => {
    if (!reviewMode) return lastMove;
    if (!reviewPositionChess) return lastMove;
    const h = reviewPositionChess.history({ verbose: true });
    const lm = h[h.length - 1];
    return lm ? { from: lm.from, to: lm.to } : null;
  }, [reviewMode, lastMove, reviewPositionChess]);

  const reviewSquareEmojis = useMemo(() => {
    if (!reviewMode) return undefined;
    const out: Record<string, string> = {};
    for (let i = 0; i <= currentMoveIndex && i < moveHistory.length; i++) {
      const ann = moveAnnotations[i];
      if (ann?.emoji) {
        const sq = mainlineMoveTargetSquare(moveHistory, i);
        if (sq) out[sq] = ann.emoji;
      }
    }
    return Object.keys(out).length ? out : undefined;
  }, [reviewMode, currentMoveIndex, moveHistory, moveAnnotations]);

  const gameRef = useRef(game);
  const moveHistoryRef = useRef(moveHistory);
  gameRef.current = game;
  moveHistoryRef.current = moveHistory;

  useEffect(() => {
    if (!archivePgn?.trim()) {
      setArchiveLoadError(false);
      return;
    }
    setArchiveLoadError(false);
    try {
      const c = new Chess();
      c.loadPgn(archivePgn);
      const hist = c.history();
      setMoveHistory(hist);
      moveHistoryRef.current = hist;
      setGame(c);
      gameRef.current = c;
      setGameOver(true);
      setGameResult("");
      setShowResultModal(false);
      setReviewMode(true);
      setCurrentMoveIndex(-1);
      setReviewExplorationMoves([]);
      setReviewExplorationSegments([]);
      setReviewVariantsByAnchor({});
      setMoveAnnotations({});
      setAnnotatingMoveIndex(null);
      setLastMove(null);
      setMoveCount50(0);
      setShowReviewPromotion(false);
      setReviewPromotionPending(null);
      setForcedLineArrows([]);
    } catch (e) {
      console.error("Archive PGN:", e);
      setArchiveLoadError(true);
    }
  }, [archivePgn]);

  // Flèches pour le prochain coup forcé du bot — uniquement quand c'est au tour du bot
  const isBotTurn = (game.turn() === 'w' && playerColor === 'black') || (game.turn() === 'b' && playerColor === 'white');
  useEffect(() => {
    if (isArchiveMode || gameOver || !isBotTurn || !remainingForcedMoves?.length) {
      setForcedLineArrows([]);
      return;
    }
    const nextMove = remainingForcedMoves[0];
    if (nextMove && nextMove.length >= 4) {
      const from = nextMove.substring(0, 2);
      const to = nextMove.substring(2, 4);
      // Style Lichess-like pour les lignes forcées (vert semi-transparent)
      setForcedLineArrows([{ from, to, color: LICHESS_ARROW_COLORS.defaultGreen }]);
    } else {
      setForcedLineArrows([]);
    }
  }, [isArchiveMode, remainingForcedMoves, gameOver, isBotTurn]);
  
  // Navigation clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateToPreviousMove();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateToNextMove();
      } else if (e.key === 'Home') {
        e.preventDefault();
        navigateToMove(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        exitReviewMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMoveIndex, moveHistory.length, reviewMode]);

  const navigateToMove = (moveIndex: number) => {
    if (moveHistory.length === 0 && moveIndex >= 0) return;

    setReviewMode(true);
    setCurrentMoveIndex(moveIndex);
    setReviewExplorationMoves([]);
    setReviewExplorationSegments([]);
    setShowReviewPromotion(false);
    setReviewPromotionPending(null);
  };

  // Coup précédent
  const navigateToPreviousMove = () => {
    if (!reviewMode && moveHistory.length > 0) {
      // Entrer en mode review au dernier coup
      navigateToMove(moveHistory.length - 1);
    } else if (reviewMode && currentMoveIndex > 0) {
      navigateToMove(currentMoveIndex - 1);
    } else if (reviewMode && currentMoveIndex === 0) {
      setCurrentMoveIndex(-1);
      setReviewExplorationMoves([]);
      setReviewExplorationSegments([]);
    }
  };

  // Coup suivant
  const navigateToNextMove = () => {
    if (reviewMode && currentMoveIndex < moveHistory.length - 1) {
      navigateToMove(currentMoveIndex + 1);
    } else if (reviewMode && currentMoveIndex === moveHistory.length - 1) {
      if (isArchiveMode) {
        setReviewExplorationMoves([]);
        setReviewExplorationSegments([]);
        setShowReviewPromotion(false);
        setReviewPromotionPending(null);
      } else {
        exitReviewMode();
      }
    }
  };

  const exitReviewMode = useCallback(() => {
    if (isArchiveMode) {
      const len = moveHistoryRef.current.length;
      setCurrentMoveIndex(len > 0 ? len - 1 : -1);
      setReviewExplorationMoves([]);
      setReviewExplorationSegments([]);
      setShowReviewPromotion(false);
      setReviewPromotionPending(null);
      setAnnotatingMoveIndex(null);
      setReviewMode(true);
      return;
    }
    setReviewMode(false);
    setCurrentMoveIndex(-1);
    setReviewExplorationMoves([]);
    setReviewExplorationSegments([]);
    setShowReviewPromotion(false);
    setReviewPromotionPending(null);
    setAnnotatingMoveIndex(null);
  }, [isArchiveMode]);

  // Cliquer sur un coup dans l'historique
  const handleMoveClick = (moveIndex: number) => {
    if (moveIndex === currentMoveIndex && reviewMode) {
      // Double-clic sur le coup actuel = sortir du mode review
      exitReviewMode();
    } else {
      navigateToMove(moveIndex);
    }
  };

  // Si l'IA joue les blancs, elle commence
  useEffect(() => {
    if (isArchiveMode || !isBotEngineReady() || playerColor !== "black" || gameOver) return;
    if (gameRef.current.turn() !== "w") return;
    makeAIMove();
  }, [isArchiveMode, isBotEngineReady, isChessAvatarPlayReady, playerColor, gameOver]);

  // Synchroniser automatiquement l'orientation avec la couleur choisie par le joueur.
  // Si le joueur choisit noir, les noirs apparaissent en bas.
  useEffect(() => {
    setBoardOrientation(playerColor);
  }, [playerColor]);
  
  // Réinitialiser l'affichage de la ligne forcée quand la config ou la couleur change
  useEffect(() => {
    resetForcedLine();
  }, [
    currentConfig.forcedLineSource,
    currentConfig.forcedLineWhite,
    currentConfig.forcedLineBlack,
    currentConfig.forcedLine,
    currentConfig.openingRepertoire,
    playerColor,
  ]);

  const getMoveHistoryUciFrom = (history: string[]): string[] => {
    const temp = new Chess();
    const uci: string[] = [];
    for (const san of history) {
      const m = temp.move(san);
      if (m) uci.push(m.from + m.to + (m.promotion ?? ''));
    }
    return uci;
  };

  const makeAIMove = () => {
    if (isArchiveMode || gameOver || !isBotEngineReady() || isThinkingRef.current) return;
    const g = gameRef.current;
    const hist = moveHistoryRef.current;
    const botPlaysWhite = playerColor === "black";
    const botTurn = (g.turn() === "w") === botPlaysWhite;
    if (!botTurn) return;

    isThinkingRef.current = true;

    getBestMove(
      g.fen(),
      currentConfig,
      (moveUCI) => {
        try {
          const from = moveUCI.substring(0, 2);
          const to = moveUCI.substring(2, 4);
          const promotion = moveUCI.length > 4 ? moveUCI[4] : undefined;
          const board = chessFromSanHistory(hist);
          const move = board.move({ from, to, promotion });

          if (move) {
            setLastMove({ from, to });
            setGame(board);
            const updatedHistory = [...hist, move.san];
            setMoveHistory(updatedHistory);
            moveHistoryRef.current = updatedHistory;
            gameRef.current = board;
            if (move.captured || move.piece === 'p') {
              setMoveCount50(0);
            } else {
              setMoveCount50(prev => prev + 1);
            }
            playMoveSoundIfEnabled();
            checkGameState(board, updatedHistory);
          }
        } catch (error) {
          console.error("Erreur lors du coup de l'IA:", error);
        } finally {
          isThinkingRef.current = false;
        }
      },
      { moveHistoryUci: getMoveHistoryUciFrom(hist), playerColor }
    );
  };

  // Gestion du coup du joueur
  const onDrop = (sourceSquare: string, targetSquare: string) => {
    if (reviewMode) {
      const fen = chessWithExplorationStack(
        moveHistory,
        currentMoveIndex,
        reviewExplorationSegments,
        reviewExplorationMoves
      ).fen();
      const board = new Chess(fen);
      const piece = board.get(sourceSquare as never);
      const isPromotion =
        piece &&
        piece.type === "p" &&
        ((piece.color === "w" && targetSquare[1] === "8") ||
          (piece.color === "b" && targetSquare[1] === "1"));

      if (isPromotion) {
        setReviewPromotionPending({ from: sourceSquare, to: targetSquare });
        setShowReviewPromotion(true);
        return false;
      }

      try {
        const move = board.move({
          from: sourceSquare,
          to: targetSquare,
        });
        if (move) {
          setReviewExplorationMoves((prev) => [...prev, move.san]);
          setLastMove({ from: sourceSquare, to: targetSquare });
          playMoveSoundIfEnabled();
          return true;
        }
      } catch {
        return false;
      }
      return false;
    }
    
    // Vérifier si c'est le tour du joueur
    const isPlayerTurn = 
      (playerColor === 'white' && game.turn() === 'w') ||
      (playerColor === 'black' && game.turn() === 'b');

    if (!isPlayerTurn || gameOver || isThinking) {
      return false;
    }

    // Détecter si c'est un mouvement de promotion
    const piece = game.get(sourceSquare as Square);
    const isPromotion = piece && 
                       piece.type === 'p' && 
                       ((piece.color === 'w' && targetSquare[1] === '8') ||
                        (piece.color === 'b' && targetSquare[1] === '1'));

    if (isPromotion) {
      // Stocker le mouvement en attente et afficher le dialogue
      setPendingPromotion({ from: sourceSquare, to: targetSquare });
      setShowPromotionDialog(true);
      return false; // On attend le choix de l'utilisateur
    }

    try {
      const board = chessFromSanHistory(moveHistory);
      const move = board.move({
        from: sourceSquare,
        to: targetSquare
      });

      if (move) {
        const updatedHistory = [...moveHistory, move.san];
        setLastMove({ from: sourceSquare, to: targetSquare });
        setGame(board);
        setMoveHistory(updatedHistory);
        moveHistoryRef.current = updatedHistory;
        gameRef.current = board;
        if (move.captured || move.piece === 'p') {
          setMoveCount50(0);
        } else {
          setMoveCount50(prev => prev + 1);
        }
        playMoveSoundIfEnabled();
        checkGameState(board, updatedHistory);
        setTimeout(() => {
          if (!board.isGameOver()) makeAIMove();
        }, 300);
        return true;
      }
    } catch {
      return false;
    }

    return false;
  };

  const checkGameState = async (
    overrideGame?: Chess,
    overrideHistory?: string[]
  ) => {
    const g = overrideGame ?? game;
    const hist = overrideHistory ?? moveHistory;
    let resultType: 'win' | 'loss' | 'draw' = 'draw';

    if (g.isCheckmate()) {
      setGameOver(true);
      const message = g.turn() === 'w' ? t.board.checkmateBlack : t.board.checkmateWhite;
      setGameResult(message);
      resultType = (g.turn() === 'w' && playerColor === 'black') || (g.turn() === 'b' && playerColor === 'white') ? 'win' : 'loss';
      setGameResultType(resultType);
      await calculateFinalStats(resultType, message, hist);
      setShowResultModal(true);
      return;
    }

    if (g.isStalemate()) {
      setGameOver(true);
      const message = t.board.drawStalemate;
      setGameResult(message);
      setGameResultType('draw');
      await calculateFinalStats('draw', message, hist);
      setShowResultModal(true);
      return;
    }

    if (g.isThreefoldRepetition()) {
      setGameOver(true);
      const message = t.board.drawThreefold;
      setGameResult(message);
      setGameResultType('draw');
      await calculateFinalStats('draw', message, hist);
      setShowResultModal(true);
      return;
    }

    if (g.isInsufficientMaterial()) {
      setGameOver(true);
      const pieces = g.board().flat().filter(p => p !== null);
      const whitePieces = pieces.filter(p => p?.color === 'w').map(p => p?.type);
      const blackPieces = pieces.filter(p => p?.color === 'b').map(p => p?.type);
      let reason: string | null = null;
      if (whitePieces.length === 1 && blackPieces.length === 1) {
        reason = t.board.drawReasonKingVsKing;
      } else if (whitePieces.length === 2 && blackPieces.length === 1) {
        if (whitePieces.includes('b')) reason = t.board.drawReasonKingsBishop;
        if (whitePieces.includes('n')) reason = t.board.drawReasonKingsKnight;
      } else if (whitePieces.length === 1 && blackPieces.length === 2) {
        if (blackPieces.includes('b')) reason = t.board.drawReasonKingVsBishop;
        if (blackPieces.includes('n')) reason = t.board.drawReasonKingVsKnight;
      } else if (whitePieces.includes('b') && blackPieces.includes('b')) {
        reason = t.board.drawReasonSameColorBishops;
      }
      const message = reason ? `${t.board.drawGeneric.replace(' ⚖️', '')} - ${reason} 🤝` : t.board.drawInsufficient;
      setGameResult(message);
      setGameResultType('draw');
      setGameOver(true);
      await calculateFinalStats('draw', message, hist);
      setShowResultModal(true);
      return;
    }

    if (g.isDraw()) {
      setGameOver(true);
      const history = g.history({ verbose: true });
      const last50Moves = history.slice(-100);
      if (last50Moves.length >= 100 && !last50Moves.some(m => m.captured || m.piece === 'p')) {
        const message = t.board.draw50Moves;
        setGameResult(message);
        setGameResultType('draw');
        await calculateFinalStats('draw', message, hist);
        setShowResultModal(true);
        return;
      }
      const message = t.board.drawGeneric;
      setGameResult(message);
      setGameResultType('draw');
      await calculateFinalStats('draw', message, hist);
      setShowResultModal(true);
    }
  };

  // Calculer les stats finales et sauvegarder la partie
  const calculateFinalStats = async (
    finalResultType: 'win' | 'loss' | 'draw',
    finalResultMessage: string,
    currentMoveHistory: string[]
  ) => {
    // Rejouer les coups pour obtenir l'historique complet (new Chess(fen) n'a pas d'historique)
    const replay = new Chess();
    const verboseMoves: { captured?: string; san: string }[] = [];
    for (const san of currentMoveHistory) {
      const m = replay.move(san);
      if (m) verboseMoves.push(m);
    }
    const captures = verboseMoves.filter(move => move.captured).length;
    const checks = verboseMoves.filter(move => move.san.includes('+') || move.san.includes('#')).length;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const durationStr = `${minutes}m ${seconds}s`;

    const botElo = config.elo ?? 1400;
    const playerScore = finalResultType === 'win' ? 1 : finalResultType === 'draw' ? 0.5 : 0;
    const playerPerfElo = Math.round(botElo + 400 * (playerScore - 0.5));
    const eloWhite = playerColor === 'white' ? playerPerfElo : botElo;
    const eloBlack = playerColor === 'black' ? playerPerfElo : botElo;

    setGameStats({
      totalMoves: currentMoveHistory.length,
      captures,
      checks,
      duration: durationStr,
      bestEval: null,
      worstEval: null,
      averageEval: null,
      precisionWhite: null,
      precisionBlack: null,
      eloWhite,
      eloBlack,
    });

    const statsRunToken = postGameStatsCancelRef.current;
    void (async () => {
      const parsed = buildParsedGameFromSanHistory(currentMoveHistory);
      if (
        !parsed ||
        verboseMoves.length === 0 ||
        !getBestMoveAndEval ||
        statsRunToken !== postGameStatsCancelRef.current
      ) {
        return;
      }
      const totalPliesCount = parsed.san.length;
      setPostGamePrecisionProgress({ current: 0, total: totalPliesCount });
      try {
        const review = await analyzeParsedGameForReview({
          parsed,
          getBestMoveAndEval,
          depth: POST_GAME_REVIEW_DEPTH,
          analysisStrictness: DEFAULT_ANALYSIS_STRICTNESS,
          isCancelled: () => statsRunToken !== postGameStatsCancelRef.current,
          onProgress: (completed, total) => {
            if (statsRunToken !== postGameStatsCancelRef.current) return;
            setPostGamePrecisionProgress({ current: completed, total });
          },
        });
        if (statsRunToken !== postGameStatsCancelRef.current) return;

        const precW = Math.round(review.white.accuracy * 10) / 10;
        const precB = Math.round(review.black.accuracy * 10) / 10;
        const humanAccuracy =
          playerColor === 'white' ? review.white.accuracy : review.black.accuracy;
        const eloHumanHybrid = hybridEstimatedElo(playerPerfElo, humanAccuracy);

        setGameStats((prev) => ({
          ...prev,
          precisionWhite: precW,
          precisionBlack: precB,
          eloWhite:
            playerColor === 'white' ? eloHumanHybrid : botElo,
          eloBlack:
            playerColor === 'black' ? eloHumanHybrid : botElo,
        }));
      } catch (err) {
        if (err instanceof ReviewCancelledError) return;
        console.error('Post-game CAPS analysis failed:', err);
      } finally {
        setPostGamePrecisionProgress(null);
      }
    })();

    // Générer un PGN complet avec tous les headers
    const generateCompletePGN = () => {
      const date = new Date();
      const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
      const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
      
      // Déterminer le résultat au format PGN
      let pgnResult = '*';
      if (finalResultType === 'win') {
        pgnResult = playerColor === 'white' ? '1-0' : '0-1';
      } else if (finalResultType === 'loss') {
        pgnResult = playerColor === 'white' ? '0-1' : '1-0';
      } else if (finalResultType === 'draw') {
        pgnResult = '1/2-1/2';
      }
      
      // Déterminer les joueurs
      const whitePlayer = playerColor === 'white' ? t.playableBoard.player : (config.name || 'Bot IA');
      const blackPlayer = playerColor === 'black' ? t.playableBoard.player : (config.name || 'Bot IA');
      
      // Construire les headers PGN
      const headers = [
        `[Event "Chess Avatar Game"]`,
        `[Site "Chess Avatar"]`,
        `[Date "${dateStr}"]`,
        `[Time "${timeStr}"]`,
        `[Round "1"]`,
        `[White "${whitePlayer}"]`,
        `[Black "${blackPlayer}"]`,
        `[Result "${pgnResult}"]`,
        `[TimeControl "-"]`,
        `[WhiteElo "${playerColor === 'white' ? '?' : config.difficulty ? config.difficulty * 400 : '?'}"]`,
        `[BlackElo "${playerColor === 'black' ? '?' : config.difficulty ? config.difficulty * 400 : '?'}"]`,
        `[Termination "${finalResultMessage}"]`,
      ];
      
      // Utiliser currentMoveHistory passé en paramètre
      const moves = currentMoveHistory;

      let movesStr = '';
      
      if (moves.length === 0) {
        // Aucun coup joué
        movesStr = pgnResult;
      } else {
        // Formater les coups par paires (blancs + noirs)
        for (let i = 0; i < moves.length; i++) {
          if (i % 2 === 0) {
            movesStr += `${Math.floor(i / 2) + 1}. `;
          }
          movesStr += moves[i] + ' ';
          
          // Retour à la ligne tous les 8 coups pour la lisibilité
          if (i % 16 === 15 && i < moves.length - 1) {
            movesStr += '\n';
          }
        }
        
        // Ajouter le résultat à la fin
        movesStr += pgnResult;
      }
      
      // Assembler le PGN complet
      return headers.join('\n') + '\n\n' + movesStr;
    };

    const completePGN = generateCompletePGN();

    // Sauvegarder la partie
    try {
      await saveGameToCloud({
        opponentName: config.name || 'Bot IA',
        opponentAvatar: config.avatarUrl,
        opponentPlatform: config.platform,
        result: finalResultType,
        resultType: finalResultMessage.toLowerCase().includes('échec et mat') ? 'checkmate' :
                   finalResultMessage.toLowerCase().includes('abandon') ? 'resignation' :
                   finalResultMessage.toLowerCase().includes('pat') ? 'stalemate' :
                   finalResultMessage.toLowerCase().includes('triple répétition') ? 'threefold' :
                   finalResultMessage.toLowerCase().includes('50 coups') ? 'fifty_move' :
                   finalResultMessage.toLowerCase().includes('matériel insuffisant') ? 'insufficient_material' :
                   'agreement',
        resultMessage: finalResultMessage,
        playerColor,
        pgn: completePGN,
        finalFen: replay.fen(),
        movesCount: currentMoveHistory.length,
        durationSeconds: duration,
        capturesCount: captures,
        checksCount: checks,
        bestEval: undefined,
        worstEval: undefined,
        avgEval: undefined,
        botConfig: config
      });
      track("game_finished", {
        result: finalResultType,
        moves_count: currentMoveHistory.length,
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la partie:', error);
      // Ne pas bloquer l'affichage des résultats si la sauvegarde échoue
    }
  };

  // Réinitialiser la partie
  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setGameOver(false);
    setGameResult("");
    setGameResultType('draw');
    setMoveHistory([]);
    setLastMove(null);
    setMoveCount50(0);
    setShowResultModal(false);
    postGameStatsCancelRef.current += 1;
    liveEvalRequestRef.current += 1;
    setLiveEval(null);
    setPostGamePrecisionProgress(null);
    try {
      stopThinking();
    } catch {
      /* best-effort: interrupt post-game engine work */
    }
    setStartTime(new Date());
    track("game_started", { mode: "arena_bot" });
    setGameStats({
      totalMoves: 0,
      captures: 0,
      checks: 0,
      bestEval: null,
      worstEval: null,
      averageEval: null,
      precisionWhite: null,
      precisionBlack: null,
      eloWhite: null,
      eloBlack: null,
    });
    exitReviewMode();
    setReviewVariantsByAnchor({});
    setMoveAnnotations({});
    resetForcedLine();
  };

  // Abandonner
  const resign = () => {
    setGameOver(true);
    const message = playerColor === 'white' ? t.board.blackWinsResignation : t.board.whiteWinsResignation;
    setGameResult(message);
    setGameResultType('loss');
    calculateFinalStats('loss', message, moveHistory);
    setShowResultModal(true);
  };

  // Télécharger le PGN
  const handleDownloadPGN = () => {
    // Générer un PGN complet avec tous les headers
    const date = new Date();
    const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    
    // Déterminer le résultat au format PGN
    let pgnResult = '*';
    if (gameResultType === 'win') {
      pgnResult = playerColor === 'white' ? '1-0' : '0-1';
    } else if (gameResultType === 'loss') {
      pgnResult = playerColor === 'white' ? '0-1' : '1-0';
    } else if (gameResultType === 'draw') {
      pgnResult = '1/2-1/2';
    }
    
    // Déterminer les joueurs
    const whitePlayer = playerColor === 'white' ? t.playableBoard.player : (currentConfig.name || 'Bot IA');
    const blackPlayer = playerColor === 'black' ? t.playableBoard.player : (currentConfig.name || 'Bot IA');
    
    // Construire les headers PGN
    const headers = [
      `[Event "Chess Avatar Game"]`,
      `[Site "Chess Avatar"]`,
      `[Date "${dateStr}"]`,
      `[Time "${timeStr}"]`,
      `[Round "1"]`,
      `[White "${whitePlayer}"]`,
      `[Black "${blackPlayer}"]`,
      `[Result "${pgnResult}"]`,
      `[TimeControl "-"]`,
      `[WhiteElo "${playerColor === 'white' ? '?' : currentConfig.difficulty ? currentConfig.difficulty * 400 : '?'}"]`,
      `[BlackElo "${playerColor === 'black' ? '?' : currentConfig.difficulty ? currentConfig.difficulty * 400 : '?'}"]`,
      `[Termination "${gameResult}"]`,
    ];
    
    // Utiliser moveHistory au lieu de game.history() pour avoir TOUS les coups
    const moves = moveHistory;
    let movesStr = '';
    
    if (moves.length === 0) {
      // Aucun coup joué
      movesStr = pgnResult;
    } else {
      // Formater les coups par paires (blancs + noirs)
      for (let i = 0; i < moves.length; i++) {
        if (i % 2 === 0) {
          movesStr += `${Math.floor(i / 2) + 1}. `;
        }
        movesStr += moves[i] + ' ';
        
        // Retour à la ligne tous les 8 coups pour la lisibilité
        if (i % 16 === 15 && i < moves.length - 1) {
          movesStr += '\n';
        }
      }
      
      // Ajouter le résultat à la fin
      movesStr += pgnResult;
    }
    
    // Assembler le PGN complet
    const completePGN = headers.join('\n') + '\n\n' + movesStr;
    
    const blob = new Blob([completePGN], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partie-${currentConfig.name}-${dateStr}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Gestion des callbacks du modal
  const handleRematch = () => {
    setShowResultModal(false);
    setTimeout(resetGame, 300);
  };

  const handleSwitchColor = () => {
    setShowResultModal(false);
    if (onColorChange) {
      onColorChange();
    }
  };

  const handleConfigure = () => {
    setShowResultModal(false);
    setShowConfigDialog(true);
  };

  const handleConfigSave = () => {
    setShowConfigDialog(false);
    if (onConfigChange) {
      onConfigChange(currentConfig);
    }
  };

  const handlePromotionSelect = (piece: "q" | "r" | "b" | "n") => {
    if (reviewPromotionPending) {
      try {
        const fen = chessWithExplorationStack(
          moveHistory,
          currentMoveIndex,
          reviewExplorationSegments,
          reviewExplorationMoves
        ).fen();
        const board = new Chess(fen);
        const move = board.move({
          from: reviewPromotionPending.from,
          to: reviewPromotionPending.to,
          promotion: piece,
        });
        if (move) {
          setReviewExplorationMoves((prev) => [...prev, move.san]);
          setLastMove({
            from: reviewPromotionPending.from,
            to: reviewPromotionPending.to,
          });
          playMoveSoundIfEnabled();
        }
      } catch (error) {
        console.error("Erreur promotion (analyse):", error);
      }
      setShowReviewPromotion(false);
      setReviewPromotionPending(null);
      return;
    }

    if (!pendingPromotion) return;

    try {
      const board = chessFromSanHistory(moveHistory);
      const move = board.move({
        from: pendingPromotion.from,
        to: pendingPromotion.to,
        promotion: piece,
      });

      if (move) {
        const updatedHistory = [...moveHistory, move.san];
        setLastMove({ from: pendingPromotion.from, to: pendingPromotion.to });
        setGame(board);
        setMoveHistory(updatedHistory);
        moveHistoryRef.current = updatedHistory;
        gameRef.current = board;
        if (move.captured || move.piece === "p") {
          setMoveCount50(0);
        } else {
          setMoveCount50((prev) => prev + 1);
        }
        playMoveSoundIfEnabled();
        checkGameState(board, updatedHistory);
        if (!board.isGameOver()) {
          setTimeout(() => makeAIMove(), 500);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la promotion:", error);
    }

    setShowPromotionDialog(false);
    setPendingPromotion(null);
  };

  const deepenReviewSubLine = () => {
    if (reviewExplorationMoves.length === 0) return;
    setReviewExplorationSegments((prev) => [...prev, [...reviewExplorationMoves]]);
    setReviewExplorationMoves([]);
  };

  const liftReviewSubLine = () => {
    setReviewExplorationSegments((prev) => {
      if (prev.length === 0) return prev;
      const lastSeg = prev[prev.length - 1];
      setReviewExplorationMoves(lastSeg);
      return prev.slice(0, -1);
    });
  };

  const saveReviewVariant = () => {
    const flat = [...reviewExplorationSegments.flat(), ...reviewExplorationMoves];
    if (flat.length === 0) return;
    const anchor = currentMoveIndex;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `v-${Date.now()}`;
    const n = (reviewVariantsByAnchor[anchor]?.length ?? 0) + 1;
    const v: ReviewVariant = { id, label: `V${n}`, moves: flat };
    setReviewVariantsByAnchor((prev) => ({
      ...prev,
      [anchor]: [...(prev[anchor] ?? []), v],
    }));
  };

  const loadReviewVariant = (variant: ReviewVariant) => {
    setReviewExplorationSegments([]);
    setReviewExplorationMoves([...variant.moves]);
  };

  if (isArchiveMode && archiveLoadError) {
    return (
      <Alert variant="destructive" className="bg-red-950/40 border-red-700/50 text-red-100">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t.games.pgnLoadError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header compact avec actions */}
      <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Gauche: Statut */}
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-slate-900 border-green-500 text-xs">
            {playerColor === 'white' ? `⚪ ${t.play.whiteSide}` : `⚫ ${t.play.blackSide}`}
          </Badge>
          <div className="text-sm">
            <span className="font-semibold text-slate-200">
              {isArchiveMode && archiveViewLabel?.trim()
                ? archiveViewLabel.trim()
                : currentConfig.name}
            </span>
            <span className="text-xs text-slate-500 ml-2">
              {isArchiveMode
                ? t.games.archiveReviewStatus
                : isThinking
                  ? `🤔 ${t.play.thinking}`
                  : gameOver
                    ? `🏁 ${t.play.finished}`
                    : `⚡ ${t.play.ready}`}
            </span>
          </div>
          
          {/* Badge pour la ligne forcée */}
          {remainingForcedMoves && remainingForcedMoves.length > 0 && !gameOver && (
            <Badge variant="outline" className="bg-green-900/30 border-green-500 text-green-300 text-xs">
              🎯 {t.board.forcedLineLabel} ({remainingForcedMoves.length} {t.board.forcedLineMoves})
            </Badge>
          )}
        </div>

        {/* Droite: Actions compactes */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setBoardOrientation((prev) => (prev === "white" ? "black" : "white"))}
            variant="outline"
            size="sm"
            className="border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 gap-1"
            title={t.play.flipBoardTooltip}
            aria-label={t.play.flipBoardTooltip}
          >
            <RotateCw className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline text-xs whitespace-nowrap">
              {t.board.flipBoardShort}
            </span>
          </Button>

          {!isArchiveMode && (
            <Button
              onClick={() => setShowConfigDialog(true)}
              variant="outline"
              size="sm"
              className="border-cyan-500/50 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 gap-1"
              title={t.play.avatarConfigToolbarTooltip}
              aria-label={t.play.avatarConfigToolbarTooltip}
            >
              <Bot className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline text-xs whitespace-nowrap">
                {t.play.avatarConfigButtonCompact}
              </span>
            </Button>
          )}

          {!isArchiveMode && (
            <Button
              onClick={resetGame}
              variant="outline"
              size="sm"
              className="border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 gap-1"
              title={t.play.newGameTooltip}
              aria-label={t.play.newGameTooltip}
            >
              <RotateCcw className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline text-xs">{t.play.newGame}</span>
            </Button>
          )}

          {!gameOver && (
            <Button
              onClick={resign}
              variant="outline"
              size="sm"
              className="border-red-500/50 bg-red-500/10 text-red-300 hover:bg-red-500/20 gap-1"
              title={t.play.resignTooltip}
              aria-label={t.play.resignTooltip}
            >
              <Flag className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline text-xs">{t.play.resign}</span>
            </Button>
          )}
        </div>
      </div>

      {!isArchiveMode && (
        <BotEngineSelector
          chessAvatarReady={isChessAvatarReady}
          chessAvatarPlayReady={isChessAvatarPlayReady}
          chessAvatarNnueLoading={isChessAvatarNnueLoading}
          chessAvatarSearchStats={chessAvatarSearchStats}
          stockfishReady={isStockfishReady}
          lastBotEngineUsed={lastBotEngineUsed}
          botElo={currentConfig.elo}
          botDifficulty={currentConfig.difficulty}
        />
      )}
      </div>

      {/* Modal de configuration - COMPACT (masqué en consultation archive) */}
      <Dialog open={!isArchiveMode && showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-slate-900 border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-lg">{t.play.avatarConfigDialogTitle}</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
              {t.play.avatarConfigDialogDescription}
            </DialogDescription>
          </DialogHeader>
          <EngineConfigPanel 
            initialConfig={config}
            onConfigChange={setCurrentConfig}
            onSave={handleConfigSave}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de résultat */}
      <GameResultModal
        open={showResultModal}
        result={gameResultType}
        resultMessage={gameResult}
        stats={gameStats}
        precisionAnalysisProgress={postGamePrecisionProgress}
        playerColor={playerColor}
        configName={currentConfig.name}
        onRematch={handleRematch}
        onSwitchColor={handleSwitchColor}
        onConfigure={handleConfigure}
        onDownloadPGN={handleDownloadPGN}
      />

      {/* Layout principal: Échiquier CENTRÉ + Historique DROITE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4">
        
        {/* COLONNE GAUCHE : Infos (2/12) */}
        <div className="order-2 lg:order-1 lg:col-span-2 space-y-3">
          {/* Infos compactes */}
          {!gameOver && (
            <Card className="p-3 bg-slate-900/50 border-slate-800">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{t.playableBoard.turn}</span>
                  <Badge variant="outline" className="border-cyan-500/50 text-cyan-300 text-xs">
                    {game.turn() === 'w' ? '⚪' : '⚫'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{t.playableBoard.moves}</span>
                  <span className="text-slate-200 font-semibold">{Math.floor(moveHistory.length / 2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{t.playableBoard.rule50}</span>
                  <Badge 
                    variant="outline" 
                    className={moveCount50 >= 40 ? "border-orange-500/70 text-orange-300 text-xs" : "border-slate-600 text-slate-400 text-xs"}
                  >
                    {moveCount50}/100
                  </Badge>
                </div>
                {moveCount50 >= 40 && (
                  <div className="text-xs text-orange-400 bg-orange-500/10 p-2 rounded border border-orange-500/30">
                    ⚠️ {t.playableBoard.nearDraw}
                  </div>
                )}
              </div>
            </Card>
          )}

          {!isArchiveMode && !reviewMode && (
            <Card className="p-3 bg-slate-900/50 border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-300">{t.playableBoard.showEvalBar}</span>
                <Switch
                  checked={showEvalBar}
                  onCheckedChange={(v) => {
                    setShowEvalBar(v);
                    try {
                      localStorage.setItem(PLAY_EVAL_BAR_STORAGE_KEY, v ? "1" : "0");
                    } catch {
                      /* ignore */
                    }
                  }}
                  aria-label={t.playableBoard.showEvalBar}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-300">{t.playableBoard.showTheoryArrows}</span>
                <Switch
                  checked={showTheoryHints}
                  onCheckedChange={(v) => {
                    setShowTheoryHints(v);
                    try {
                      localStorage.setItem(PLAY_THEORY_ARROWS_STORAGE_KEY, v ? "1" : "0");
                    } catch {
                      /* ignore */
                    }
                  }}
                  aria-label={t.playableBoard.showTheoryArrows}
                />
              </div>
            </Card>
          )}

          {!isArchiveMode && !reviewMode && (
            <Card className="p-3 bg-slate-900/50 border-slate-800">
              <h4 className="text-xs font-semibold text-slate-300 mb-2">
                {t.playableBoard.openingHeading}
              </h4>
              <div className="space-y-1.5 text-[11px]">
                {moveHistory.length === 0 ? (
                  <p className="text-slate-500">{t.playableBoard.openingEmpty}</p>
                ) : openingHints?.titleLine ? (
                  <>
                    <p className="text-slate-200 leading-snug">{openingHints.titleLine}</p>
                    {openingHints.opening && !openingHints.aligned && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-amber-500/50 text-amber-300"
                      >
                        {t.playableBoard.outOfBookBadge}
                      </Badge>
                    )}
                    {openingHints.subtitleLine ? (
                      <p className="text-slate-500 text-[10px] pt-1 border-t border-slate-800 leading-snug">
                        <span className="font-medium text-slate-400">
                          {t.playableBoard.transpositionsHeading}
                        </span>
                        <br />
                        {openingHints.subtitleLine}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-slate-500">{t.playableBoard.openingUnknown}</p>
                )}
              </div>
            </Card>
          )}

          {/* Raccourcis des flèches style Lichess */}
          <Card className="p-3 bg-slate-900/50 border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 mb-2">
              {lang === "fr" ? "Raccourcis flèches" : "Arrow shortcuts"}
            </h4>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">{lang === "fr" ? "Clic droit" : "Right click"}</span>
                <span className="inline-flex items-center gap-1 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LICHESS_ARROW_COLORS.defaultGreen }} />
                  Green
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Alt + {lang === "fr" ? "clic droit" : "right click"}</span>
                <span className="inline-flex items-center gap-1 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LICHESS_ARROW_COLORS.altBlue }} />
                  Blue
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Shift/Ctrl + {lang === "fr" ? "clic droit" : "right click"}</span>
                <span className="inline-flex items-center gap-1 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LICHESS_ARROW_COLORS.shiftCtrlRed }} />
                  Red
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Alt + Shift/Ctrl + {lang === "fr" ? "clic droit" : "right click"}</span>
                <span className="inline-flex items-center gap-1 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LICHESS_ARROW_COLORS.shiftCtrlAltYellow }} />
                  Yellow
                </span>
              </div>
              <div className="pt-1 text-[10px] text-slate-500">
                {lang === "fr"
                  ? "Esc: effacer flèches + cercles"
                  : "Esc: clear arrows + circles"}
              </div>
            </div>
          </Card>
        </div>

        {/* COLONNE CENTRALE : Échiquier (7/12) */}
        <div className="order-1 lg:order-2 lg:col-span-7 space-y-3">
          {showEvalBar && !isArchiveMode && !reviewMode && (
            <EvaluationBar evaluation={liveEval} />
          )}
          {reviewMode && (
            <div
              role="status"
              className="flex w-full min-w-0 flex-col gap-1 rounded-lg border border-purple-500/35 bg-purple-950/35 px-2.5 py-2 text-purple-100 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1 sm:px-3 sm:py-2"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold sm:text-sm">
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-purple-300" aria-hidden />
                <span className="truncate">{t.play.reviewModeBanner}</span>
              </span>
              <span className="text-[11px] font-medium tabular-nums text-purple-200/95 sm:text-xs">
                {moveHistory.length === 0
                  ? "—"
                  : currentMoveIndex < 0
                    ? t.play.reviewMoveAtStart
                    : t.play.reviewMoveAt
                        .replace("{n}", String(currentMoveIndex + 1))
                        .replace("{total}", String(moveHistory.length))}
              </span>
            </div>
          )}
          {/* Échiquier - ÉLÉMENT CENTRAL */}
          <Card className="p-2 sm:p-4 lg:p-6 bg-slate-900 border-slate-800 shadow-xl">
            <SimpleChessboard
              position={
                reviewMode && reviewPositionChess
                  ? reviewPositionChess.fen()
                  : game.fen()
              }
              onDrop={onDrop}
              orientation={boardOrientation}
              lastMove={boardLastMoveForDisplay}
              squareEmojis={reviewSquareEmojis}
              arrows={
                !reviewMode
                  ? [
                      ...(lastMove
                        ? [
                            {
                              from: lastMove.from,
                              to: lastMove.to,
                              color: LICHESS_ARROW_COLORS.shiftCtrlAltYellow,
                            },
                          ]
                        : []),
                      ...forcedLineArrows,
                      ...theoryBoardArrows,
                    ]
                  : []
              }
            />
          </Card>

          {/* Résultat de la partie */}
          {gameOver && gameResult && (
            <Alert className={`${
              gameResultType === 'win' ? 'bg-green-900/20 border-green-500' :
              gameResultType === 'loss' ? 'bg-red-900/20 border-red-500' :
              'bg-amber-900/20 border-amber-500'
            }`}>
              <AlertCircle className={`h-4 w-4 ${
                gameResultType === 'win' ? 'text-green-400' :
                gameResultType === 'loss' ? 'text-red-400' :
                'text-amber-400'
              }`} />
              <AlertDescription className={`font-bold ${
                gameResultType === 'win' ? 'text-green-300' :
                gameResultType === 'loss' ? 'text-red-300' :
                'text-amber-300'
              }`}>
                {gameResult}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* COLONNE DROITE : Historique (3/12) - LE PLUS À DROITE */}
        <div className="order-3 lg:col-span-3">
          <Card className="p-3 bg-slate-900/50 border-slate-800 lg:sticky lg:top-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-cyan-400" />
                Historique
              </h3>
              {reviewMode && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={exitReviewMode}
                  className="h-6 text-xs text-purple-400 hover:text-purple-300"
                  title="Retour à la position actuelle (End)"
                >
                  ↩ Actuel
                </Button>
              )}
            </div>
            <div className="text-[10px] text-slate-500 mb-2 flex flex-wrap items-center gap-1">
              <span>⌨️ ← →</span>
              <span>•</span>
              <span>{lang === "fr" ? "Clic coup" : "Move click"}</span>
              <span>•</span>
              <span>{lang === "fr" ? "Clic droit flèches" : "Right-click arrows"}</span>
            </div>
            {reviewMode && (
              <div className="mb-3 space-y-2 rounded-md border border-purple-500/30 bg-purple-950/20 p-2">
                <p className="text-[10px] text-purple-200/90 leading-snug">
                  {t.play.reviewExplorationHint}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] border-purple-500/40 text-purple-200"
                    onClick={saveReviewVariant}
                  >
                    <GitBranch className="h-3 w-3 mr-1" />
                    {t.play.reviewSaveVariant}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] border-purple-500/40 text-purple-200"
                    onClick={deepenReviewSubLine}
                  >
                    {t.play.reviewSubLine}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] border-purple-500/40 text-purple-200"
                    onClick={liftReviewSubLine}
                    disabled={reviewExplorationSegments.length === 0}
                  >
                    {t.play.reviewPopSubLine}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] border-purple-500/40 text-purple-200"
                    onClick={() => setReviewExplorationMoves((m) => m.slice(0, -1))}
                    disabled={reviewExplorationMoves.length === 0}
                  >
                    <Undo2 className="h-3 w-3 mr-1" />
                    {t.play.reviewUndoMove}
                  </Button>
                </div>
                {(reviewVariantsByAnchor[currentMoveIndex]?.length ?? 0) > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-purple-300">
                      {t.play.reviewVariants}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {reviewVariantsByAnchor[currentMoveIndex]!.map((v) => (
                        <Button
                          key={v.id}
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-6 px-2 text-[10px] bg-slate-800 text-slate-200"
                          onClick={() => loadReviewVariant(v)}
                        >
                          {v.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {annotatingMoveIndex !== null && (
                  <div className="rounded border border-slate-600 bg-slate-900/80 p-2 space-y-2">
                    <div className="text-[10px] text-slate-400">
                      {t.play.reviewPickEmoji}{" "}
                      <span className="text-slate-200 font-mono">
                        #{annotatingMoveIndex + 1}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-0.5">
                      {REVIEW_EMOJI_CHOICES.map((em) => (
                        <button
                          key={em}
                          type="button"
                          className="rounded px-1.5 py-0.5 text-base hover:bg-slate-700"
                          onClick={() => {
                            setMoveAnnotations((prev) => ({
                              ...prev,
                              [annotatingMoveIndex]: {
                                ...prev[annotatingMoveIndex],
                                emoji: em,
                              },
                            }));
                            setAnnotatingMoveIndex(null);
                          }}
                        >
                          {em}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="ml-1 text-[10px] text-slate-500 underline"
                        onClick={() => {
                          setMoveAnnotations((prev) => {
                            const next = { ...prev };
                            const cur = next[annotatingMoveIndex];
                            if (cur) {
                              const rest = { ...cur };
                              delete rest.emoji;
                              if (Object.keys(rest).length === 0)
                                delete next[annotatingMoveIndex];
                              else
                                next[annotatingMoveIndex] = rest as {
                                  emoji?: string;
                                  note?: string;
                                };
                            }
                            return next;
                          });
                          setAnnotatingMoveIndex(null);
                        }}
                      >
                        {lang === "fr" ? "Effacer émoji" : "Clear emoji"}
                      </button>
                    </div>
                    <Input
                      placeholder={t.play.reviewNotePlaceholder}
                      value={moveAnnotations[annotatingMoveIndex]?.note ?? ""}
                      onChange={(e) =>
                        setMoveAnnotations((prev) => ({
                          ...prev,
                          [annotatingMoveIndex]: {
                            ...prev[annotatingMoveIndex],
                            note: e.target.value,
                          },
                        }))
                      }
                      className="h-8 text-xs bg-slate-950 border-slate-600"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] text-slate-400"
                      onClick={() => setAnnotatingMoveIndex(null)}
                    >
                      OK
                    </Button>
                  </div>
                )}
              </div>
            )}
            <div className="max-h-[38dvh] sm:max-h-[48dvh] lg:max-h-[70vh] overflow-y-auto pr-1 pb-[env(safe-area-inset-bottom)]">
              {moveHistory.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">
                  Aucun coup joué
                </p>
              ) : (
                <div className="space-y-0.5">
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, idx) => {
                    const whiteIndex = idx * 2;
                    const blackIndex = idx * 2 + 1;
                    return (
                      <div 
                        key={idx} 
                        className="flex items-center gap-1 p-1.5 rounded hover:bg-slate-800/50 transition-colors"
                      >
                        <span className="text-xs text-slate-600 font-semibold w-5">{idx + 1}.</span>
                        <div className="flex-1 flex gap-1 font-mono text-xs items-center">
                          <div className="flex flex-1 items-center gap-0.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleMoveClick(whiteIndex)}
                              className={`px-1.5 py-0.5 rounded flex-1 text-center transition-all cursor-pointer min-w-0 flex flex-wrap items-center justify-center gap-0.5 ${
                                reviewMode && currentMoveIndex === whiteIndex
                                  ? "bg-purple-600 text-white ring-2 ring-purple-400"
                                  : "text-slate-200 bg-slate-800 hover:bg-slate-700"
                              }`}
                              title={`Aller au coup ${whiteIndex + 1}`}
                            >
                              <SanNotation
                                verboseMove={
                                  moveHistoryVerbose?.[whiteIndex] ?? null
                                }
                                fallbackSan={moveHistory[whiteIndex] || ""}
                                movingColor="w"
                                pieceSet={boardUiSettings.pieceSet}
                                size="sm"
                              />
                              {moveAnnotations[whiteIndex]?.emoji
                                ? ` ${moveAnnotations[whiteIndex].emoji}`
                                : ""}
                            </button>
                            {reviewMode && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setAnnotatingMoveIndex(whiteIndex);
                                }}
                                className="shrink-0 p-0.5 rounded text-slate-500 hover:text-amber-300 hover:bg-slate-700"
                                title={t.play.reviewPickEmoji}
                              >
                                <Smile className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          {moveHistory[blackIndex] && (
                            <div className="flex flex-1 items-center gap-0.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleMoveClick(blackIndex)}
                                className={`px-1.5 py-0.5 rounded flex-1 text-center transition-all cursor-pointer min-w-0 flex flex-wrap items-center justify-center gap-0.5 ${
                                  reviewMode && currentMoveIndex === blackIndex
                                    ? "bg-purple-600 text-white ring-2 ring-purple-400"
                                    : "text-slate-300 bg-slate-800/50 hover:bg-slate-700"
                                }`}
                                title={`Aller au coup ${blackIndex + 1}`}
                              >
                                <SanNotation
                                  verboseMove={
                                    moveHistoryVerbose?.[blackIndex] ?? null
                                  }
                                  fallbackSan={moveHistory[blackIndex] ?? ""}
                                  movingColor="b"
                                  pieceSet={boardUiSettings.pieceSet}
                                  size="sm"
                                />
                                {moveAnnotations[blackIndex]?.emoji
                                  ? ` ${moveAnnotations[blackIndex].emoji}`
                                  : ""}
                              </button>
                              {reviewMode && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setAnnotatingMoveIndex(blackIndex);
                                  }}
                                  className="shrink-0 p-0.5 rounded text-slate-500 hover:text-amber-300 hover:bg-slate-700"
                                  title={t.play.reviewPickEmoji}
                                >
                                  <Smile className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Dialogue de promotion */}
      <PromotionDialog
        open={showPromotionDialog || showReviewPromotion}
        color={playerColor}
        pieceColor={
          showReviewPromotion && reviewPositionChess
            ? reviewPositionChess.turn() === "w"
              ? "w"
              : "b"
            : undefined
        }
        onSelect={handlePromotionSelect}
      />
    </div>
  );
}
