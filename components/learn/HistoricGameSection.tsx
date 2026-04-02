"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HistoricalGame } from "@/lib/opening-lessons";
import { pickLocalized } from "@/lib/opening-lessons";
import LessonChessboard from "./LessonChessboard";

interface HistoricGameSectionProps {
  game: HistoricalGame;
  lang: "fr" | "en";
  commentaryLabels: {
    moveLabel: string;
    of: string;
    noComment: string;
  };
  metaTemplate: string;
}

export default function HistoricGameSection({
  game,
  lang,
  commentaryLabels,
  metaTemplate,
}: HistoricGameSectionProps) {
  const [moveIndex, setMoveIndex] = useState(0);
  const event = pickLocalized(game.event, lang);
  const meta = metaTemplate
    .replace("{white}", game.white)
    .replace("{black}", game.black)
    .replace("{event}", event)
    .replace("{date}", game.date)
    .replace("{result}", game.result);

  return (
    <Card className="theme-bg-secondary theme-border">
      <CardHeader>
        <CardTitle className="text-base text-cyan-200">{meta}</CardTitle>
      </CardHeader>
      <CardContent>
        <LessonChessboard
          uciMoves={game.uciMoves}
          historicalAnnotations={game.annotations}
          lang={lang}
          commentaryLabels={commentaryLabels}
          moveIndex={moveIndex}
          onMoveIndexChange={setMoveIndex}
        />
      </CardContent>
    </Card>
  );
}
