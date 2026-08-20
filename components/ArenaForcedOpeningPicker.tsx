"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import {
  ensureOpeningsPartitionsLoaded,
  getAggregatedOpenings,
} from "@/lib/openings-registry";
import { getOpeningName, type Opening } from "@/lib/openings-library";
import { BookOpen, Loader2 } from "lucide-react";

type ArenaForcedOpeningPickerProps = {
  value: string | null;
  onChange: (openingId: string | null) => void;
};

function openingMatchesQuery(opening: Opening, q: string, lang: string): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;
  const name = getOpeningName(opening, lang).toLowerCase();
  return (
    name.includes(query) ||
    opening.eco.toLowerCase().includes(query) ||
    opening.tags.some((tag) => tag.toLowerCase().includes(query)) ||
    opening.id.toLowerCase().includes(query)
  );
}

export default function ArenaForcedOpeningPicker({
  value,
  onChange,
}: ArenaForcedOpeningPickerProps) {
  const { t, lang } = useLanguage();
  const ap = t.arenaPage;
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    void ensureOpeningsPartitionsLoaded().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const playableOpenings = useMemo(() => {
    if (loading) return [];
    return getAggregatedOpenings().filter((o) => o.uciMoves.length > 0);
  }, [loading]);

  const filtered = useMemo(() => {
    return playableOpenings.filter((o) => openingMatchesQuery(o, search, lang));
  }, [playableOpenings, search, lang]);

  const selected = value
    ? playableOpenings.find((o) => o.id === value) ??
      getAggregatedOpenings().find((o) => o.id === value)
    : undefined;

  return (
    <div className="rounded-lg border border-cyan-500/20 bg-slate-900/60 px-3 py-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <Label className="text-sm text-slate-200 flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-cyan-400 shrink-0" />
            {ap.forcedOpeningLabel}
          </Label>
          <p className="text-[11px] text-slate-500 leading-snug">
            {ap.adaptiveTimingHint}
          </p>
        </div>
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-cyan-500 shrink-0" />
        )}
      </div>

      <Input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={ap.forcedOpeningSearch}
        className="h-8 text-xs bg-slate-950 border-slate-700"
        disabled={loading}
      />

      <ScrollArea className="h-[140px] rounded-md border border-slate-800 bg-slate-950/80">
        <div className="p-1 space-y-0.5">
          <button
            type="button"
            className={`w-full text-left rounded px-2 py-1.5 text-xs transition-colors ${
              value === null
                ? "bg-cyan-900/50 text-cyan-100"
                : "text-slate-400 hover:bg-slate-800/80"
            }`}
            onClick={() => onChange(null)}
          >
            {ap.forcedOpeningNone}
          </button>
          {loading ? (
            <p className="px-2 py-3 text-xs text-slate-500 text-center">
              {ap.forcedOpeningLoading}
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-3 text-xs text-slate-500 text-center">
              {t.arenaPage.pickNoMatches}
            </p>
          ) : (
            filtered.slice(0, 80).map((opening) => (
              <button
                key={opening.id}
                type="button"
                className={`w-full text-left rounded px-2 py-1.5 text-xs transition-colors ${
                  value === opening.id
                    ? "bg-cyan-900/50 text-cyan-100"
                    : "text-slate-300 hover:bg-slate-800/80"
                }`}
                onClick={() => onChange(opening.id)}
              >
                <span className="font-medium">
                  {getOpeningName(opening, lang)}
                </span>
                <span className="text-slate-500 ml-1">({opening.eco})</span>
                <span className="text-slate-600 ml-1">
                  · {opening.uciMoves.length} UCI
                </span>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {selected && (
        <div className="text-[11px] text-slate-400 space-y-1 border-t border-slate-800 pt-2">
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="outline" className="text-[10px] border-cyan-700/50">
              {getOpeningName(selected, lang)}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {selected.eco}
            </Badge>
          </div>
          {selected.moves ? (
            <p>
              <span className="text-slate-500">{ap.forcedOpeningPreview}: </span>
              <span className="text-slate-300">{selected.moves}</span>
            </p>
          ) : null}
          {selected.uciMoves.length === 0 ? (
            <p className="text-amber-500/90">{ap.forcedOpeningNoUci}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
