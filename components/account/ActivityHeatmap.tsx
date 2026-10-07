"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { fill, formatShortDate } from "@/lib/account-format";
import type { AccountStats } from "@/lib/account-types";
import type { AccountCopy } from "./types";

function level(count: number, max: number): number {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4)));
}

/** Monday = 0 … Sunday = 6. */
function weekdayIndex(dateKey: string): number {
  const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
  return (day + 6) % 7;
}

type ActivityHeatmapProps = {
  copy: AccountCopy;
  lang: string;
  activity: AccountStats["activity"];
};

export function ActivityHeatmap({ copy, lang, activity }: ActivityHeatmapProps) {
  const { cells, max } = useMemo(() => {
    const days = activity.days;
    const first = days[0];
    const padding = first ? weekdayIndex(first.date) : 0;
    const maxCount = days.reduce((m, d) => Math.max(m, d.count), 0);
    return {
      cells: [...Array.from({ length: padding }, () => null), ...days],
      max: maxCount,
    };
  }, [activity.days]);

  return (
    <section className="account-card">
      <h3 className="account-card-title">
        <CalendarDays aria-hidden />
        {copy.stats.activityTitle}
      </h3>
      <div className="heatmap-grid" role="img" aria-label={copy.stats.activityTitle}>
        {cells.map((day, i) =>
          day ? (
            <div
              key={day.date}
              className={`heatmap-cell heatmap-cell--l${level(day.count, max)}`}
              title={fill(copy.stats.activityCell, { count: day.count, date: formatShortDate(day.date, lang) })}
            />
          ) : (
            <div key={`pad-${i}`} className="heatmap-cell heatmap-cell--empty" />
          )
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>
          {fill(copy.stats.activitySummary, {
            days: activity.activeDays,
            current: activity.currentDayStreak,
            best: activity.bestDayStreak,
          })}
        </span>
        <span className="flex items-center gap-1" aria-hidden>
          {copy.stats.less}
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={`heatmap-cell heatmap-cell--l${l} inline-block h-2.5 w-2.5`} />
          ))}
          {copy.stats.more}
        </span>
      </div>
    </section>
  );
}
