"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { PieceAbilityId } from "@/lib/ascension/fantasy-chess/types";
import type { AscensionPuzzleListItem } from "@/lib/ascension/client";
import {
  playerFantasyAbilities,
  playerPassiveSkills,
} from "@/lib/ascension/skill-tree";
import { boardOrientationFromFen, getSideToMoveFromFen } from "@/lib/ascension/fen-utils";
import {
  applyMoveToChess,
  extractPlayerMoves,
  getSolverColor,
  isSolverTurn,
} from "@/lib/ascension/puzzle-sequence";
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
  const solution = useMemo(
    () => puzzle.solution_ucis.map((s) => s.trim().toLowerCase()),
    [puzzle.solution_ucis]
  );
  const solverColor = useMemo(() => getSolverColor(puzzle.fen), [puzzle.fen]);

  const [lineMoves, setLineMoves] = useState<string[]>([]);
  const [playerMoves, setPlayerMoves] = useState<string[]>([]);
  const [history, setHistory] = useState<
    { line: string[]; player: string[]; index: number }[]
  >([]);
  const moveIndexRef = useRef(0);
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
      specialSquares: puzzle.fantasy_rules.specialSquares,
      passiveSkills: playerPassiveSkills(unlockedSkills),
      fantasySide: solverColor,
    };
  }, [puzzle, unlockedSkills, solverColor]);

  const requiredAbilities = useMemo(() => {
    if (puzzle.kind !== "fantasy") return [] as PieceAbilityId[];
    return (puzzle.fantasy_rules.enabledAbilities ?? []) as PieceAbilityId[];
  }, [puzzle]);

  const playerAbilities = useMemo(
    () => playerFantasyAbilities(unlockedSkills),
    [unlockedSkills]
  );

  const missingAbilities = useMemo(
    () => requiredAbilities.filter((a) => !playerAbilities.includes(a)),
    [requiredAbilities, playerAbilities]
  );

  const missingRequiredPower = missingAbilities.length > 0;
  const blocked = missingRequiredPower || puzzle.locked;

  const hasFantasyCodex =
    unlockedSkills.includes("fantasy_codex") || puzzle.kind === "fantasy";
  const hasTunnelSense = unlockedSkills.includes("tunnel_sense");

  const reset = useCallback(() => {
    setLineMoves([]);
    setPlayerMoves([]);
    setHistory([]);
    moveIndexRef.current = 0;
    setHintIdx(-1);
    setStatus("playing");
  }, []);

  useEffect(() => {
    reset();
  }, [puzzle.id, puzzle.fen, reset]);

  const applyLineMoveStandard = useCallback((fen: string, moves: string[]): string => {
    const chess = new Chess(fen);
    for (const uci of moves) {
      applyMoveToChess(chess, uci);
    }
    return chess.fen();
  }, []);

  const applyLineMoveFantasy = useCallback(
    (fen: string, moves: string[]): string => {
      const engine = new FantasyChessEngine(fen, fantasyRules);
      for (const uci of moves) {
        engine.applyMove(uci);
      }
      return engine.fen;
    },
    [fantasyRules]
  );

  const position = useMemo(() => {
    if (lineMoves.length === 0) return puzzle.fen;
    return puzzle.kind === "fantasy"
      ? applyLineMoveFantasy(puzzle.fen, lineMoves)
      : applyLineMoveStandard(puzzle.fen, lineMoves);
  }, [puzzle, lineMoves, applyLineMoveFantasy, applyLineMoveStandard]);

  const lastMove = useMemo(() => {
    const last = lineMoves[lineMoves.length - 1];
    if (!last || last.length < 4) return null;
    return { from: last.slice(0, 2), to: last.slice(2, 4) };
  }, [lineMoves]);

  const autoPlayOpponent = useCallback(
    (currentLine: string[], currentIndex: number): { line: string[]; index: number; done: boolean } => {
      let line = [...currentLine];
      let idx = currentIndex;

      while (idx < solution.length) {
        const fenAfter = puzzle.kind === "fantasy"
          ? applyLineMoveFantasy(puzzle.fen, line)
          : applyLineMoveStandard(puzzle.fen, line);

        if (getSideToMoveFromFen(fenAfter) === solverColor) break;

        const oppMove = solution[idx]!;
        line = [...line, oppMove];
        idx += 1;
      }

      return { line, index: idx, done: idx >= solution.length };
    },
    [solution, puzzle, solverColor, applyLineMoveFantasy, applyLineMoveStandard]
  );

  const finishSuccess = useCallback(
    (finalPlayerMoves: string[]) => {
      setStatus("success");
      void onComplete(finalPlayerMoves, Date.now() - startTime);
    },
    [onComplete, startTime]
  );

  const handleDrop = useCallback(
    (from: string, to: string): boolean => {
      // A wrong move puts the puzzle in "fail" but does not commit anything, so the
      // position is still valid: keep the board interactive so the player can retry
      // (or undo) without restarting from scratch.
      if (
        (status !== "playing" && status !== "fail") ||
        frozen ||
        puzzle.locked ||
        missingRequiredPower
      ) {
        return false;
      }

      const idx = moveIndexRef.current;
      if (idx >= solution.length) return false;
      if (
        !isSolverTurn(
          puzzle.fen,
          lineMoves,
          puzzle.kind === "fantasy" ? fantasyRules : undefined
        )
      ) {
        return false;
      }

      const expected = solution[idx]!;
      const uci = `${from}${to}`.toLowerCase();
      const expectedFrom = expected.slice(0, 2);
      const expectedTo = expected.slice(2, 4);

      if (from.toLowerCase() !== expectedFrom || to.toLowerCase() !== expectedTo) {
        setStatus("fail");
        return false;
      }

      const playedUci = expected.length > 4 ? expected : uci;

      if (puzzle.kind === "fantasy") {
        const engine = new FantasyChessEngine(puzzle.fen, fantasyRules);
        for (const m of lineMoves) engine.applyMove(m);
        if (!engine.applyMove(playedUci)) {
          setStatus("fail");
          return false;
        }
      } else {
        const chess = new Chess(puzzle.fen);
        for (const m of lineMoves) applyMoveToChess(chess, m);
        if (!applyMoveToChess(chess, playedUci)) {
          setStatus("fail");
          return false;
        }
      }

      // Snapshot the pre-move state so Undo can step back one player move.
      const snapshot = { line: lineMoves, player: playerMoves, index: idx };

      const nextLine = [...lineMoves, playedUci];
      const nextPlayer = [...playerMoves, playedUci];
      const nextIndex = idx + 1;

      const auto = autoPlayOpponent(nextLine, nextIndex);
      moveIndexRef.current = auto.index;
      setHistory((h) => [...h, snapshot]);
      setLineMoves(auto.line);
      setPlayerMoves(nextPlayer);

      if (auto.done) {
        finishSuccess(nextPlayer);
      } else {
        // Clear any prior wrong-move feedback now that a correct move landed.
        setStatus("playing");
      }

      return true;
    },
    [
      status,
      frozen,
      puzzle,
      missingRequiredPower,
      solution,
      lineMoves,
      playerMoves,
      fantasyRules,
      autoPlayOpponent,
      finishSuccess,
    ]
  );

  const undo = useCallback(() => {
    if (!hasUndo || status === "success" || history.length === 0) return;
    const prev = history[history.length - 1]!;
    setHistory((h) => h.slice(0, -1));
    setLineMoves(prev.line);
    setPlayerMoves(prev.player);
    moveIndexRef.current = prev.index;
    setStatus("playing");
  }, [hasUndo, status, history]);

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
    for (const uci of lineMoves) replay.applyMove(uci);
    return replay;
  }, [puzzle, fantasyRules, lineMoves]);

  const greedyChainActive = fantasyEngine?.isGreedyChainActive() ?? false;
  const queenSplitChainActive = fantasyEngine?.isQueenSplitChainActive() ?? false;

  const squareEffects = useMemo(() => {
    if (puzzle.kind !== "fantasy") return undefined;
    const specials = fantasyRules.specialSquares ?? [];
    if (specials.length === 0) return undefined;
    const triggered = new Set(fantasyEngine?.getTriggeredSquares() ?? []);
    const map: Record<
      string,
      {
        icon: string;
        variant: "explosive" | "trap" | "tunnel";
        exploded?: boolean;
        blastRadius?: boolean;
      }
    > = {};

    const adjacentSquares = (sq: string): string[] => {
      const files = "abcdefgh";
      const ranks = "12345678";
      const fi = files.indexOf(sq[0] ?? "");
      const ri = ranks.indexOf(sq[1] ?? "");
      if (fi < 0 || ri < 0) return [];
      const out: string[] = [];
      for (let df = -1; df <= 1; df++) {
        for (let dr = -1; dr <= 1; dr++) {
          if (df === 0 && dr === 0) continue;
          const f = fi + df;
          const r = ri + dr;
          if (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
            out.push(`${files[f]}${ranks[r]}`);
          }
        }
      }
      return out;
    };

    for (const eff of specials) {
      if (eff.type === "explosive" && triggered.has(eff.square)) {
        map[eff.square] = {
          icon: "💥",
          variant: "explosive",
          exploded: true,
        };
        for (const adj of adjacentSquares(eff.square)) {
          if (!map[adj]) {
            map[adj] = { icon: "", variant: "explosive", blastRadius: true };
          }
        }
        continue;
      }
      if (eff.type === "trap" && triggered.has(eff.square)) {
        continue;
      }
      const icon =
        eff.type === "explosive" ? "💣" : eff.type === "trap" ? "⚠️" : "🕳️";
      map[eff.square] = { icon, variant: eff.type };
      if (eff.type === "tunnel" && eff.linkTo) {
        const exitEff = specials.find((s) => s.square === eff.linkTo);
        if (exitEff?.type === "explosive" && triggered.has(eff.linkTo)) {
          if (!map[eff.linkTo]) {
            map[eff.linkTo] = {
              icon: "💥",
              variant: "explosive",
              exploded: true,
            };
          }
        } else if (!map[eff.linkTo]) {
          map[eff.linkTo] = { icon: "🕳️", variant: "tunnel" };
        }
      }
    }
    return Object.keys(map).length > 0 ? map : undefined;
  }, [puzzle.kind, fantasyRules, fantasyEngine]);

  const squareEmojis = useMemo(() => {
    if (
      puzzle.kind === "fantasy" &&
      fantasyRules.objective === "reach_square" &&
      fantasyRules.objectiveSquare
    ) {
      return { [fantasyRules.objectiveSquare]: "🎯" };
    }
    return undefined;
  }, [puzzle.kind, fantasyRules]);

  const tunnelArrows = useMemo(() => {
    if (puzzle.kind !== "fantasy") return undefined;
    const color = hasTunnelSense ? "#67e8f9" : "#22d3ee";
    const arrows = (fantasyRules.specialSquares ?? [])
      .filter((e) => e.type === "tunnel" && e.linkTo)
      .map((e) => ({ from: e.square, to: e.linkTo as string, color }));
    return arrows.length > 0 ? arrows : undefined;
  }, [puzzle.kind, fantasyRules, hasTunnelSense]);

  const fantasyRulesSummary = t.ascension.fantasyRulesSummary as string[];
  const expectedPlayerMoveCount = extractPlayerMoves(
    puzzle.fen,
    solution,
    puzzle.kind === "fantasy" ? fantasyRules : undefined
  ).length;

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
        {puzzle.locked && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-700/60 bg-slate-900/60 px-4 py-6 text-center">
            <Lock className="h-8 w-8 text-slate-500" />
            <p className="text-sm font-semibold text-slate-200">{t.ascension.puzzleLockedTitle}</p>
            <p className="text-xs text-slate-400 max-w-xs">{t.ascension.puzzleLockedPrevious}</p>
          </div>
        )}

        {missingRequiredPower && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-700/60 bg-slate-900/60 px-4 py-6 text-center">
            <Lock className="h-8 w-8 text-slate-500" />
            <p className="text-sm font-semibold text-slate-200">{t.ascension.bonusLockedTitle}</p>
            <p className="text-xs text-slate-400 max-w-xs">{t.ascension.bonusQuestHint}</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {missingAbilities.map((a) => (
                <Badge key={a} variant="outline" className="text-[10px] border-amber-600/40 text-amber-300">
                  {t.ascension.abilities[a] ?? a}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {!blocked && puzzle.kind === "fantasy" && (
          <TooltipProvider delayDuration={150}>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-purple-500/35 bg-purple-950/30 px-3 py-2">
                <span className="flex items-center gap-1 cursor-default">
                  <Star className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span className="text-[11px] font-semibold text-amber-300">
                    {t.ascension.bonusQuestLabel}
                  </span>
                </span>

                <span className="text-purple-700">|</span>

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

                {requiredAbilities.length > 0 && (
                  <>
                    <span className="text-purple-700">|</span>
                    <span className="text-[10px] uppercase tracking-wider text-amber-400/80">
                      {t.ascension.fantasyRequiredPowers}:
                    </span>
                    {requiredAbilities.map((a) => (
                      <Badge
                        key={`req-${a}`}
                        variant="secondary"
                        className={`text-[11px] border-amber-500/40 ${
                          playerAbilities.includes(a)
                            ? "bg-emerald-950/60 text-emerald-200"
                            : "bg-amber-950/60 text-amber-200"
                        }`}
                      >
                        {t.ascension.abilities[a] ?? a}
                      </Badge>
                    ))}
                  </>
                )}

                {playerAbilities.length > 0 && (
                  <>
                    <span className="text-purple-700">|</span>
                    <span className="text-[10px] uppercase tracking-wider text-purple-400/70">
                      {t.ascension.fantasyYourPowers}:
                    </span>
                    {playerAbilities.map((a) => (
                      <Tooltip key={`active-${a}`}>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className="text-[11px] cursor-default border-purple-500/30 bg-purple-950/60 text-purple-100"
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

              {hasFantasyCodex && (
                <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-[11px] text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">{t.ascension.fantasyRulesTitle}</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {fantasyRulesSummary.map((rule, i) => (
                      <li key={i}>{rule}</li>
                    ))}
                  </ul>
                  {(fantasyRules.specialSquares?.length ?? 0) > 0 && (
                    <p className="text-[10px] text-slate-500 pt-1">{t.ascension.fantasySquaresHint}</p>
                  )}
                </div>
              )}
            </div>
          </TooltipProvider>
        )}

        {greedyChainActive && (
          <p className="text-sm font-medium text-amber-300/95 rounded-md border border-amber-500/30 bg-amber-950/30 px-3 py-2">
            {t.ascension.greedyPawnContinue}
          </p>
        )}

        {queenSplitChainActive && (
          <p className="text-sm font-medium text-purple-300/95 rounded-md border border-purple-500/30 bg-purple-950/30 px-3 py-2">
            {t.ascension.queenSplitContinue}
          </p>
        )}

        {!blocked && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-sm">
          <span className="text-slate-400">{t.ascension.sideToMove}</span>
          <Badge variant="outline" className="border-cyan-500/40 text-cyan-200">
            {sideLabel}
          </Badge>
        </div>
        )}
        {!blocked && <p className="text-xs text-slate-500 -mt-2">{t.ascension.sideToMoveHint}</p>}
        {!blocked && expectedPlayerMoveCount > 1 && (
          <p className="text-xs text-cyan-400/80">
            {playerMoves.length}/{expectedPlayerMoveCount} — {t.ascension.multiMoveHint}
          </p>
        )}
        {!blocked && (
        <SimpleChessboard
          position={position}
          onDrop={handleDrop}
          lastMove={lastMove}
          orientation={playerOrientation}
          squareEffects={squareEffects}
          squareEmojis={squareEmojis}
          arrows={tunnelArrows}
        />
        )}

        {!blocked && (
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
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={history.length === 0 || status === "success"}
            >
              {t.ascension.undo}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={reset}>
            {t.ascension.reset}
          </Button>
        </div>
        )}

        {!blocked && hintIdx >= 0 && puzzle.hints[hintIdx] && (
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
