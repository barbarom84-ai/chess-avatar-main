"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useMemo } from "react";
import { rollingWinRate, type ProgressionPoint } from "@/lib/persona-move-analysis";
import { useLanguage } from "@/lib/language-context";

interface ProgressionTimelineProps {
  timeline: ProgressionPoint[];
}

export default function ProgressionTimeline({ timeline }: ProgressionTimelineProps) {
  const { t } = useLanguage();

  const chartData = useMemo(() => rollingWinRate(timeline, 10), [timeline]);

  const ratingData = useMemo(() => {
    return timeline
      .filter((p) => p.rating != null)
      .map((p, i) => ({
        date: p.date,
        rating: p.rating,
        gameIndex: i + 1,
      }));
  }, [timeline]);

  if (timeline.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        {t.performanceCharts.timelineEmpty}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-2">
          {t.performanceCharts.timelineWinRate}
        </h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="gameIndex" stroke="#94a3b8" fontSize={11} />
            <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} unit="%" />
            <Tooltip
              contentStyle={{ background: "#1e293b", border: "1px solid #475569" }}
              formatter={(value: number) => [`${value}%`, t.performanceCharts.wins]}
            />
            <Line
              type="monotone"
              dataKey="winRate"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {ratingData.length > 1 && (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">
            {t.performanceCharts.timelineRating}
          </h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={ratingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="gameIndex" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #475569" }}
              />
              <Line
                type="monotone"
                dataKey="rating"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
