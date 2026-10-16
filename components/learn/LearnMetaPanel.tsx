"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import OpeningLevelBadge from "@/components/learn/OpeningLevelBadge";
import type { LearnMode } from "@/components/learn/LearnModeRail";
import type { Opening } from "@/lib/openings-library";

export interface LearnMetaPanelLabels {
  modeLabel: string;
  modeStudy: string;
  modeModel: string;
  modeVariants: string;
  modeChallenges: string;
  modeHistory: string;
  eco: string;
  useInRepertoire: string;
  useInRepertoireHint: string;
  backToHub: string;
  editLesson?: string;
}

interface LearnMetaPanelProps {
  mode: LearnMode;
  labels: LearnMetaPanelLabels;
  title: string;
  hook: string;
  opening: Opening;
  difficultyLabels: [string, string, string, string, string];
  metaExtra?: string | null;
  showAdminEdit: boolean;
  openingId: string;
}

function modeTitle(mode: LearnMode, labels: LearnMetaPanelLabels): string {
  switch (mode) {
    case "study":
      return labels.modeStudy;
    case "model":
      return labels.modeModel;
    case "variants":
      return labels.modeVariants;
    case "challenges":
      return labels.modeChallenges;
    case "history":
      return labels.modeHistory;
  }
}

export default function LearnMetaPanel({
  mode,
  labels,
  title,
  hook,
  opening,
  difficultyLabels,
  metaExtra,
  showAdminEdit,
  openingId,
}: LearnMetaPanelProps) {
  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-slate-950/90 to-slate-900/40 p-3 space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">{labels.modeLabel}</p>
        <p className="text-sm font-semibold text-slate-100">{modeTitle(mode, labels)}</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-amber-400/90">
            {labels.eco} {opening.eco}
          </span>
          <OpeningLevelBadge difficulty={opening.difficulty} labels={difficultyLabels} />
        </div>
        <p className="text-sm font-semibold text-slate-100 leading-snug">{title}</p>
        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-4">{hook}</p>
      </div>

      {metaExtra && (
        <p className="text-xs text-slate-300 leading-relaxed border border-slate-700/60 rounded-md px-2.5 py-2 bg-slate-900/40">
          {metaExtra}
        </p>
      )}

      <div className="pt-1 space-y-2 border-t border-slate-800/80">
        <Button asChild variant="secondary" size="sm" className="w-full text-xs">
          <Link href="/">{labels.useInRepertoire}</Link>
        </Button>
        <p className="text-[10px] text-slate-500 leading-relaxed">{labels.useInRepertoireHint}</p>
        <Button asChild variant="ghost" size="sm" className="w-full text-xs text-cyan-300">
          <Link href="/learn">{labels.backToHub}</Link>
        </Button>
        {showAdminEdit && labels.editLesson && (
          <Button asChild variant="link" size="sm" className="h-auto p-0 text-amber-400/95 text-xs">
            <Link href={`/learn/admin/edit/${openingId}`}>{labels.editLesson}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
