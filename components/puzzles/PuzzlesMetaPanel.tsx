"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { NormalizedLichessPuzzle } from "@/lib/lichess-puzzle";
import type { HistoricalGame } from "@/lib/opening-lessons";
import { pickLocalized } from "@/lib/opening-lessons";

export interface PuzzlesMetaPanelLabels {
  openLearn: string;
  openOnLichess: string;
  communityManualLink?: string;
  rating: string;
  plays: string;
  themes: string;
  modeDaily: string;
  modeRandom: string;
  modeCatalog: string;
  modeCommunity: string;
  modeLabel: string;
}

interface PuzzlesMetaPanelProps {
  mode: "daily" | "random" | "catalog" | "community";
  labels: PuzzlesMetaPanelLabels;
  lang: "fr" | "en";
  historyMetaTemplate: string;
  lichessPuzzle: NormalizedLichessPuzzle | null;
  selectedGame: HistoricalGame | null;
  showAdminLink: boolean;
}

export default function PuzzlesMetaPanel({
  mode,
  labels,
  lang,
  historyMetaTemplate,
  lichessPuzzle,
  selectedGame,
  showAdminLink,
}: PuzzlesMetaPanelProps) {
  const modeTitle =
    mode === "daily"
      ? labels.modeDaily
      : mode === "random"
        ? labels.modeRandom
        : mode === "catalog"
          ? labels.modeCatalog
          : labels.modeCommunity;

  const playersLine = (() => {
    if (!lichessPuzzle) return null;
    const w = lichessPuzzle.players.find((p) => p.color === "white");
    const b = lichessPuzzle.players.find((p) => p.color === "black");
    if (!w && !b) return null;
    const wr = w?.rating != null ? ` (${w.rating})` : "";
    const br = b?.rating != null ? ` (${b.rating})` : "";
    return `${w?.name ?? "?"}${wr} — ${b?.name ?? "?"}${br}`;
  })();

  const gameMeta =
    selectedGame && mode === "catalog"
      ? historyMetaTemplate
          .replace("{white}", selectedGame.white)
          .replace("{black}", selectedGame.black)
          .replace("{event}", pickLocalized(selectedGame.event, lang))
          .replace("{date}", selectedGame.date)
          .replace("{result}", selectedGame.result)
      : null;

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-slate-950/90 to-slate-900/40 p-3 space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">{labels.modeLabel}</p>
        <p className="text-sm font-semibold text-slate-100">{modeTitle}</p>
      </div>

      {(mode === "daily" || mode === "random") && lichessPuzzle && (
        <div className="space-y-2 text-xs text-slate-400">
          {playersLine && <p className="text-slate-300 leading-snug">{playersLine}</p>}
          <p>
            {labels.rating}:{" "}
            <strong className="text-slate-200">{lichessPuzzle.rating}</strong>
          </p>
          <p>
            {labels.plays}:{" "}
            <strong className="text-slate-200">{lichessPuzzle.plays.toLocaleString()}</strong>
          </p>
          {lichessPuzzle.themes.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                {labels.themes}
              </p>
              <div className="flex flex-wrap gap-1">
                {lichessPuzzle.themes.map((theme) => (
                  <span
                    key={theme}
                    className="rounded border border-slate-700/80 bg-slate-900/50 px-1.5 py-0.5 text-[10px] text-slate-300"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}
          <a
            href={`https://lichess.org/training/${lichessPuzzle.puzzleId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-cyan-400 hover:text-cyan-300 underline-offset-2 hover:underline"
          >
            {labels.openOnLichess}
          </a>
        </div>
      )}

      {mode === "catalog" && gameMeta && (
        <p className="text-xs text-slate-300 leading-relaxed border border-slate-700/60 rounded-md px-2.5 py-2 bg-slate-900/40">
          {gameMeta}
        </p>
      )}

      <div className="pt-1 space-y-2 border-t border-slate-800/80">
        <Button asChild variant="secondary" size="sm" className="w-full text-xs">
          <Link href="/learn">{labels.openLearn}</Link>
        </Button>
        {showAdminLink && labels.communityManualLink && (
          <Button asChild variant="link" size="sm" className="h-auto p-0 text-amber-400/95 text-xs">
            <Link href="/puzzles/admin/community">{labels.communityManualLink}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
