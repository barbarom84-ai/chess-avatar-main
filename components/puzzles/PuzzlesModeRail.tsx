"use client";

import { Button } from "@/components/ui/button";
import { pickLocalized } from "@/lib/opening-lessons";
import type { HistoricalGame, MoveChallenge } from "@/lib/opening-lessons";

export type PuzzleMode = "daily" | "random" | "catalog" | "community";

export interface PuzzlesModeRailLabels {
  modeDaily: string;
  modeRandom: string;
  modeCatalog: string;
  modeCommunity: string;
  dailyDesc: string;
  randomDesc: string;
  historicalDesc: string;
  pickGame: string;
  newRandom: string;
  randomLoading: string;
  cloudPuzzleNew: string;
  cloudPuzzleLoading: string;
  cloudPuzzleAuth: string;
  cloudPuzzleDesc: string;
  emptyFeatured: string;
  challengesHeading: string;
}

interface PuzzlesModeRailProps {
  mode: PuzzleMode;
  onModeChange: (mode: PuzzleMode) => void;
  showCommunity: boolean;
  labels: PuzzlesModeRailLabels;
  lang: "fr" | "en";
  historicalGames: HistoricalGame[];
  selectedGameId: string;
  onSelectGame: (id: string) => void;
  selectedChallengeId: string | null;
  onSelectChallenge: (id: string) => void;
  randomLoading: boolean;
  onFetchRandom: () => void;
  cloudLoading: boolean;
  onFetchCloud: () => void;
  hasSession: boolean | null;
  sessionLoading: boolean;
}

const MODES: PuzzleMode[] = ["daily", "random", "catalog", "community"];

function modeLabel(mode: PuzzleMode, labels: PuzzlesModeRailLabels): string {
  switch (mode) {
    case "daily":
      return labels.modeDaily;
    case "random":
      return labels.modeRandom;
    case "catalog":
      return labels.modeCatalog;
    case "community":
      return labels.modeCommunity;
  }
}

function challengeTitle(c: MoveChallenge, lang: "fr" | "en"): string {
  return pickLocalized(c.prompt, lang);
}

export default function PuzzlesModeRail({
  mode,
  onModeChange,
  showCommunity,
  labels,
  lang,
  historicalGames,
  selectedGameId,
  onSelectGame,
  selectedChallengeId,
  onSelectChallenge,
  randomLoading,
  onFetchRandom,
  cloudLoading,
  onFetchCloud,
  hasSession,
  sessionLoading,
}: PuzzlesModeRailProps) {
  const visibleModes = showCommunity ? MODES : MODES.filter((m) => m !== "community");
  const selectedGame = historicalGames.find((g) => g.id === selectedGameId) ?? null;
  const challenges = selectedGame?.challenges ?? [];

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-slate-950/90 to-emerald-950/20 overflow-hidden flex flex-col">
      <div className="inline-flex w-full border-b border-slate-800/80 overflow-hidden flex-wrap">
        {visibleModes.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={`flex-1 min-w-[72px] px-2.5 py-2 text-xs font-medium transition-colors ${
              mode === m
                ? "bg-cyan-700 text-white"
                : "bg-slate-950/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            {modeLabel(m, labels)}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-3 flex-1 min-h-0">
        {mode === "daily" && (
          <p className="text-[11px] text-slate-500 leading-relaxed">{labels.dailyDesc}</p>
        )}

        {mode === "random" && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500 leading-relaxed">{labels.randomDesc}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              disabled={randomLoading}
              onClick={onFetchRandom}
            >
              {randomLoading ? labels.randomLoading : labels.newRandom}
            </Button>
          </div>
        )}

        {mode === "catalog" && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-500 leading-relaxed">{labels.historicalDesc}</p>
            {historicalGames.length === 0 ? (
              <p className="text-xs text-slate-500 leading-relaxed">{labels.emptyFeatured}</p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wide">
                    {labels.pickGame}
                  </label>
                  <select
                    className="w-full rounded-md border border-slate-600 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-600/40"
                    value={selectedGameId}
                    onChange={(e) => onSelectGame(e.target.value)}
                  >
                    {historicalGames.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.white} — {g.black} ({g.date})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                    {labels.challengesHeading}
                  </p>
                  <ul className="max-h-[min(52vh,420px)] overflow-y-auto space-y-1 pr-0.5">
                    {challenges.map((c, i) => {
                      const active = c.id === selectedChallengeId;
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => onSelectChallenge(c.id)}
                            className={`w-full text-left rounded-md px-2.5 py-2 text-xs transition-colors border ${
                              active
                                ? "border-cyan-500/50 bg-cyan-950/50 text-cyan-100"
                                : "border-transparent bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900/70"
                            }`}
                          >
                            <span className="text-slate-500 mr-1.5">{i + 1}.</span>
                            <span className="line-clamp-2">{challengeTitle(c, lang)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {mode === "community" && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500 leading-relaxed">{labels.cloudPuzzleDesc}</p>
            {!sessionLoading && hasSession === false && (
              <p className="text-xs text-slate-400">{labels.cloudPuzzleAuth}</p>
            )}
            {!sessionLoading && hasSession === true && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-cyan-700/50 text-cyan-200 hover:bg-cyan-950/40"
                disabled={cloudLoading}
                onClick={onFetchCloud}
              >
                {cloudLoading ? labels.cloudPuzzleLoading : labels.cloudPuzzleNew}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
