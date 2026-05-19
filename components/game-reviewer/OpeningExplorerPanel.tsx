"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import SanNotation from "@/components/SanNotation";
import { useChessboardSettings } from "@/contexts/ChessboardSettingsContext";
import { useLanguage } from "@/lib/language-context";
import { uciToVerboseMoveFromFen } from "@/lib/learn-chess-utils";

export interface MastersExplorerBody {
  white?: number;
  draws?: number;
  black?: number;
  moves?: Array<{
    san?: string;
    uci?: string;
    white?: number;
    draws?: number;
    black?: number;
  }>;
}

export function OpeningExplorerPanel({ fen }: { fen: string }) {
  const { t } = useLanguage();
  const { settings } = useChessboardSettings();
  const sideToMove = useMemo(() => {
    try {
      return fen.split(" ")[1] === "b" ? "b" : "w";
    } catch {
      return "w";
    }
  }, [fen]);
  const [expanded, setExpanded] = useState(false);
  const [pool, setPool] = useState<"masters" | "lichess">("lichess");
  const [body, setBody] = useState<MastersExplorerBody | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!expanded || !fen) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const res = await fetch(
          `/api/openings/explorer?fen=${encodeURIComponent(fen)}&pool=${pool}`
        );
        const json = (await res.json().catch(() => null)) as {
          data?: MastersExplorerBody;
          cached?: boolean;
        } | null;
        if (cancelled) return;
        if (!res.ok || !json?.data) {
          setError(true);
          setBody(null);
          return;
        }
        setBody(json.data);
        setFromCache(Boolean(json.cached));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expanded, fen, pool]);

  return (
    <div className="rounded border border-sky-500/25 bg-sky-950/30 px-2 py-2 text-[11px]">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 w-full text-left font-semibold text-sky-200 hover:text-sky-100"
      >
        <BarChart3 className="h-3.5 w-3.5 shrink-0" />
        {t.review.opening.explorerTitle}
      </button>
      {expanded && (
        <div className="mt-2 space-y-1">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setPool("masters")}
              className={`rounded px-2 py-0.5 text-[10px] border transition-colors ${
                pool === "masters"
                  ? "border-sky-400 bg-sky-900/80 text-sky-100"
                  : "border-sky-800/60 text-slate-400 hover:border-sky-600"
              }`}
            >
              {t.review.opening.explorerPoolMasters}
            </button>
            <button
              type="button"
              onClick={() => setPool("lichess")}
              className={`rounded px-2 py-0.5 text-[10px] border transition-colors ${
                pool === "lichess"
                  ? "border-sky-400 bg-sky-900/80 text-sky-100"
                  : "border-sky-800/60 text-slate-400 hover:border-sky-600"
              }`}
            >
              {t.review.opening.explorerPoolLichess}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">{t.review.opening.explorerPoolHint}</p>
        </div>
      )}
      {expanded && loading && (
        <div className="flex items-center gap-2 mt-2 text-sky-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t.review.opening.explorerLoading}
        </div>
      )}
      {expanded && error && (
        <p className="mt-2 text-red-300">{t.review.opening.explorerError}</p>
      )}
      {expanded && body?.moves && body.moves.length > 0 && (
        <ul className="mt-2 space-y-1 max-h-56 overflow-y-auto">
          {body.moves.map((m, i) => (
            <li
              key={`${m.uci ?? m.san}-${i}`}
              className="flex justify-between gap-2 font-mono text-[10px] text-slate-200 items-center"
            >
              <span className="inline-flex items-center min-w-0">
                <SanNotation
                  verboseMove={
                    m.uci ? uciToVerboseMoveFromFen(fen, m.uci) : null
                  }
                  fallbackSan={m.san ?? m.uci ?? ""}
                  movingColor={sideToMove}
                  pieceSet={settings.pieceSet}
                  size="sm"
                />
              </span>
              <span className="text-slate-500 shrink-0">
                W{m.white ?? 0} · D{m.draws ?? 0} · B{m.black ?? 0}
              </span>
            </li>
          ))}
        </ul>
      )}
      {expanded && fromCache && !loading && (
        <p className="text-[10px] text-slate-500 mt-1">{t.review.opening.explorerCached}</p>
      )}
    </div>
  );
}
