"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Chess } from "chess.js";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import { buildVerboseHistoryFromSan } from "@/lib/move-history-verbose";
import SanNotation from "./SanNotation";
import { ChevronLeft, ChevronRight, Play, RotateCcw, Pause, RotateCw, ChevronsRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SimpleChessboard from "./SimpleChessboard";
import { useLanguage } from "@/lib/language-context";
import {
  REVIEW_PGN_SESSION_KEY,
  clearReviewSessionContext,
} from "@/lib/review-session";

interface AdvancedGameViewerProps {
  pgn: string;
  playerColor?: 'white' | 'black';
}

export default function AdvancedGameViewer({ pgn, playerColor = 'white' }: AdvancedGameViewerProps) {
  const { settings: boardUiSettings } = useChessboardSettings();
  const router = useRouter();
  const { t } = useLanguage();

  const openReview = useCallback(() => {
    if (!pgn || typeof window === "undefined") return;
    clearReviewSessionContext();
    sessionStorage.setItem(REVIEW_PGN_SESSION_KEY, pgn);
    router.push("/review");
  }, [pgn, router]);
  const [gamePositions, setGamePositions] = useState<string[]>([]);
  const [movesData, setMovesData] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>(playerColor);

  useEffect(() => {
    if (!pgn) return;

    try {
      const tempGame = new Chess();
      tempGame.loadPgn(pgn);
      const moves = tempGame.history();
      setMovesData(moves);
      
      const positions: string[] = [];
      const replayGame = new Chess();
      positions.push(replayGame.fen());
      
      moves.forEach((move) => {
        replayGame.move(move);
        positions.push(replayGame.fen());
      });

      setGamePositions(positions);
      setCurrentIndex(0);
      setIsPlaying(false);

    } catch (error) {
      console.error("Erreur de parsing PGN:", error);
    }
  }, [pgn]);

  const movesVerbose = useMemo(
    () => buildVerboseHistoryFromSan(movesData),
    [movesData]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < gamePositions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(false);
    }
  }, [currentIndex, gamePositions.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(false);
    }
  }, [currentIndex]);

  const handleReset = useCallback(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  // Navigation clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Home") {
        e.preventDefault();
        handleReset();
      } else if (e.key === "End") {
        e.preventDefault();
        setCurrentIndex(gamePositions.length - 1);
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentIndex,
    gamePositions.length,
    isPlaying,
    handleNext,
    handlePrev,
    handleReset,
  ]);

  // Auto-Play
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentIndex < gamePositions.length - 1) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 1500);
    } else if (currentIndex >= gamePositions.length - 1) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, gamePositions.length]);

  const currentFen = gamePositions.length > 0 ? gamePositions[currentIndex] : "start";

  return (
    <div className="space-y-3">
      {/* Barre de contrôle */}
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-xs">
          Coup {currentIndex}/{gamePositions.length - 1}
        </Badge>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={openReview}
            disabled={!pgn || gamePositions.length <= 1}
            className="h-7 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/10"
            title={t.review.reviewThisGame}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            <span className="text-xs">{t.review.reviewThisGame}</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')}
            className="h-7 text-slate-400 hover:text-slate-200"
            title="Retourner l'échiquier"
          >
            <RotateCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        
        {/* Échiquier + Contrôles */}
        <div className="lg:col-span-3 space-y-3">
          <Card className="p-4 bg-slate-900 border-slate-800">
            <SimpleChessboard 
              position={currentFen} 
              orientation={boardOrientation}
            />
          </Card>

          {/* Contrôles de navigation */}
          <Card className="p-3 bg-slate-950 border-slate-800">
            <div className="flex items-center justify-center gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleReset} 
                className="hover:bg-slate-800"
                title="Début (Home)"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={handlePrev} 
                disabled={currentIndex === 0} 
                title="Précédent (←)"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button 
                size="sm" 
                variant={isPlaying ? "destructive" : "default"} 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`${!isPlaying && 'bg-green-600 hover:bg-green-500'}`}
                title={isPlaying ? "Pause (Space)" : "Lire (Space)"}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>

              <Button 
                size="sm" 
                variant="secondary" 
                onClick={handleNext} 
                disabled={currentIndex >= gamePositions.length - 1} 
                title="Suivant (→)"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setCurrentIndex(gamePositions.length - 1)} 
                className="hover:bg-slate-800"
                title="Fin (End)"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-center text-[10px] text-slate-500 mt-2">
              ⌨️ ← → Espace Home End
            </div>
          </Card>
        </div>

        {/* Historique des coups */}
        <Card className="lg:col-span-1 p-3 bg-slate-950 border-slate-800 max-h-[600px] overflow-y-auto">
          <h3 className="text-sm font-semibold mb-2 text-slate-300">Historique</h3>
          <div className="space-y-1">
            {Array.from({ length: Math.ceil(movesData.length / 2) }).map((_, idx) => {
              const whiteIndex = idx * 2 + 1;
              const blackIndex = idx * 2 + 2;
              
              return (
                <div key={idx} className="flex items-center gap-1 text-xs">
                  <span className="text-slate-500 w-6">{idx + 1}.</span>
                  
                  {/* Coup blanc */}
                  <button
                    onClick={() => setCurrentIndex(whiteIndex)}
                    className={`flex-1 px-2 py-1 rounded text-left transition-colors flex items-center justify-center min-w-0 ${
                      currentIndex === whiteIndex
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <SanNotation
                      verboseMove={movesVerbose?.[idx * 2] ?? null}
                      fallbackSan={movesData[idx * 2]}
                      movingColor="w"
                      pieceSet={boardUiSettings.pieceSet}
                      size="sm"
                    />
                  </button>
                  
                  {/* Coup noir */}
                  {movesData[idx * 2 + 1] && (
                    <button
                      onClick={() => setCurrentIndex(blackIndex)}
                      className={`flex-1 px-2 py-1 rounded text-left transition-colors flex items-center justify-center min-w-0 ${
                        currentIndex === blackIndex
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <SanNotation
                        verboseMove={movesVerbose?.[idx * 2 + 1] ?? null}
                        fallbackSan={movesData[idx * 2 + 1] ?? ""}
                        movingColor="b"
                        pieceSet={boardUiSettings.pieceSet}
                        size="sm"
                      />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
