"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartPie } from "lucide-react";
import type { AccountStats } from "@/lib/account-types";
import type { AccountCopy } from "./types";

const COLORS = { wins: "#34d399", draws: "#94a3b8", losses: "#fb7185" };

const tooltipStyle = {
  contentStyle: {
    background: "rgb(15 23 42)",
    border: "1px solid rgb(51 65 85)",
    borderRadius: 10,
    fontSize: 12,
  },
  itemStyle: { color: "rgb(226 232 240)" },
  labelStyle: { color: "rgb(148 163 184)" },
} as const;

type ResultsChartsProps = {
  copy: AccountCopy;
  stats: AccountStats;
};

export default function ResultsCharts({ copy, stats }: ResultsChartsProps) {
  const { overview, bots } = stats;
  const pie = [
    { key: "wins", name: copy.stats.wins, value: overview.wins },
    { key: "draws", name: copy.stats.draws, value: overview.draws },
    { key: "losses", name: copy.stats.losses, value: overview.losses },
  ] as const;
  const bars = [
    { name: copy.stats.white, wins: bots.asWhite.wins, draws: bots.asWhite.draws, losses: bots.asWhite.losses },
    { name: copy.stats.black, wins: bots.asBlack.wins, draws: bots.asBlack.draws, losses: bots.asBlack.losses },
  ];

  return (
    <section className="account-card">
      <h3 className="account-card-title">
        <ChartPie aria-hidden />
        {copy.stats.resultsTitle}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="relative h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={[...pie]} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke="none">
                {pie.map((d) => (
                  <Cell key={d.key} fill={COLORS[d.key]} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums text-slate-50">{Math.round(overview.winRate)} %</span>
            <span className="text-[11px] text-slate-400">{copy.stats.wins}</span>
          </div>
        </div>

        <div className="h-44">
          <p className="text-[11px] text-slate-400 mb-1">{copy.stats.colorsTitle}</p>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={bars} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={56} tick={{ fill: "rgb(203 213 225)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "rgb(51 65 85 / 0.25)" }} />
              <Bar dataKey="wins" name={copy.stats.wins} stackId="r" fill={COLORS.wins} radius={[4, 0, 0, 4]} />
              <Bar dataKey="draws" name={copy.stats.draws} stackId="r" fill={COLORS.draws} />
              <Bar dataKey="losses" name={copy.stats.losses} stackId="r" fill={COLORS.losses} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
        {pie.map((d) => (
          <span key={d.key} className="inline-flex items-center gap-1.5 tabular-nums">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[d.key] }} />
            {d.name} · {d.value}
          </span>
        ))}
      </div>
    </section>
  );
}
