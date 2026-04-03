"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HistoricalGame } from "@/lib/opening-lessons";
import { pickLocalized } from "@/lib/opening-lessons";
import LessonChessboard from "./LessonChessboard";
import MoveChallengeCard from "./MoveChallengeCard";

interface HistoricGameSectionProps {
  game: HistoricalGame;
  lang: "fr" | "en";
  commentaryLabels: {
    moveLabel: string;
    of: string;
    noComment: string;
  };
  metaTemplate: string;
  challengeLabels: {
    hint: string;
    nextHint: string;
    correct: string;
    wrong: string;
    reveal: string;
    tryAgain: string;
    positionLabel: string;
    playOnBoard?: string;
  };
  challengesHeading: string;
}

export default function HistoricGameSection({
  game,
  lang,
  commentaryLabels,
  metaTemplate,
  challengeLabels,
  challengesHeading,
}: HistoricGameSectionProps) {
  const [moveIndex, setMoveIndex] = useState(0);
  const event = pickLocalized(game.event, lang);
  const meta = metaTemplate
    .replace("{white}", game.white)
    .replace("{black}", game.black)
    .replace("{event}", event)
    .replace("{date}", game.date)
    .replace("{result}", game.result);

  const anecdote = game.anecdote ? pickLocalized(game.anecdote, lang) : null;

  return (
    <Card className="theme-bg-secondary theme-border">
      <CardHeader>
        <CardTitle className="text-base text-cyan-200">{meta}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {anecdote && (
          <blockquote className="border-l-4 border-amber-600/60 pl-4 text-slate-300 text-sm leading-relaxed italic">
            {anecdote}
          </blockquote>
        )}
        <LessonChessboard
          uciMoves={game.uciMoves}
          historicalAnnotations={game.annotations}
          lang={lang}
          commentaryLabels={commentaryLabels}
          moveIndex={moveIndex}
          onMoveIndexChange={setMoveIndex}
        />
        {game.challenges && game.challenges.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <h3 className="text-sm font-semibold text-amber-200/90">{challengesHeading}</h3>
            {game.challenges.map((c) => (
              <MoveChallengeCard
                key={c.id}
                challenge={c}
                uciMoves={game.uciMoves}
                lang={lang}
                labels={challengeLabels}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
