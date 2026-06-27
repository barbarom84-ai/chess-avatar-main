"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";

type EvalGraphPanelProps = {
  data: Array<{ ply: number; eval: number }>;
  evalLabel: string;
  plyLabel: string;
};

export default function EvalGraphPanel({ data, evalLabel, plyLabel }: EvalGraphPanelProps) {
  if (data.length <= 1) return null;

  return (
    <div className="h-36 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="ply" hide />
          <YAxis domain={[-10, 10]} hide />
          <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
          <ReTooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #334155",
              fontSize: 12,
            }}
            formatter={(value: number) => [value.toFixed(2), evalLabel]}
            labelFormatter={(label: number) => `${plyLabel} ${label}`}
          />
          <Line
            type="monotone"
            dataKey="eval"
            stroke="#22d3ee"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
