"use client";

import { useMemo, useState, useEffect } from "react";
import SimpleChessboard from "@/components/SimpleChessboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MoveChallenge } from "@/lib/opening-lessons";
import { pickLocalized } from "@/lib/opening-lessons";
import { fenAfterUciMoves, uciToSanFromFen, shuffleInPlace } from "@/lib/learn-chess-utils";

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
  };
}

export default function MoveChallengeCard({
  challenge,
  uciMoves,
  lang,
  labels,
}: MoveChallengeCardProps) {
  const fen = useMemo(() => {
    try {
      return fenAfterUciMoves(uciMoves, challenge.afterMoveCount);
    } catch {
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    }
  }, [uciMoves, challenge.afterMoveCount]);

  const [choices, setChoices] = useState<string[]>([]);
  useEffect(() => {
    const all = [challenge.correctUci, ...challenge.wrongChoices];
    setChoices(shuffleInPlace(all));
  }, [challenge.correctUci, challenge.wrongChoices]);

  const [picked, setPicked] = useState<string | null>(null);
  const [hintIdx, setHintIdx] = useState(-1);

  const orientation = useMemo(() => {
    const parts = fen.split(" ");
    const stm = parts[1];
    return stm === "b" ? "black" : "white";
  }, [fen]);

  const showInsight = picked === challenge.correctUci;

  return (
    <Card className="theme-bg-secondary theme-border border-amber-900/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-amber-200/90">{pickLocalized(challenge.prompt, lang)}</CardTitle>
        <p className="text-xs text-slate-500">{labels.positionLabel}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center max-w-[min(100%,360px)] mx-auto">
          <SimpleChessboard position={fen} orientation={orientation} />
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {choices.map((uci) => {
            const san = uciToSanFromFen(fen, uci);
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
                className="font-mono min-w-[4.5rem]"
                disabled={!!picked}
                onClick={() => setPicked(uci)}
              >
                {san}
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
            <Button type="button" variant="ghost" size="sm" onClick={() => { setPicked(null); setHintIdx(-1); }}>
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
