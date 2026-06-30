"use client";

import { useMemo } from "react";
import { heatIntensity, type SquareHeatMap } from "@/lib/persona-move-analysis";
import { useLanguage } from "@/lib/language-context";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

interface BoardHeatMapProps {
  heatMap: SquareHeatMap;
  className?: string;
}

function heatColor(intensity: number): string {
  if (intensity <= 0) return "transparent";
  const alpha = 0.15 + (intensity / 100) * 0.75;
  return `rgba(239, 68, 68, ${alpha})`;
}

export default function BoardHeatMap({ heatMap, className }: BoardHeatMapProps) {
  const { t } = useLanguage();

  const squares = useMemo(() => {
    const out: { sq: string; intensity: number; isLight: boolean }[] = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = `${FILES[f]}${RANKS[r]}`;
        const count = heatMap.squares[sq] ?? 0;
        out.push({
          sq,
          intensity: heatIntensity(count, heatMap.maxCount),
          isLight: (r + f) % 2 === 0,
        });
      }
    }
    return out;
  }, [heatMap]);

  if (heatMap.gamesAnalyzed === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        {t.performanceCharts.heatMapEmpty}
      </p>
    );
  }

  return (
    <div className={className}>
      <p className="text-xs text-slate-400 mb-3 text-center">
        {t.performanceCharts.heatMapSubtitle.replace(
          "{count}",
          String(heatMap.gamesAnalyzed)
        )}
      </p>
      <div className="grid grid-cols-8 gap-0 max-w-[320px] mx-auto rounded-lg overflow-hidden border border-slate-700">
        {squares.map(({ sq, intensity, isLight }) => (
          <div
            key={sq}
            className="aspect-square relative flex items-center justify-center text-[10px] text-slate-500"
            style={{
              backgroundColor: isLight ? "#f0d9b5" : "#b58863",
            }}
            title={`${sq}: ${intensity}%`}
          >
            <div
              className="absolute inset-0"
              style={{ backgroundColor: heatColor(intensity) }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-400">
        <span>{t.performanceCharts.heatMapLow}</span>
        <div className="flex h-3 w-24 rounded overflow-hidden">
          {[0, 25, 50, 75, 100].map((v) => (
            <div
              key={v}
              className="flex-1"
              style={{ backgroundColor: heatColor(v) }}
            />
          ))}
        </div>
        <span>{t.performanceCharts.heatMapHigh}</span>
      </div>
    </div>
  );
}
