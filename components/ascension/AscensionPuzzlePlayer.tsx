"use client";

import { useCallback, useMemo, useState } from "react";
import { Chess } from "chess.js";
import SimpleChessboard from "@/components/SimpleChessboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <Card className="theme-bg-secondary border-cyan-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg text-slate-100">
            {puzzle.prompt[uiLang] || puzzle.slug}
          </CardTitle>
          <Badge variant={puzzle.kind === "fantasy" ? "default" : "outline"}>
            {puzzle.kind === "fantasy" ? t.ascension.fantasyPuzzle : t.ascension.standardPuzzle}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={`space-y-4 ${frozen ? "pointer-events-none opacity-90" : ""}`}>
        <div className="flex items-center justify-between gap-2 rounded-md border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-sm">
          <span className="text-slate-400">{t.ascension.sideToMove}</span>
          <Badge variant="outline" className="border-cyan-500/40 text-cyan-200">
            {sideLabel}
          </Badge>
        </div>
        <p className="text-xs text-slate-500 -mt-2">{t.ascension.sideToMoveHint}</p>
        <SimpleChessboard
          position={position}
          onDrop={handleDrop}
          lastMove={lastMove}
          orientation={playerOrientation}
        />

        {puzzle.kind === "fantasy" && fantasyRules.enabledAbilities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {fantasyRules.enabledAbilities.map((a) => (
              <Badge key={a} variant="secondary" className="text-xs">
                {t.ascension.abilities[a] ?? a}
              </Badge>
            ))}
          </div>
        )}

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

        {hintIdx >= 0 && puzzle.hints[hintIdx] && (
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
