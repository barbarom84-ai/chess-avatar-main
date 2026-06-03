"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Check, Crown, Lock, Sparkles, Star } from "lucide-react";
import type { AscensionPuzzleListItem } from "@/lib/ascension/client";
import type { ChampionCardModel } from "@/lib/ascension/types";
import {
  ascensionContentHeight,
  buildAscensionPathD,
  generateAscensionNodes,
  pathNodeToStyle,
  NODE_SPACING_PX,
} from "@/lib/ascension/progress-path";
import { useLanguage } from "@/lib/language-context";
import { playerFantasyAbilities, getSkillById, skillIdForAbility } from "@/lib/ascension/skill-tree";
import type { PieceAbilityId } from "@/lib/ascension/fantasy-chess/types";
import { TIER_PUZZLE_THRESHOLDS, resolveChampionTierByCount } from "@/lib/ascension/tiers";
import type { ChampionTier } from "@/lib/ascension/types";

const MAX_VISIBLE_HEIGHT = 680;

/** X% position for fantasy bonus nodes (right column). */
const BONUS_X = 88;
/** Vertical spacing for bonus nodes (can be tighter or looser). */
const BONUS_SPACING = NODE_SPACING_PX;

interface AscensionProgressPathProps {
  puzzles: AscensionPuzzleListItem[];
  card: ChampionCardModel;
  selectedPuzzleId: string | null;
  onSelectPuzzle: (id: string) => void;
  /** Index in the standard-only sub-list. */
  progressNodeIndex: number;
  animateToIndex: number | null;
  onAnimationComplete?: () => void;
  /** Skills unlocked by the player — used to gate bonus puzzle access. */
  unlockedSkills: string[];
  /**
   * "main": classic campaign (standard puzzles on the path, fantasy as a bonus column).
   * "fantasy": the post-3000 Fantasy campaign — every puzzle is a sequential path node.
   */
  variant?: "main" | "fantasy";
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
      className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-[left,top] duration-700 ease-in-out ${
        isMoving ? "scale-110" : "scale-100"
      }`}
      style={style}
      onTransitionEnd={(e) => {
        if (e.propertyName === "left" || e.propertyName === "top") onTransitionEnd();
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
  unlockedSkills,
  variant = "main",
}: AscensionProgressPathProps) {
  const { lang, t } = useLanguage();
  const playerAbilities = useMemo(() => playerFantasyAbilities(unlockedSkills), [unlockedSkills]);
  const hasPowerSight = unlockedSkills.includes("power_sight");
  const uiLang = lang === "fr" ? "fr" : "en";
  const animationHandled = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => [...puzzles].sort((a, b) => a.sort_order - b.sort_order),
    [puzzles]
  );

  // In the main campaign, standard puzzles form the path and fantasy puzzles sit in a
  // bonus side column. In the Fantasy campaign, every puzzle is a sequential path node.
  const standardPuzzles = useMemo(
    () => (variant === "fantasy" ? sorted : sorted.filter((p) => p.kind === "standard")),
    [sorted, variant]
  );
  const fantasyPuzzles = useMemo(
    () => (variant === "fantasy" ? [] : sorted.filter((p) => p.kind === "fantasy")),
    [sorted, variant]
  );

  // Main path nodes (standard only)
  const standardNodes = useMemo(
    () => generateAscensionNodes(standardPuzzles.length),
    [standardPuzzles.length]
  );

  // Content height = enough for standard path OR for bonus column, whichever is taller
  const standardHeight = useMemo(
    () => ascensionContentHeight(standardPuzzles.length),
    [standardPuzzles.length]
  );
  const bonusHeight = useMemo(
    () =>
      fantasyPuzzles.length === 0
        ? 0
        : 52 + (fantasyPuzzles.length - 1) * BONUS_SPACING + 52,
    [fantasyPuzzles.length]
  );
  const contentHeight = Math.max(standardHeight, bonusHeight);

  // Bonus nodes: right column, stacked from bottom
  const bonusNodes = useMemo(() => {
    const bottomY = contentHeight - 52;
    return fantasyPuzzles.map((_, i) => ({
      x: BONUS_X,
      y: bottomY - i * BONUS_SPACING,
    }));
  }, [fantasyPuzzles.length, contentHeight]);

  const pathD = useMemo(() => buildAscensionPathD(standardNodes), [standardNodes]);
  const completedStandardCount = standardPuzzles.filter((p) => p.completed).length;
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

  // Auto-scroll to keep the current progress node visible
  useEffect(() => {
    const container = scrollRef.current;
    const targetNode = standardNodes[visualIndex];
    if (!container || !targetNode) return;
    const desired = targetNode.y - container.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, desired), behavior: "smooth" });
  }, [visualIndex, standardNodes]);

  const visualNode = standardNodes[visualIndex] ?? standardNodes[0];

  const handleTokenTransitionEnd = () => {
    if (animateToIndex == null || animationHandled.current) return;
    animationHandled.current = true;
    onAnimationComplete?.();
  };

  if (standardPuzzles.length === 0) {
    return (
      <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-slate-950/90 to-emerald-950/20 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800/80 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-400" />
              {t.ascension.progressPath}
            </h3>
            <span className="text-xs text-cyan-300 tabular-nums font-medium">
              {card.elo} / 3000 ELO
            </span>
          </div>
          <p className="text-xs text-slate-500 italic py-6 text-center">
            {t.ascension.trackEmpty}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-slate-950/90 to-emerald-950/20 overflow-hidden flex flex-col">
      {/* ── Header ── */}
      <div className="p-4 border-b border-slate-800/80 space-y-3 shrink-0">
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
              {completedStandardCount}/{standardPuzzles.length}{" "}
              {t.ascension.puzzlesCompleted}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-700 via-cyan-500 to-amber-400 transition-all duration-500"
              style={{ width: `${eloPct}%` }}
            />
          </div>
        </div>

        {/* Bonus quest count */}
        {fantasyPuzzles.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-purple-300/70">
            <Star className="h-3 w-3 text-amber-400/70" />
            <span>
              {fantasyPuzzles.filter((p) => p.completed).length}/{fantasyPuzzles.length}{" "}
              {t.ascension.bonusColumn}
            </span>
          </div>
        )}
      </div>

      {/* ── Scrollable path ── */}
      <div
        ref={scrollRef}
        className="relative overflow-y-auto"
        style={{ maxHeight: MAX_VISIBLE_HEIGHT }}
      >
        {/* Top fade */}
        <div className="pointer-events-none sticky top-0 z-10 h-8 bg-gradient-to-b from-slate-950/80 to-transparent" />

        <div className="relative" style={{ height: contentHeight }}>
          {/* ── Background SVG + main path ── */}
          <svg
            viewBox={`0 0 100 ${contentHeight}`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full pointer-events-none"
            style={{ height: contentHeight }}
            aria-hidden
          >
            <defs>
              <linearGradient id="ascPathGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="rgb(16 185 129 / 0.1)" />
                <stop offset="100%" stopColor="rgb(34 211 238 / 0.22)" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="100" height={contentHeight} fill="url(#ascPathGrad)" />

            {/* Separator between main path and bonus column */}
            {fantasyPuzzles.length > 0 && (
              <line
                x1="79" y1="0" x2="79" y2={contentHeight}
                stroke="rgba(168,85,247,0.15)"
                strokeWidth="0.5"
                strokeDasharray="4 6"
              />
            )}

            {/* Ghost track */}
            <path
              d={pathD}
              fill="none"
              stroke="rgb(34 211 238 / 0.15)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Progress line */}
            <path
              d={pathD}
              fill="none"
              stroke="rgb(16 185 129 / 0.55)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${(completedStandardCount / Math.max(1, standardPuzzles.length - 1)) * 1000} 2000`}
              className="transition-all duration-700"
            />
          </svg>

          {/* ── Standard puzzle nodes ── */}
          {standardPuzzles.map((puzzle, idx) => {
            const node = standardNodes[idx];
            if (!node) return null;
            const isSelected = puzzle.id === selectedPuzzleId;
            const isTokenHere = visualIndex === idx;
            const isLocked = puzzle.locked && !puzzle.completed;

            return (
              <button
                key={puzzle.id}
                type="button"
                onClick={() => !isLocked && onSelectPuzzle(puzzle.id)}
                disabled={isLocked}
                title={
                  isLocked
                    ? t.ascension.puzzleLockedPrevious
                    : (puzzle.prompt[uiLang] || puzzle.slug)
                }
                className={`absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-full ${
                  isLocked ? "cursor-not-allowed" : ""
                }`}
                style={pathNodeToStyle(node)}
              >
                <div
                  className={`relative flex flex-col items-center gap-1 transition-transform ${
                    isTokenHere ? "opacity-0" : isLocked ? "opacity-40" : "hover:scale-105"
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-full border-2 flex items-center justify-center text-sm font-bold shadow-lg transition-colors ${
                      isLocked
                        ? "border-slate-700/50 bg-slate-900/50 text-slate-600"
                        : puzzle.completed
                          ? "border-emerald-400 bg-emerald-950/80 text-emerald-300"
                          : isSelected
                            ? "border-cyan-400 bg-cyan-950/90 text-cyan-100 ring-2 ring-cyan-400/40"
                            : "border-slate-600 bg-slate-900/90 text-slate-300"
                    }`}
                  >
                    {isLocked ? (
                      <Lock className="h-4 w-4" />
                    ) : puzzle.completed ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      puzzle.sort_order
                    )}
                  </div>
                  <span
                    className={`max-w-[72px] text-[10px] leading-tight text-center line-clamp-2 ${
                      isLocked
                        ? "text-slate-600"
                        : isSelected
                          ? "text-cyan-200 font-medium"
                          : "text-slate-400"
                    }`}
                  >
                    {puzzle.prompt[uiLang] || puzzle.slug}
                  </span>
                  {isSelected && !isLocked && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  )}
                </div>
              </button>
            );
          })}

          {/* ── Tier milestone gates (every 20 standard nodes) ── */}
          {variant === "main" && TIER_PUZZLE_THRESHOLDS
            .filter((entry) => entry.minCount > 0) // skip stone (count = 0)
            .map((entry) => {
              // The milestone appears between node[count-1] and node[count]
              const beforeNode = standardNodes[entry.minCount - 1];
              const afterNode  = standardNodes[entry.minCount];
              if (!beforeNode) return null; // path not long enough yet
              // Y mid-point between the two surrounding nodes (or just below the last node)
              const gateY = afterNode
                ? (beforeNode.y + afterNode.y) / 2
                : beforeNode.y + 28;
              const isReached = completedStandardCount >= entry.minCount;
              const tierName = t.ascension.tiers[entry.tier as keyof typeof t.ascension.tiers] ?? entry.tier;

              const tierColors: Record<ChampionTier, { border: string; bg: string; text: string; glow: string }> = {
                stone:     { border: "border-slate-600/60",    bg: "bg-slate-800/80",    text: "text-slate-300",    glow: "" },
                bronze:    { border: "border-amber-700/60",    bg: "bg-amber-950/80",    text: "text-amber-300",    glow: "shadow-[0_0_8px_rgba(180,83,9,0.4)]" },
                silver:    { border: "border-slate-400/60",    bg: "bg-slate-700/80",    text: "text-slate-100",    glow: "shadow-[0_0_8px_rgba(148,163,184,0.3)]" },
                gold:      { border: "border-yellow-500/70",   bg: "bg-yellow-950/80",   text: "text-yellow-300",   glow: "shadow-[0_0_10px_rgba(234,179,8,0.35)]" },
                platinum:  { border: "border-cyan-500/70",     bg: "bg-cyan-950/80",     text: "text-cyan-200",     glow: "shadow-[0_0_10px_rgba(6,182,212,0.35)]" },
                diamond:   { border: "border-blue-400/70",     bg: "bg-blue-950/80",     text: "text-blue-200",     glow: "shadow-[0_0_12px_rgba(96,165,250,0.4)]" },
                legendary: { border: "border-purple-400/70",   bg: "bg-purple-950/80",   text: "text-purple-200",   glow: "shadow-[0_0_14px_rgba(192,132,252,0.45)]" },
              };
              const colors = tierColors[entry.tier];

              return (
                <div
                  key={entry.tier}
                  className="absolute left-0 right-0 pointer-events-none flex items-center gap-2 px-3"
                  style={{ top: gateY, transform: "translateY(-50%)" }}
                >
                  {/* Left line */}
                  <div className={`flex-1 h-px ${isReached ? "bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" : "bg-gradient-to-r from-transparent via-slate-700/50 to-transparent"}`} />
                  {/* Tier badge */}
                  <div
                    className={`pointer-events-auto shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all ${colors.border} ${colors.bg} ${colors.text} ${isReached ? colors.glow : "opacity-50"}`}
                    title={`${t.ascension.tierMilestoneHint.replace("{count}", String(entry.minCount))}`}
                  >
                    {isReached ? (
                      <Check className="h-3 w-3 shrink-0" />
                    ) : (
                      <span className="h-3 w-3 shrink-0 flex items-center justify-center text-[9px]">{entry.minCount}</span>
                    )}
                    {tierName}
                  </div>
                  {/* Right line */}
                  <div className={`flex-1 h-px ${isReached ? "bg-gradient-to-l from-transparent via-emerald-500/40 to-transparent" : "bg-gradient-to-l from-transparent via-slate-700/50 to-transparent"}`} />
                </div>
              );
            })}

          {/* ── Fantasy bonus nodes (right column) ── */}
          {fantasyPuzzles.length > 0 && (
            <>
              {/* "Bonus Quests" label */}
              <div
                className="absolute pointer-events-none text-[9px] uppercase tracking-widest text-purple-300/60 font-semibold"
                style={{ left: `${BONUS_X - 8}%`, top: 8, transform: "translateX(-50%)" }}
              >
                {t.ascension.bonusColumn}
              </div>

              {fantasyPuzzles.map((puzzle, idx) => {
                const node = bonusNodes[idx];
                if (!node) return null;
                const isSelected = puzzle.id === selectedPuzzleId;

                /** True if this bonus puzzle requires a power the player hasn't unlocked. */
                const requiredAbilities = (puzzle.fantasy_rules?.enabledAbilities ?? []) as PieceAbilityId[];
                const missingPowers = requiredAbilities.filter((a) => !playerAbilities.includes(a));
                const isLocked = !puzzle.completed && missingPowers.length > 0;

                const lockedTooltip = (() => {
                  if (!isLocked) return puzzle.prompt[uiLang] || puzzle.slug;
                  const parts = missingPowers.map((a) => {
                    const abilityLabel = t.ascension.abilities[a] ?? a;
                    if (hasPowerSight) {
                      const skillId = skillIdForAbility(a);
                      const skill = skillId ? getSkillById(skillId) : undefined;
                      if (skill) {
                        return `${abilityLabel} → ${skill.name[uiLang]}`;
                      }
                    }
                    return abilityLabel;
                  });
                  return `${t.ascension.bonusQuestHint}\n${parts.join(", ")}`;
                })();

                return (
                  <button
                    key={puzzle.id}
                    type="button"
                    onClick={() => !isLocked && onSelectPuzzle(puzzle.id)}
                    disabled={isLocked}
                    title={lockedTooltip}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none rounded-full ${
                      isLocked ? "cursor-not-allowed" : ""
                    }`}
                    style={pathNodeToStyle(node)}
                  >
                    <div
                      className={`relative flex flex-col items-center gap-1 transition-transform ${
                        isLocked ? "opacity-40" : "hover:scale-105"
                      }`}
                    >
                      {/* Outer glow ring when selected */}
                      {isSelected && !isLocked && (
                        <span className="absolute inset-[-4px] rounded-full border border-amber-400/50 animate-pulse" />
                      )}
                      <div
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-lg transition-colors ${
                          isLocked
                            ? "border-slate-700/50 bg-slate-900/50 text-slate-600"
                            : puzzle.completed
                              ? "border-amber-400 bg-amber-950/80 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                              : isSelected
                                ? "border-purple-400 bg-purple-950/90 text-purple-100 ring-2 ring-purple-400/40 shadow-[0_0_10px_rgba(192,132,252,0.3)]"
                                : "border-purple-600/60 bg-purple-950/40 text-purple-300"
                        }`}
                      >
                        {isLocked ? (
                          <Lock className="h-4 w-4" />
                        ) : puzzle.completed ? (
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </div>
                      <span
                        className={`max-w-[52px] text-[9px] leading-tight text-center line-clamp-2 ${
                          isLocked
                            ? "text-slate-600"
                            : isSelected
                              ? "text-purple-200 font-medium"
                              : "text-purple-400/70"
                        }`}
                      >
                        {puzzle.prompt[uiLang] || puzzle.slug}
                      </span>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {/* ── Champion token (standard path only) ── */}
          {visualNode && (
            <PathChampionToken
              avatarUrl={card.avatarUrl ?? null}
              displayName={card.displayName}
              tier={card.tier}
              node={visualNode}
              isMoving={animateToIndex != null}
              onTransitionEnd={handleTokenTransitionEnd}
            />
          )}
        </div>

        {/* Bottom fade */}
        <div className="pointer-events-none sticky bottom-0 z-10 h-8 bg-gradient-to-t from-slate-950/80 to-transparent" />
      </div>
    </div>
  );
}
