"use client";

import { useState, useEffect, useMemo } from "react";
import { Chess } from "chess.js";
import { ChevronLeft, ChevronRight, Play, RotateCcw, Pause, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SimpleChessboard from "./SimpleChessboard";
import EvaluationBar from "./EvaluationBar";
import { useContinuousAnalysis } from "@/hooks/useContinuousAnalysis";
import ContinuousAnalysisPanel from "./game-reviewer/ContinuousAnalysisPanel";
import ContinuousAnalysisToggle from "./game-reviewer/ContinuousAnalysisToggle";
import { uciToSquares } from "@/lib/game-review";
import { isLegalUciMove } from "@/lib/continuous-analysis-utils";
import { useLanguage } from "@/lib/language-context";

interface GameViewerProps {
  pgn: string;
}

function parsePgnForViewer(pgn: string): {
  positions: string[];
  playerColor: "white" | "black";
} | null {
  if (!pgn) return null;
  try {
    const tempGame = new Chess();
    tempGame.loadPgn(pgn);
    const moves = tempGame.history();
    const pgnLower = pgn.toLowerCase();
    const playerColor =
      pgnLower.includes("[black ") && pgnLower.includes("you")
        ? "black"
        : "white";
    const positions: string[] = [];
    const replayGame = new Chess();
    positions.push(replayGame.fen());
    moves.forEach((move) => {
      replayGame.move(move);
      positions.push(replayGame.fen());
    });
    return { positions, playerColor };
  } catch {
    return null;
  }
}

export default function GameViewer({ pgn }: GameViewerProps) {
  return <GameViewerInner key={pgn} pgn={pgn} />;
}

function GameViewerInner({ pgn }: GameViewerProps) {
  const { t } = useLanguage();
  const parsed = useMemo(() => parsePgnForViewer(pgn), [pgn]);
  const gamePositions = useMemo(
    () => parsed?.positions ?? [],
    [parsed]
  );
  const playerColor = parsed?.playerColor ?? "white";
  const [boardOrientation, setBoardOrientation] = useState<
    "white" | "black"
  >(playerColor);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const continuous = useContinuousAnalysis();

  const currentFen =
    gamePositions.length > 0 ? gamePositions[currentIndex] : new Chess().fen();

  useEffect(() => {
    continuous.bindFen(currentFen);
  }, [currentFen, continuous.bindFen]);

  useEffect(() => {
    if (!isPlaying || currentIndex >= gamePositions.length - 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, gamePositions.length]);

  useEffect(() => {
    if (
      isPlaying &&
      gamePositions.length > 0 &&
      currentIndex >= gamePositions.length - 1
    ) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentIndex, gamePositions.length]);

  const handleNext = () => {
    if (currentIndex < gamePositions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
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

  const arrows: Array<{ from: string; to: string; color?: string }> = [];
  if (
    continuous.enabled &&
    continuous.display?.bestMoveUci &&
    isLegalUciMove(currentFen, continuous.display.bestMoveUci)
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
    continuous.enabled && continuous.display
      ? continuous.display.evalWhitePov
      : currentIndex === 0
        ? 0
        : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <ContinuousAnalysisToggle
          enabled={continuous.enabled}
          onToggle={continuous.toggle}
        />
      </div>

      <EvaluationBar evaluation={evalForBar} />

      <ContinuousAnalysisPanel
        enabled={continuous.enabled}
        engineReady={continuous.engineReady}
        isAnalyzing={continuous.isAnalyzing}
        paused={continuous.paused}
        display={continuous.display}
      />

      <div className="flex flex-col lg:flex-row items-start gap-4">
        <Card className="p-3 sm:p-4 bg-slate-900 border-slate-800 flex-1 min-w-0 w-full">
          <div className="chessboard-frame chessboard-frame--viewer w-full">
            <SimpleChessboard
              position={currentFen}
              orientation={boardOrientation}
              arrows={arrows}
              boardMaxWidth="100%"
            />
          </div>
        </Card>

        <div className="space-y-3 w-full lg:w-auto shrink-0">
          <Button
            onClick={() =>
              setBoardOrientation((prev) =>
                prev === "white" ? "black" : "white"
              )
            }
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
                className={`w-full ${!isPlaying && "bg-green-600 hover:bg-green-500"}`}
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
