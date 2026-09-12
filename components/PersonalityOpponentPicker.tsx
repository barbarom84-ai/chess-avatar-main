"use client";

import { useMemo, useState } from "react";
import { Crown, Flame, Play, RotateCcw, Swords, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import StyleRadarChart from "@/components/StyleRadarChart";
import { useLanguage } from "@/lib/language-context";
import { getOpeningById, getOpeningName } from "@/lib/openings-library";
import {
  listPersonalityOpponents,
  personalityArchetype,
  personalityBio,
  personalityDisplayName,
  personalityEra,
  type PersonalityAccent,
  type PersonalityKind,
  type PersonalityOpponent,
} from "@/lib/personality-opponents";
import {
  personalityPlayHref,
  playingStyleFromPersonality,
  resolvePersonalityStyle,
  type PersonalityStyleOverrides,
} from "@/lib/personality-to-engine";

const ACCENT: Record<
  PersonalityAccent,
  { ring: string; bg: string; text: string; border: string; bar: string }
> = {
  amber: {
    ring: "ring-amber-400/60",
    bg: "bg-amber-500/15",
    text: "text-amber-300",
    border: "border-amber-500/40",
    bar: "bg-amber-400",
  },
  rose: {
    ring: "ring-rose-400/60",
    bg: "bg-rose-500/15",
    text: "text-rose-300",
    border: "border-rose-500/40",
    bar: "bg-rose-400",
  },
  cyan: {
    ring: "ring-cyan-400/60",
    bg: "bg-cyan-500/15",
    text: "text-cyan-300",
    border: "border-cyan-500/40",
    bar: "bg-cyan-400",
  },
  violet: {
    ring: "ring-violet-400/60",
    bg: "bg-violet-500/15",
    text: "text-violet-300",
    border: "border-violet-500/40",
    bar: "bg-violet-400",
  },
  emerald: {
    ring: "ring-emerald-400/60",
    bg: "bg-emerald-500/15",
    text: "text-emerald-300",
    border: "border-emerald-500/40",
    bar: "bg-emerald-400",
  },
  orange: {
    ring: "ring-orange-400/60",
    bg: "bg-orange-500/15",
    text: "text-orange-300",
    border: "border-orange-500/40",
    bar: "bg-orange-400",
  },
  sky: {
    ring: "ring-sky-400/60",
    bg: "bg-sky-500/15",
    text: "text-sky-300",
    border: "border-sky-500/40",
    bar: "bg-sky-400",
  },
  fuchsia: {
    ring: "ring-fuchsia-400/60",
    bg: "bg-fuchsia-500/15",
    text: "text-fuchsia-300",
    border: "border-fuchsia-500/40",
    bar: "bg-fuchsia-400",
  },
  lime: {
    ring: "ring-lime-400/60",
    bg: "bg-lime-500/15",
    text: "text-lime-300",
    border: "border-lime-500/40",
    bar: "bg-lime-400",
  },
};

function openingLabel(id: string, lang: string): string {
  const op = getOpeningById(id);
  return op ? getOpeningName(op, lang) : id;
}

function MiniBars({
  opponent,
  overrides,
}: {
  opponent: PersonalityOpponent;
  overrides: PersonalityStyleOverrides;
}) {
  const resolved = resolvePersonalityStyle(opponent, overrides);
  const accent = ACCENT[opponent.accent];
  const rows = [
    { key: "a", value: resolved.aggression },
    { key: "r", value: resolved.risk },
    { key: "p", value: resolved.positional },
  ];
  return (
    <div className="flex flex-col gap-1 mt-2" aria-hidden>
      {rows.map((row) => (
        <div key={row.key} className="h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full ${accent.bar}`}
            style={{ width: `${row.value}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export default function PersonalityOpponentPicker({
  onPlay,
}: {
  onPlay: (href: string) => void;
}) {
  const { lang, t } = useLanguage();
  const copy = t.play.personalities;
  const [kindFilter, setKindFilter] = useState<PersonalityKind | "all">("all");
  const [selectedId, setSelectedId] = useState<string>(
    listPersonalityOpponents("legend")[0]?.id ?? "tal"
  );
  const [overrides, setOverrides] = useState<PersonalityStyleOverrides>({});

  const opponents = useMemo(
    () =>
      kindFilter === "all"
        ? listPersonalityOpponents()
        : listPersonalityOpponents(kindFilter),
    [kindFilter]
  );

  const selected =
    opponents.find((p) => p.id === selectedId) ??
    listPersonalityOpponents().find((p) => p.id === selectedId) ??
    opponents[0];

  const resolved = selected
    ? resolvePersonalityStyle(selected, overrides)
    : null;
  const radarStyle = selected
    ? playingStyleFromPersonality(selected, overrides)
    : null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setOverrides({});
  };

  const startHref = selected
    ? personalityPlayHref(selected.id, overrides, selected)
    : "/play";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", copy.filterAll],
            ["legend", copy.legends],
            ["archetype", copy.archetypes],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={kindFilter === key ? "default" : "outline"}
            className={
              kindFilter === key
                ? "bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500"
                : "border-slate-600 text-slate-200"
            }
            onClick={() => setKindFilter(key)}
          >
            {key === "legend" ? (
              <Crown className="h-3.5 w-3.5" />
            ) : key === "archetype" ? (
              <Landmark className="h-3.5 w-3.5" />
            ) : (
              <Swords className="h-3.5 w-3.5" />
            )}
            {label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,380px)] gap-6 items-start">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {opponents.map((p) => {
            const accent = ACCENT[p.accent];
            const selectedCard = selected?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p.id)}
                className={`text-left rounded-xl border bg-slate-900/80 p-3 transition-all hover:border-cyan-500/50 ${
                  selectedCard
                    ? `ring-2 ${accent.ring} ${accent.border} ${accent.bg}`
                    : "border-slate-700/80"
                }`}
              >
                <div className="flex items-start gap-3">
                  {p.portraitUrl ? (
                    <img
                      src={p.portraitUrl}
                      alt=""
                      className={`h-12 w-12 shrink-0 rounded-full border ${accent.border} object-cover bg-slate-950`}
                    />
                  ) : (
                    <div
                      className={`h-12 w-12 shrink-0 rounded-full border ${accent.border} ${accent.bg} ${accent.text} flex items-center justify-center font-bold text-sm`}
                      aria-hidden
                    >
                      {p.portraitInitials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-100 truncate">
                      {personalityDisplayName(p, lang)}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {personalityEra(p, lang)}
                      {p.years ? ` · ${p.years}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-4 px-1.5 ${accent.border} ${accent.text}`}
                      >
                        {personalityArchetype(p, lang)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1.5 border-slate-600 text-slate-400"
                      >
                        {p.elo} Elo
                      </Badge>
                    </div>
                  </div>
                </div>
                <MiniBars
                  opponent={p}
                  overrides={selectedCard ? overrides : {}}
                />
              </button>
            );
          })}
        </div>

        {selected && resolved && radarStyle && (
          <Card className="bg-slate-900 border-slate-700/80 lg:sticky lg:top-20">
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-start gap-3">
                {selected.portraitUrl ? (
                  <img
                    src={selected.portraitUrl}
                    alt=""
                    className={`h-14 w-14 shrink-0 rounded-full border ${ACCENT[selected.accent].border} object-cover bg-slate-950`}
                  />
                ) : (
                  <div
                    className={`h-14 w-14 shrink-0 rounded-full border ${ACCENT[selected.accent].border} ${ACCENT[selected.accent].bg} ${ACCENT[selected.accent].text} flex items-center justify-center font-bold`}
                  >
                    {selected.portraitInitials}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-cyan-100">
                    {personalityDisplayName(selected, lang)}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {personalityEra(selected, lang)}
                    {selected.years ? ` · ${selected.years}` : ""}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {personalityBio(selected, lang)}
              </p>

              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                <StyleRadarChart style={radarStyle} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                  {copy.openings}
                </p>
                <p className="text-xs text-slate-300">
                  <span className="text-slate-500">{copy.white}: </span>
                  {selected.whiteOpenings
                    .map((o) => openingLabel(o.id, lang))
                    .join(" · ")}
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  <span className="text-slate-500">{copy.black}: </span>
                  {selected.blackOpenings
                    .map((o) => openingLabel(o.id, lang))
                    .join(" · ")}
                </p>
              </div>

              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-cyan-200 flex items-center gap-1.5">
                    <Flame className="h-4 w-4" />
                    {copy.tweakTitle}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-slate-400"
                    onClick={() => setOverrides({})}
                  >
                    <RotateCcw className="h-3 w-3" />
                    {copy.resetSliders}
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500 -mt-2">{copy.tweakHint}</p>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <Label className="text-slate-300">{copy.aggression}</Label>
                    <span className="text-cyan-300 tabular-nums">
                      {resolved.aggression}
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[resolved.aggression]}
                    onValueChange={(vals) => {
                      const v = vals[0];
                      if (v === undefined) return;
                      setOverrides((prev) => ({ ...prev, aggression: v }));
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <Label className="text-slate-300">{copy.risk}</Label>
                    <span className="text-cyan-300 tabular-nums">{resolved.risk}</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[resolved.risk]}
                    onValueChange={(vals) => {
                      const v = vals[0];
                      if (v === undefined) return;
                      setOverrides((prev) => ({ ...prev, risk: v }));
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <Label className="text-slate-300">{copy.positional}</Label>
                    <span className="text-cyan-300 tabular-nums">
                      {resolved.positional}
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[resolved.positional]}
                    onValueChange={(vals) => {
                      const v = vals[0];
                      if (v === undefined) return;
                      setOverrides((prev) => ({ ...prev, positional: v }));
                    }}
                  />
                  <p className="text-[10px] text-slate-500">{copy.positionalHint}</p>
                </div>
              </div>

              <Button
                type="button"
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                onClick={() => onPlay(startHref)}
              >
                <Play className="h-4 w-4" />
                {copy.startGame}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
