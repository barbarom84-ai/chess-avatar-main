"use client";

import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

interface BoardNavigationBarProps {
  currentIndex: number;
  totalPlies: number;
  autoPlay: boolean;
  onGoStart: () => void;
  onGoPrev: () => void;
  onGoNext: () => void;
  onGoEnd: () => void;
  onToggleAutoPlay: () => void;
  onFlipBoard: () => void;
  autoPlayDisabled?: boolean;
}

export default function BoardNavigationBar({
  currentIndex,
  totalPlies,
  autoPlay,
  onGoStart,
  onGoPrev,
  onGoNext,
  onGoEnd,
  onToggleAutoPlay,
  onFlipBoard,
  autoPlayDisabled = false,
}: BoardNavigationBarProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-2 py-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={onGoStart}
        disabled={currentIndex === 0}
        className="h-8 px-2 sm:px-3 hover:bg-slate-800"
        title={t.review.start}
      >
        <SkipBack className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline text-xs">{t.review.start}</span>
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={onGoPrev}
        disabled={currentIndex === 0}
        className="h-8 w-9 p-0"
        title={t.review.prev}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={autoPlay ? "destructive" : "default"}
        onClick={onToggleAutoPlay}
        disabled={autoPlayDisabled}
        className={`h-8 px-2 sm:px-3 ${!autoPlay ? "bg-green-600 hover:bg-green-500" : ""}`}
        title={autoPlay ? t.review.pause : t.review.playAuto}
      >
        {autoPlay ? (
          <>
            <Pause className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline text-xs">{t.review.pause}</span>
          </>
        ) : (
          <>
            <Play className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline text-xs">{t.review.playAuto}</span>
          </>
        )}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={onGoNext}
        disabled={currentIndex >= totalPlies}
        className="h-8 w-9 p-0"
        title={t.review.next}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onGoEnd}
        disabled={currentIndex >= totalPlies}
        className="h-8 px-2 sm:px-3 hover:bg-slate-800"
        title={t.review.end}
      >
        <SkipForward className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline text-xs">{t.review.end}</span>
      </Button>

      <span className="text-[11px] font-mono text-slate-400 px-1.5 tabular-nums">
        <span className="text-cyan-400 font-bold">{currentIndex}</span>
        <span className="text-slate-600 mx-0.5">/</span>
        <span>{totalPlies}</span>
      </span>

      <Button
        size="sm"
        variant="outline"
        onClick={onFlipBoard}
        className="h-8 px-2 sm:px-3 border-purple-500/40 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20"
        title={t.review.flipBoard}
      >
        <RotateCw className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline text-xs">{t.review.flipShort}</span>
      </Button>
    </div>
  );
}
