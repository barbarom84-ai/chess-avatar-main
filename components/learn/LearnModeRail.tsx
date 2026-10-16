"use client";

import { pickLocalized } from "@/lib/opening-lessons";
import type { HistoricalGame, MoveChallenge, OpeningVariant } from "@/lib/opening-lessons";

export type LearnMode = "study" | "model" | "variants" | "challenges" | "history";

export interface LearnModeRailLabels {
  modeStudy: string;
  modeModel: string;
  modeVariants: string;
  modeChallenges: string;
  modeHistory: string;
  studyHint: string;
  modelLineHint: string;
  pickVariant: string;
  pickChallenge: string;
  pickGame: string;
  variantsEmpty: string;
  challengesEmpty: string;
  historyEmpty: string;
}

interface LearnModeRailProps {
  mode: LearnMode;
  onModeChange: (mode: LearnMode) => void;
  labels: LearnModeRailLabels;
  lang: "fr" | "en";
  hasModel: boolean;
  variants: OpeningVariant[];
  selectedVariantId: string | null;
  onSelectVariant: (id: string) => void;
  challenges: { game: HistoricalGame; challenge: MoveChallenge }[];
  selectedChallengeKey: string | null;
  onSelectChallenge: (key: string) => void;
  games: HistoricalGame[];
  selectedGameId: string | null;
  onSelectGame: (id: string) => void;
}

export default function LearnModeRail({
  mode,
  onModeChange,
  labels,
  lang,
  hasModel,
  variants,
  selectedVariantId,
  onSelectVariant,
  challenges,
  selectedChallengeKey,
  onSelectChallenge,
  games,
  selectedGameId,
  onSelectGame,
}: LearnModeRailProps) {
  const modes: { id: LearnMode; label: string; show: boolean }[] = [
    { id: "study", label: labels.modeStudy, show: true },
    { id: "model", label: labels.modeModel, show: hasModel },
    { id: "variants", label: labels.modeVariants, show: variants.length > 0 },
    { id: "challenges", label: labels.modeChallenges, show: challenges.length > 0 },
    { id: "history", label: labels.modeHistory, show: games.length > 0 },
  ];
  const visible = modes.filter((m) => m.show);

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-b from-slate-950/90 to-emerald-950/20 overflow-hidden flex flex-col">
      <div className="inline-flex w-full border-b border-slate-800/80 overflow-hidden flex-wrap">
        {visible.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onModeChange(m.id)}
            className={`flex-1 min-w-[64px] px-2 py-2 text-xs font-medium transition-colors ${
              mode === m.id
                ? "bg-cyan-700 text-white"
                : "bg-slate-950/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-3 flex-1 min-h-0">
        {mode === "study" && (
          <p className="text-[11px] text-slate-500 leading-relaxed">{labels.studyHint}</p>
        )}
        {mode === "model" && (
          <p className="text-[11px] text-slate-500 leading-relaxed">{labels.modelLineHint}</p>
        )}

        {mode === "variants" && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">
              {labels.pickVariant}
            </p>
            {variants.length === 0 ? (
              <p className="text-xs text-slate-500">{labels.variantsEmpty}</p>
            ) : (
              <ul className="max-h-[min(52vh,420px)] overflow-y-auto space-y-1">
                {variants.map((v) => {
                  const active = v.id === selectedVariantId;
                  return (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => onSelectVariant(v.id)}
                        className={`w-full text-left rounded-md px-2.5 py-2 text-xs transition-colors border ${
                          active
                            ? "border-cyan-500/50 bg-cyan-950/50 text-cyan-100"
                            : "border-transparent bg-slate-900/40 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <span className="line-clamp-2">{pickLocalized(v.title, lang)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {mode === "challenges" && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">
              {labels.pickChallenge}
            </p>
            {challenges.length === 0 ? (
              <p className="text-xs text-slate-500">{labels.challengesEmpty}</p>
            ) : (
              <ul className="max-h-[min(52vh,420px)] overflow-y-auto space-y-1">
                {challenges.map(({ game, challenge }, i) => {
                  const key = `${game.id}:${challenge.id}`;
                  const active = key === selectedChallengeKey;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => onSelectChallenge(key)}
                        className={`w-full text-left rounded-md px-2.5 py-2 text-xs transition-colors border ${
                          active
                            ? "border-cyan-500/50 bg-cyan-950/50 text-cyan-100"
                            : "border-transparent bg-slate-900/40 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <span className="text-slate-500 mr-1.5">{i + 1}.</span>
                        <span className="line-clamp-2">
                          {pickLocalized(challenge.prompt, lang)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {mode === "history" && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">
              {labels.pickGame}
            </p>
            {games.length === 0 ? (
              <p className="text-xs text-slate-500">{labels.historyEmpty}</p>
            ) : (
              <ul className="max-h-[min(52vh,420px)] overflow-y-auto space-y-1">
                {games.map((g) => {
                  const active = g.id === selectedGameId;
                  return (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => onSelectGame(g.id)}
                        className={`w-full text-left rounded-md px-2.5 py-2 text-xs transition-colors border ${
                          active
                            ? "border-cyan-500/50 bg-cyan-950/50 text-cyan-100"
                            : "border-transparent bg-slate-900/40 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <span className="font-medium text-slate-200">
                          {g.white} — {g.black}
                        </span>
                        <span className="block text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                          {pickLocalized(g.event, lang)} · {g.date}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
