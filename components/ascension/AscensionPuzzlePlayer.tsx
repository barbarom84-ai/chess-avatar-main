"use client";

import { useCallback, useMemo, useState } from "react";
import { Info, Lock, Sparkles, Star } from "lucide-react";
import { Chess } from "chess.js";
import SimpleChessboard from "@/components/SimpleChessboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FantasyChessEngine } from "@/lib/ascension/fantasy-chess/engine";
import type { FantasyRuleSet } from "@/lib/ascension/fantasy-chess/types";
import type { AscensionPuzzleListItem } from "@/lib/ascension/client";
import { playerFantasyAbilities } from "@/lib/ascension/skill-tree";
import { boardOrientationFromFen, getSideToMoveFromFen } from "@/lib/ascension/fen-utils";
import { useLanguage } from "@/lib/language-context";

interface AscensionPuzzlePlayerProps {
  puzzle: AscensionPuzzleListItem;
  unlockedSkills: string[];
  onComplete: (moves: string[], timeMs: number) => Promise<boolean>;
  frozen?: boolean;
}

export default function AscensionPuzzlePlayer({
  puzzle,
  unlockedSkills,
  onComplete,
  frozen = false,
}: AscensionPuzzlePlayerProps) {
  const { lang, t } = useLanguage();
  const uiLang = lang === "fr" ? "fr" : "en";
  const [moves, setMoves] = useState<string[]>([]);
  const [hintIdx, setHintIdx] = useState(-1);
  const [status, setStatus] = useState<"playing" | "success" | "fail">("playing");
  const [startTime] = useState(() => Date.now());
  const hasExtraHint = unlockedSkills.includes("extra_hint");
  const hasUndo = unlockedSkills.includes("undo_move");

  const fantasyRules: FantasyRuleSet = useMemo(() => {
    const playerAbilities = playerFantasyAbilities(unlockedSkills);
    const puzzleAbilities = puzzle.fantasy_rules.enabledAbilities ?? [];
    return {
      enabledAbilities: [...new Set([...puzzleAbilities, ...playerAbilities])],
      objective: puzzle.fantasy_rules.objective,
      objectiveSquare: puzzle.fantasy_rules.objectiveSquare,
      objectivePiece: puzzle.fantasy_rules.objectivePiece,
    };
  }, [puzzle, unlockedSkills]);

  /** True if this fantasy puzzle requires a power the player hasn't unlocked yet. */
  const missingRequiredPower = useMemo(() => {
    if (puzzle.kind !== "fantasy") return false;
    const puzzleAbilities = puzzle.fantasy_rules.enabledAbilities ?? [];
    const playerAbilities = playerFantasyAbilities(unlockedSkills);
    return puzzleAbilities.some((a) => !playerAbilities.includes(a));
  }, [puzzle, unlockedSkills]);

  const position = useMemo(() => {
    if (puzzle.kind === "fantasy") {
      const replay = new FantasyChessEngine(puzzle.fen, fantasyRules);
      for (const uci of moves) replay.applyMove(uci);
      return replay.fen;
    }
    const chess = new Chess(puzzle.fen);
    for (const uci of moves) {
      chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] as "q" | "r" | "b" | "n" | undefined,
      });
    }
    return chess.fen();
  }, [puzzle, moves, fantasyRules]);

  const lastMove = useMemo(() => {
    const last = moves[moves.length - 1];
    if (!last || last.length < 4) return null;
    return { from: last.slice(0, 2), to: last.slice(2, 4) };
  }, [moves]);

  const handleDrop = useCallback(
    (from: string, to: string): boolean => {
      if (status !== "playing" || frozen) return false;
      const uci = `${from}${to}`;

      if (puzzle.kind === "fantasy") {
        const replay = new FantasyChessEngine(puzzle.fen, fantasyRules);
        for (const m of moves) replay.applyMove(m);
        if (!replay.applyMove(uci)) return false;
      } else {
        const chess = new Chess(puzzle.fen);
        for (const m of moves) {
          chess.move({
            from: m.slice(0, 2),
            to: m.slice(2, 4),
            promotion: m[4] as "q" | "r" | "b" | "n" | undefined,
          });
        }
        try {
          if (!chess.move({ from, to })) return false;
        } catch {
          return false;
        }
      }

      const nextMoves = [...moves, uci];
      setMoves(nextMoves);

      const solution = puzzle.solution_ucis.map((s) => s.toLowerCase());
      const normalized = nextMoves.map((s) => s.toLowerCase());

      if (normalized.length === solution.length) {
        const correct = normalized.every((m, i) => m === solution[i]);
        if (correct) {
          setStatus("success");
          void onComplete(nextMoves, Date.now() - startTime);
        } else {
          setStatus("fail");
        }
      } else {
        const prefixOk = normalized.every((m, i) => m === solution[i]);
        if (!prefixOk) setStatus("fail");
      }

      return true;
    },
    [status, frozen, puzzle, fantasyRules, moves, onComplete, startTime]
  );

  const reset = () => {
    setMoves([]);
    setHintIdx(-1);
    setStatus("playing");
  };

  const undo = () => {
    if (!hasUndo || moves.length === 0 || status !== "playing") return;
    setMoves((m) => m.slice(0, -1));
    setStatus("playing");
  };

  const maxHints = puzzle.hints.length + (hasExtraHint ? 1 : 0);

  const playerOrientation = useMemo(
    () => boardOrientationFromFen(puzzle.fen),
    [puzzle.fen]
  );

  const sideToMove = useMemo(() => {
    try {
      return getSideToMoveFromFen(position);
    } catch {
      return getSideToMoveFromFen(puzzle.fen);
    }
  }, [position, puzzle.fen]);

  const sideLabel =
    sideToMove === "b" ? t.ascension.sideBlack : t.ascension.sideWhite;

  const fantasyEngine = useMemo(() => {
    if (puzzle.kind !== "fantasy") return null;
    const replay = new FantasyChessEngine(puzzle.fen, fantasyRules);
    for (const uci of moves) replay.applyMove(uci);
    return replay;
  }, [puzzle, fantasyRules, moves]);

  const greedyChainActive = fantasyEngine?.isGreedyChainActive() ?? false;

  return (
    <Card className="theme-bg-secondary border-cyan-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg text-slate-100 leading-snug">
            {puzzle.prompt[uiLang] || puzzle.slug}
          </CardTitle>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant={puzzle.kind === "fantasy" ? "default" : "outline"}>
              {puzzle.kind === "fantasy" ? t.ascension.fantasyPuzzle : t.ascension.standardPuzzle}
            </Badge>
            {puzzle.kind === "fantasy" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300/90 bg-amber-950/40 border border-amber-600/30 rounded-full px-2 py-0.5">
                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                {t.ascension.bonusQuestLabel}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={`space-y-3 ${frozen ? "pointer-events-none opacity-90" : ""}`}>
        {/* ── Blocked: missing required power ── */}
        {missingRequiredPower && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-700/60 bg-slate-900/60 px-4 py-6 text-center">
            <Lock className="h-8 w-8 text-slate-500" />
            <p className="text-sm font-semibold text-slate-200">{t.ascension.bonusLockedTitle}</p>
            <p className="text-xs text-slate-400 max-w-xs">{t.ascension.bonusQuestMissingPower}</p>
          </div>
        )}

        {!missingRequiredPower && puzzle.kind === "fantasy" && (
          <TooltipProvider delayDuration={150}>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-purple-500/35 bg-purple-950/30 px-3 py-2">
              {/* Bonus quest label */}
              <span className="flex items-center gap-1 cursor-default">
                <Star className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span className="text-[11px] font-semibold text-amber-300">
                  {t.ascension.bonusQuestLabel}
                </span>
              </span>

              <span className="text-purple-700">|</span>

              {/* Fantasy rules info */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-default">
                    <Sparkles className="h-3.5 w-3.5 text-purple-300 shrink-0" />
                    <span className="text-[11px] text-purple-200">{t.ascension.fantasyBannerTitle}</span>
                    <Info className="h-3 w-3 text-purple-500" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {t.ascension.fantasyBannerDesc}
                </TooltipContent>
              </Tooltip>

              {/* Active power badges with individual tooltips */}
              {fantasyRules.enabledAbilities.length > 0 && (
                <>
                  <span className="text-purple-700">|</span>
                  <span className="text-[10px] uppercase tracking-wider text-purple-400/70">
                    {t.ascension.fantasyActivePowers}:
                  </span>
                  {fantasyRules.enabledAbilities.map((a) => (
                    <Tooltip key={a}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="secondary"
                          className="text-[11px] cursor-default border-purple-500/30 bg-purple-950/60 text-purple-100 hover:bg-purple-900/60"
                        >
                          {t.ascension.abilities[a] ?? a}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        {t.ascension.abilities[a] ?? a}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </>
              )}
            </div>
          </TooltipProvider>
        )}

        {greedyChainActive && (
          <p className="text-sm font-medium text-amber-300/95 rounded-md border border-amber-500/30 bg-amber-950/30 px-3 py-2">
            {t.ascension.greedyPawnContinue}
          </p>
        )}

        {!missingRequiredPower && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-sm">
          <span className="text-slate-400">{t.ascension.sideToMove}</span>
          <Badge variant="outline" className="border-cyan-500/40 text-cyan-200">
            {sideLabel}
          </Badge>
        </div>
        )}
        {!missingRequiredPower && <p className="text-xs text-slate-500 -mt-2">{t.ascension.sideToMoveHint}</p>}
        {!missingRequiredPower && <SimpleChessboard
          position={position}
          onDrop={handleDrop}
          lastMove={lastMove}
          orientation={playerOrientation}
        />}

        {!missingRequiredPower && (
        <div className="flex flex-wrap gap-2">
          {hintIdx < maxHints - 1 && hintIdx < puzzle.hints.length - 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHintIdx((i) => Math.min(i + 1, puzzle.hints.length - 1))}
            >
              {t.ascension.hint}
            </Button>
          )}
          {hasUndo && (
            <Button variant="outline" size="sm" onClick={undo} disabled={moves.length === 0}>
              {t.ascension.undo}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={reset}>
            {t.ascension.reset}
          </Button>
        </div>
        )}

        {!missingRequiredPower && hintIdx >= 0 && puzzle.hints[hintIdx] && (
          <p className="text-sm text-cyan-300/90">{puzzle.hints[hintIdx]![uiLang]}</p>
        )}

        {status === "success" && !frozen && (
          <p className="text-emerald-400 font-medium">{t.ascension.puzzleSuccess}</p>
        )}
        {status === "fail" && (
          <p className="text-rose-400 font-medium">{t.ascension.puzzleFail}</p>
        )}
      </CardContent>
    </Card>
  );
}
