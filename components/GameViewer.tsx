"use client";

import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { ChevronLeft, ChevronRight, Play, RotateCcw, Pause, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SimpleChessboard from "./SimpleChessboard";
import EvaluationBar from "./EvaluationBar";
import { useStockfish } from "@/hooks/useStockfish";
import { useLanguage } from "@/lib/language-context";

interface GameViewerProps {
  pgn: string;
}

export default function GameViewer({ pgn }: GameViewerProps) {
  const { t } = useLanguage();
  const [gamePositions, setGamePositions] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  
  const { isReady, currentEval, sendCommand } = useStockfish();

  useEffect(() => {
    if (!pgn) return;

    try {
      const tempGame = new Chess();
      tempGame.loadPgn(pgn);
      const moves = tempGame.history();
      
      // Déterminer la couleur du joueur depuis le PGN
      const pgnLower = pgn.toLowerCase();
      if (pgnLower.includes('[black ') && pgnLower.includes('you')) {
        setPlayerColor('black');
        setBoardOrientation('black');
      } else {
        setPlayerColor('white');
        setBoardOrientation('white');
      }
      
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

  // Analyser la position courante avec Stockfish
  useEffect(() => {
    if (isReady && gamePositions.length > 0 && currentIndex < gamePositions.length) {
      const currentFen = gamePositions[currentIndex];
      sendCommand(`position fen ${currentFen}`);
      sendCommand('go depth 15');
    }
  }, [currentIndex, gamePositions, isReady, sendCommand]);

  // Auto-Play
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentIndex < gamePositions.length - 1) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 1000);
    } else {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, gamePositions.length]);

  // Contrôles
  const handleNext = () => {
    if (currentIndex < gamePositions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const currentFen = gamePositions.length > 0 ? gamePositions[currentIndex] : "start";

  return (
    <div className="space-y-4">
      {/* Barre d'évaluation */}
      {currentEval !== null && (
        <EvaluationBar 
          evaluation={currentEval} 
          playerColor={playerColor}
        />
      )}

      {/* Échiquier */}
      <div className="flex items-start gap-4">
        <Card className="p-6 bg-slate-900 border-slate-800 flex-1">
          <SimpleChessboard 
            position={currentFen} 
            orientation={boardOrientation}
          />
        </Card>

        {/* Contrôles à droite */}
        <div className="space-y-3">
          {/* Bouton rotation */}
          <Button
            onClick={() => setBoardOrientation(prev => prev === 'white' ? 'black' : 'white')}
            variant="outline"
            size="sm"
            className="w-full border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
            title={t.gameViewer.flipBoard}
          >
            <RotateCw className="h-4 w-4 mr-2" />
            {t.gameViewer.flipBoard}
          </Button>

          <Card className="p-3 bg-slate-950 border-slate-800">
            <div className="space-y-2">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleReset} 
                className="w-full hover:bg-slate-800 hover:text-slate-100"
                title={t.gameViewer.resetToStart}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t.gameViewer.start}
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={handlePrev} 
                  disabled={currentIndex === 0} 
                  className="flex-1"
                  title={t.gameViewer.prevMove}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={handleNext} 
                  disabled={currentIndex >= gamePositions.length - 1} 
                  className="flex-1"
                  title={t.gameViewer.nextMove}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-center text-sm font-mono text-slate-300 py-2 bg-slate-900 rounded">
                <span className="text-cyan-400 font-bold">
                  {Math.floor(currentIndex / 2) + 1}
                </span> 
                <span className="text-slate-600 mx-1">/</span> 
                <span className="text-slate-400">
                  {Math.floor((gamePositions.length - 1) / 2) + 1}
                </span>
              </div>

              <Button 
                size="sm" 
                variant={isPlaying ? "destructive" : "default"} 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`w-full ${!isPlaying && 'bg-green-600 hover:bg-green-500'}`}
                title={isPlaying ? t.gameViewer.pause : t.gameViewer.playAuto}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Lire
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}