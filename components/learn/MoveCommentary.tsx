"use client";

import { ScrollArea } from "@/components/ui/scroll-area";

interface MoveCommentaryProps {
  moveIndex: number;
  totalMoves: number;
  currentSan: string | null;
  comment: string | null;
  labels: {
    moveLabel: string;
    of: string;
    noComment: string;
  };
}

export default function MoveCommentary({
  moveIndex,
  totalMoves,
  currentSan,
  comment,
  labels,
}: MoveCommentaryProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-4 space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>
          {labels.moveLabel} {Math.max(0, moveIndex)} {labels.of} {totalMoves}
        </span>
        {currentSan && (
          <span className="font-mono text-amber-300 font-semibold">{currentSan}</span>
        )}
      </div>
      <ScrollArea className="h-[120px] w-full rounded-md border border-slate-800 bg-slate-900/50 p-3">
        <p className="text-sm text-slate-200 leading-relaxed">
          {comment || labels.noComment}
        </p>
      </ScrollArea>
    </div>
  );
}
