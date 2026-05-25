"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Check, Crown, Lock, Sparkles } from "lucide-react";
import type { AscensionPuzzleListItem } from "@/lib/ascension/client";
import type { ChampionCardModel } from "@/lib/ascension/types";
import {
  ASCENSION_PATH_NODES,
  ASCENSION_PATH_VIEW_HEIGHT,
  buildAscensionPathD,
  pathNodeToStyle,
} from "@/lib/ascension/progress-path";
import { useLanguage } from "@/lib/language-context";

interface AscensionProgressPathProps {
  puzzles: AscensionPuzzleListItem[];
  card: ChampionCardModel;
  selectedPuzzleId: string | null;
  onSelectPuzzle: (id: string) => void;
  progressNodeIndex: number;
  animateToIndex: number | null;
  onAnimationComplete?: () => void;
}

function PathChampionToken({
  avatarUrl,
  displayName,
  tier,
  node,
  isMoving,
  onTransitionEnd,
}: {
  avatarUrl: string | null;
  displayName: string;
  tier: ChampionCardModel["tier"];
  node: { x: number; y: number };
  isMoving: boolean;
  onTransitionEnd: () => void;
}) {
  const style = pathNodeToStyle(node);

  return (
    <div
      className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-[left,top,transform] duration-700 ease-in-out ${
        isMoving ? "scale-110" : "scale-100"
      }`}
      style={style}
      onTransitionEnd={(e) => {
        if (e.propertyName === "left" || e.propertyName === "top") {
          onTransitionEnd();
        }
      }}
    >
      <div
        className={`relative w-10 h-[52px] md:w-11 md:h-14 rounded-md border-2 bg-gradient-to-b from-slate-800 to-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.45)] overflow-hidden ${
          tier === "legendary"
            ? "border-purple-400"
            : tier === "gold"
              ? "border-amber-400"
              : "border-cyan-400"
        } ${isMoving ? "animate-pulse" : ""}`}
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt={displayName} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Sparkles className="h-4 w-4 text-cyan-300" />
          </div>
        )}
      </div>
      <div className="absolute -bottom-1 left-1/2 h-2 w-6 -translate-x-1/2 rounded-full bg-black/40 blur-[2px]" />
    </div>
  );
}

export default function AscensionProgressPath({
  puzzles,
  card,
  selectedPuzzleId,
  onSelectPuzzle,
  progressNodeIndex,
  animateToIndex,
  onAnimationComplete,
}: AscensionProgressPathProps) {
  const { lang, t } = useLanguage();
  const uiLang = lang === "fr" ? "fr" : "en";
  const animationHandled = useRef(false);

  const sorted = useMemo(
    () => [...puzzles].sort((a, b) => a.sort_order - b.sort_order),
    [puzzles]
  );

  const pathD = useMemo(
    () => buildAscensionPathD(ASCENSION_PATH_NODES.slice(0, sorted.length)),
    [sorted.length]
  );
  const currentIdx = sorted.findIndex((p) => p.id === selectedPuzzleId);
  const completedCount = sorted.filter((p) => p.completed).length;
  const eloPct = Math.min(100, (card.elo / 3000) * 100);

  const [visualIndex, setVisualIndex] = useState(progressNodeIndex);

  useEffect(() => {
    if (animateToIndex == null) {
      setVisualIndex(progressNodeIndex);
      animationHandled.current = false;
      return;
    }

    setVisualIndex(progressNodeIndex);
    animationHandled.current = false;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisualIndex(animateToIndex));
    });
    return () => cancelAnimationFrame(frame);
  }, [animateToIndex, progressNodeIndex]);

  const visualNode = ASCENSION_PATH_NODES[visualIndex] ?? ASCENSION_PATH_NODES[0]!;

  const handleTokenTransitionEnd = () => {
    if (animateToIndex == null || animationHandled.current) return;
    animationHandled.current = true;
    onAnimationComplete?.();
  };

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-slate-950/90 to-emerald-950/20 overflow-hidden">
      <div className="p-4 border-b border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-400" />
            {t.ascension.progressPath}
          </h3>
          <span className="text-xs text-cyan-300 tabular-nums font-medium">
            {card.elo} / 3000 ELO
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>{t.ascension.tiers[card.tier]}</span>
            <span>
              {completedCount}/{sorted.length} {t.ascension.puzzlesCompleted}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-700 via-cyan-500 to-amber-400 transition-all duration-500"
              style={{ width: `${eloPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="relative p-2 min-h-[420px] md:min-h-[480px]">
        <svg
          viewBox={`0 0 100 ${ASCENSION_PATH_VIEW_HEIGHT}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <linearGradient id="ascensionPathGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgb(16 185 129 / 0.15)" />
              <stop offset="100%" stopColor="rgb(34 211 238 / 0.35)" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100" height={ASCENSION_PATH_VIEW_HEIGHT} fill="url(#ascensionPathGrad)" rx="4" />
          <path
            d={pathD}
            fill="none"
            stroke="rgb(34 211 238 / 0.2)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d={pathD}
            fill="none"
            stroke="rgb(16 185 129 / 0.5)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${(completedCount / Math.max(1, sorted.length - 1)) * 200} 400`}
            className="transition-all duration-700"
          />
        </svg>

        {sorted.map((puzzle, idx) => {
          const node = ASCENSION_PATH_NODES[idx];
          if (!node) return null;
          const isSelected = puzzle.id === selectedPuzzleId;
          const isCurrent = idx === currentIdx || (currentIdx < 0 && idx === 0);
          const isLocked = card.elo < puzzle.min_elo;
          const label = puzzle.prompt[uiLang] || puzzle.slug;
          const isTokenHere = visualIndex === idx;

          return (
            <button
              key={puzzle.id}
              type="button"
              disabled={isLocked}
              onClick={() => onSelectPuzzle(puzzle.id)}
              title={label}
              className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-full"
              style={pathNodeToStyle(node)}
            >
              <div
                className={`relative flex flex-col items-center gap-1 transition-transform ${
                  isLocked ? "opacity-45 cursor-not-allowed" : "hover:scale-105"
                } ${isTokenHere ? "opacity-0" : ""}`}
              >
                <div
                  className={`w-11 h-11 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center text-sm font-bold shadow-lg transition-colors ${
                    puzzle.completed
                      ? "border-emerald-400 bg-emerald-950/80 text-emerald-300"
                      : isSelected || isCurrent
                        ? "border-cyan-400 bg-cyan-950/90 text-cyan-100 ring-2 ring-cyan-400/40"
                        : puzzle.kind === "fantasy"
                          ? "border-purple-500/60 bg-purple-950/60 text-purple-200"
                          : "border-slate-600 bg-slate-900/90 text-slate-300"
                  }`}
                >
                  {puzzle.completed ? (
                    <Check className="h-5 w-5" />
                  ) : isLocked ? (
                    <Lock className="h-4 w-4" />
                  ) : puzzle.kind === "fantasy" ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`max-w-[72px] text-[9px] leading-tight text-center line-clamp-2 ${
                    isSelected ? "text-cyan-200 font-medium" : "text-slate-500"
                  }`}
                >
                  {label}
                </span>
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                )}
              </div>
            </button>
          );
        })}

        <PathChampionToken
          avatarUrl={card.avatarUrl ?? null}
          displayName={card.displayName}
          tier={card.tier}
          node={visualNode}
          isMoving={animateToIndex != null}
          onTransitionEnd={handleTokenTransitionEnd}
        />
      </div>
    </div>
  );
}
