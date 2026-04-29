"use client";

import { useCallback, useMemo, useState } from "react";
import SimpleChessboard from "@/components/SimpleChessboard";
import SanNotation from "@/components/SanNotation";
import PromotionDialog from "@/components/PromotionDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MoveChallenge } from "@/lib/opening-lessons";
import { pickLocalized } from "@/lib/opening-lessons";
import {
  fenAfterUciMoves,
  uciToSanFromFen,
  uciToVerboseMoveFromFen,
  resolveDropToQuizChoice,
  shuffleInPlace,
} from "@/lib/learn-chess-utils";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";

interface MoveChallengeCardProps {
  challenge: MoveChallenge;
  uciMoves: string[];
  lang: "fr" | "en";
  labels: {
    hint: string;
    nextHint: string;
    correct: string;
    wrong: string;
    reveal: string;
    tryAgain: string;
    positionLabel: string;
    playOnBoard?: string;
  };
}

export default function MoveChallengeCard({
  challenge,
  uciMoves,
  lang,
  labels,
}: MoveChallengeCardProps) {
  const { settings } = useChessboardSettings();

  const fen = useMemo(() => {
    try {
      return fenAfterUciMoves(uciMoves, challenge.afterMoveCount);
    } catch {
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    }
  }, [uciMoves, challenge.afterMoveCount]);

  const choices = useMemo(() => {
    const all = [challenge.correctUci, ...challenge.wrongChoices];
    return shuffleInPlace([...all]);
  }, [challenge.correctUci, challenge.wrongChoices]);

  const choiceVerboseByUci = useMemo(() => {
    const map = new Map<string, ReturnType<typeof uciToVerboseMoveFromFen>>();
    for (const uci of choices) {
      map.set(uci, uciToVerboseMoveFromFen(fen, uci));
    }
    return map;
  }, [choices, fen]);

  const [picked, setPicked] = useState<string | null>(null);
  const [hintIdx, setHintIdx] = useState(-1);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [promotionOptions, setPromotionOptions] = useState<string[]>([]);

  const orientation = useMemo(() => {
    const parts = fen.split(" ");
    const stm = parts[1];
    return stm === "b" ? "black" : "white";
  }, [fen]);

  const sideToMove = useMemo(() => {
    const stm = fen.split(" ")[1];
    return stm === "b" ? "b" : "w";
  }, [fen]);

  const showInsight = picked === challenge.correctUci;

  const applyResolution = useCallback(
    (res: ReturnType<typeof resolveDropToQuizChoice>) => {
      if (res.type === "match") {
        setPicked(res.uci);
        setPromotionOpen(false);
        setPromotionOptions([]);
        return;
      }
      if (res.type === "promotion") {
        setPromotionOptions(res.options);
        setPromotionOpen(true);
      }
    },
    []
  );

  const handleBoardDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (picked) return false;
      const res = resolveDropToQuizChoice(fen, choices, sourceSquare, targetSquare);
      if (res.type === "none") return false;
      applyResolution(res);
      return true;
    },
    [applyResolution, choices, fen, picked]
  );

  const handlePromotionSelect = useCallback(
    (piece: "q" | "r" | "b" | "n") => {
      const from = promotionOptions[0]?.trim().toLowerCase().slice(0, 2);
      const to = promotionOptions[0]?.trim().toLowerCase().slice(2, 4);
      if (!from || !to) {
        setPromotionOpen(false);
        setPromotionOptions([]);
        return;
      }
      const played = `${from}${to}${piece}`.toLowerCase();
      const found = promotionOptions.find(
        (o) => o.trim().toLowerCase() === played
      );
      setPromotionOpen(false);
      setPromotionOptions([]);
      if (found) setPicked(found);
    },
    [promotionOptions]
  );

  return (
    <Card className="theme-bg-secondary theme-border border-amber-900/30">
      <PromotionDialog
        open={promotionOpen}
        pieceColor={sideToMove}
        onSelect={handlePromotionSelect}
      />
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-amber-200/90">{pickLocalized(challenge.prompt, lang)}</CardTitle>
        <p className="text-xs text-slate-500">{labels.positionLabel}</p>
        {!picked && labels.playOnBoard && (
          <p className="text-xs text-slate-500 pt-0.5">{labels.playOnBoard}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center max-w-[min(100%,360px)] mx-auto">
          <SimpleChessboard
            position={fen}
            orientation={orientation}
            onDrop={picked ? undefined : handleBoardDrop}
          />
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {choices.map((uci) => {
            const san = uciToSanFromFen(fen, uci);
            const verbose = choiceVerboseByUci.get(uci) ?? null;
            const isSel = picked === uci;
            const isCorrect = uci === challenge.correctUci;
            let variant: "default" | "outline" | "destructive" | "secondary" = "outline";
            if (picked) {
              if (isCorrect && isSel) variant = "default";
              else if (isSel && !isCorrect) variant = "destructive";
              else if (isCorrect) variant = "secondary";
            }
            return (
              <Button
                key={uci}
                type="button"
                variant={variant}
                size="sm"
                className="font-mono min-w-[4.5rem] inline-flex items-center justify-center gap-0.5"
                disabled={!!picked}
                onClick={() => setPicked(uci)}
              >
                <SanNotation
                  verboseMove={verbose}
                  fallbackSan={san}
                  movingColor={sideToMove}
                  pieceSet={settings.pieceSet}
                  size="sm"
                />
              </Button>
            );
          })}
        </div>

        {picked && picked !== challenge.correctUci && (
          <p className="text-sm text-rose-300 text-center">{labels.wrong}</p>
        )}

        {showInsight && (
          <p className="text-sm text-emerald-200/90 text-center border border-emerald-900/40 rounded-md p-3 bg-emerald-950/20">
            {labels.correct} — {pickLocalized(challenge.insight, lang)}
          </p>
        )}

        <div className="flex flex-wrap gap-2 justify-center items-center">
          {challenge.hints.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-cyan-400"
            disabled={hintIdx >= challenge.hints.length - 1}
            onClick={() => setHintIdx((i) => Math.min(i + 1, challenge.hints.length - 1))}
          >
            {hintIdx < 0 ? labels.hint : labels.nextHint}
          </Button>
          )}
          {picked && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setPicked(null); setHintIdx(-1); setPromotionOpen(false); setPromotionOptions([]); }}>
              {labels.tryAgain}
            </Button>
          )}
        </div>

        {challenge.hints.length > 0 && hintIdx >= 0 &&
          challenge.hints.slice(0, hintIdx + 1).map((h, i) => (
            <p key={i} className="text-sm text-slate-400 text-center italic">
              {pickLocalized(h, lang)}
            </p>
          ))}
      </CardContent>
    </Card>
  );
}
