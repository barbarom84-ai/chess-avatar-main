"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OpeningVariant } from "@/lib/opening-lessons";
import { pickLocalized } from "@/lib/opening-lessons";
import LessonChessboard from "./LessonChessboard";

interface OpeningVariantSectionProps {
  variant: OpeningVariant;
  lang: "fr" | "en";
  commentaryLabels: {
    moveLabel: string;
    of: string;
    noComment: string;
  };
  orientation: "white" | "black";
}

export default function OpeningVariantSection({
  variant,
  lang,
  commentaryLabels,
  orientation,
}: OpeningVariantSectionProps) {
  const [moveIndex, setMoveIndex] = useState(0);
  const uci = variant.line.map((m) => m.uci);
  const comments = variant.line.map((m) => m.comment);
  const title = pickLocalized(variant.title, lang);
  const desc = variant.description ? pickLocalized(variant.description, lang) : null;

  return (
    <Card className="theme-bg-secondary theme-border">
      <CardHeader>
        <CardTitle className="text-lg text-cyan-200">{title}</CardTitle>
        {desc && <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>}
      </CardHeader>
      <CardContent>
        <LessonChessboard
          uciMoves={uci}
          comments={comments}
          lang={lang}
          commentaryLabels={commentaryLabels}
          moveIndex={moveIndex}
          onMoveIndexChange={setMoveIndex}
          orientation={orientation}
        />
      </CardContent>
    </Card>
  );
}
