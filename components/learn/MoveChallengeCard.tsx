"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Move as ChessJsMove } from "chess.js";
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

interface MoveChallengeCardLabels {
  hint: string;
  nextHint: string;
  correct: string;
  wrong: string;
  reveal: string;
  tryAgain: string;
  positionLabel: string;
  playOnBoard?: string;
}

/** Optional copy for presentation inspired by Lichess (trait, reset). */
export interface LichessLikeLabels {
  sideToMove: string;
  white: string;
  black: string;
  reset: string;
  /** Summary line for collapsed multiple-choice aid (e.g. “Multiple choice”). */
  choicesAid?: string;
}

interface MoveChallengeCardProps {
  challenge: MoveChallenge;
  uciMoves: string[];
  lang: "fr" | "en";
  labels: MoveChallengeCardLabels;
  /** `lichess`: board-first layout, multiple-choice hidden under details (puzzles page). */
  presentation?: "classic" | "lichess";
  lichessLike?: LichessLikeLabels;
  /** Suite affichée avec icônes de pièces après succès (ex. puzzles cloud manuels). */
  curatorLineVerboseMoves?: ChessJsMove[];
  curatorLinePrefix?: { fr: string; en: string };
}

export default function MoveChallengeCard({
  challenge,
  uciMoves,
  lang,
  labels,
  presentation = "classic",
  lichessLike,
  curatorLineVerboseMoves,
  curatorLinePrefix,
}: MoveChallengeCardProps) {
  const { settings } = useChessboardSettings();
  const lichessMode = presentation === "lichess" && !!lichessLike;

  const [picked, setPicked] = useState<string | null>(null);
  const [hintIdx, setHintIdx] = useState(-1);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [promotionOptions, setPromotionOptions] = useState<string[]>([]);
  const [wrongFlash, setWrongFlash] = useState(false);

  const fen = useMemo(() => {
    try {
      return fenAfterUciMoves(uciMoves, challenge.afterMoveCount);
    } catch {
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    }
  }, [uciMoves, challenge.afterMoveCount]);

  const pickedNorm = picked?.trim().toLowerCase() ?? null;
  const correctNorm = challenge.correctUci.trim().toLowerCase();
  const isCorrectPick = pickedNorm !== null && pickedNorm === correctNorm;

  /** Après un coup correct, afficher la position résultante (sinon l’échiquier « reprend » le coup). */
  const displayFen = useMemo(() => {
    if (!isCorrectPick) return fen;
    try {
      return fenAfterUciMoves(uciMoves, challenge.afterMoveCount + 1);
    } catch {
      return fen;
    }
  }, [isCorrectPick, fen, uciMoves, challenge.afterMoveCount]);

  const lastMoveHighlight = useMemo(() => {
    if (!isCorrectPick || !pickedNorm || pickedNorm.length < 4) return null;
    return { from: pickedNorm.slice(0, 2), to: pickedNorm.slice(2, 4) };
  }, [isCorrectPick, pickedNorm]);

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

  /** Toujours depuis la position du défi (trait avant coup), pour ne pas retourner l’échiquier après coup correct. */
  const boardOrientation = useMemo(() => {
    const stm = fen.split(" ")[1];
    return stm === "b" ? "black" : "white";
  }, [fen]);

  const sideToMove = useMemo(() => {
    const stm = fen.split(" ")[1];
    return stm === "b" ? "b" : "w";
  }, [fen]);

  const showInsight = isCorrectPick;

  useEffect(() => {
    if (!pickedNorm || isCorrectPick) return;
    setWrongFlash(true);
    const t = window.setTimeout(() => setWrongFlash(false), 450);
    return () => window.clearTimeout(t);
  }, [pickedNorm, isCorrectPick]);

  const stmBeforePuzzle = fen.split(" ")[1];
  const stmLabel =
    stmBeforePuzzle === "w"
      ? lichessLike?.white ?? "White"
      : stmBeforePuzzle === "b"
        ? lichessLike?.black ?? "Black"
        : "";

  const resetChallenge = useCallback(() => {
    setPicked(null);
    setHintIdx(-1);
    setPromotionOpen(false);
    setPromotionOptions([]);
    setWrongFlash(false);
  }, []);

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

  const cardBorder = lichessMode
    ? "theme-bg-secondary theme-border border-cyan-900/35"
    : "theme-bg-secondary theme-border border-amber-900/30";
  const titleClass = lichessMode
    ? "text-base text-cyan-100/95"
    : "text-base text-amber-200/90";
  const choicesButtons = (
    <div className="flex flex-wrap gap-2 justify-center">
          {choices.map((uci) => {
            const san = uciToSanFromFen(fen, uci);
            const verbose = choiceVerboseByUci.get(uci) ?? null;
            const isSel = pickedNorm === uci.trim().toLowerCase();
            const isCorrect = uci.trim().toLowerCase() === correctNorm;
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
  );

  return (
    <Card className={cardBorder}>
      <PromotionDialog
        open={promotionOpen}
        pieceColor={sideToMove}
        onSelect={handlePromotionSelect}
      />
      <CardHeader className="pb-2">
        <CardTitle className={titleClass}>{pickLocalized(challenge.prompt, lang)}</CardTitle>
        <p className="text-xs text-slate-500">{labels.positionLabel}</p>
        {!picked && labels.playOnBoard && (
          <p className="text-xs text-slate-500 pt-0.5">{labels.playOnBoard}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {lichessMode && lichessLike && !isCorrectPick && stmLabel && (
          <p className="text-xs text-center text-slate-400">
            {lichessLike.sideToMove}: {stmLabel}
          </p>
        )}

        <div
          className={`flex justify-center mx-auto transition-opacity ${
            wrongFlash ? "opacity-70 ring-2 ring-rose-600/50 rounded-sm" : ""
          }`}
        >
          <div
            className={`chessboard-frame w-full ${
              lichessMode ? "chessboard-frame--puzzle" : ""
            }`}
            style={
              lichessMode
                ? undefined
                : ({ ["--chessboard-frame-max" as string]: "min(360px, 100%)" } as React.CSSProperties)
            }
          >
            <SimpleChessboard
              position={displayFen}
              orientation={boardOrientation}
              onDrop={picked ? undefined : handleBoardDrop}
              lastMove={lastMoveHighlight}
              boardMaxWidth="100%"
            />
          </div>
        </div>

        {lichessMode && lichessLike?.choicesAid ? (
          <details className="rounded-md border border-slate-700/60 bg-slate-900/25 px-3 py-2 text-sm">
            <summary className="cursor-pointer text-cyan-400/90 hover:text-cyan-300 select-none">
              {lichessLike.choicesAid}
            </summary>
            <div className="pt-3">{choicesButtons}</div>
          </details>
        ) : (
          choicesButtons
        )}

        {picked && !isCorrectPick && (
          <p className="text-sm text-rose-300 text-center">{labels.wrong}</p>
        )}

        {showInsight && (
          <p className="text-sm text-emerald-200/90 text-center border border-emerald-900/40 rounded-md p-3 bg-emerald-950/20">
            <span className="inline-block max-w-full">
              {labels.correct} —{" "}
              {curatorLineVerboseMoves &&
              curatorLineVerboseMoves.length > 0 &&
              curatorLinePrefix ? (
                <span
                  className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 align-middle"
                  aria-label={curatorLineVerboseMoves.map((m) => m.san).join(" ")}
                >
                  <span>{pickLocalized(curatorLinePrefix, lang)}</span>
                  {curatorLineVerboseMoves.map((mv, i) => (
                    <SanNotation
                      key={`cur-${i}-${mv.from}-${mv.to}`}
                      verboseMove={mv}
                      pieceSet={settings.pieceSet}
                      size="sm"
                    />
                  ))}
                </span>
              ) : (
                pickLocalized(challenge.insight, lang)
              )}
            </span>
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
          {lichessMode && lichessLike ? (
            <Button type="button" variant="secondary" size="sm" onClick={resetChallenge}>
              {lichessLike.reset}
            </Button>
          ) : (
            picked && (
              <Button type="button" variant="ghost" size="sm" onClick={resetChallenge}>
                {labels.tryAgain}
              </Button>
            )
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
