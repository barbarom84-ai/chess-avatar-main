"use client";

import { useLanguage } from "@/lib/language-context";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import type { PlayingStyle } from '@/types/chess';

interface StyleRadarChartProps {
  style: PlayingStyle;
  className?: string;
}

export default function StyleRadarChart({ style, className = '' }: StyleRadarChartProps) {
  const { t } = useLanguage();
  const data = [
    {
      attribute: t.styleRadar.aggressiveness,
      value: style.aggression,
      fullMark: 100
    },
    {
      attribute: t.styleRadar.tactics,
      value: style.tactical,
      fullMark: 100
    },
    {
      attribute: t.styleRadar.positional,
      value: style.positional,
      fullMark: 100
    },
    {
      attribute: t.styleRadar.endgames,
      value: style.endgame,
      fullMark: 100
    },
    {
      attribute: t.styleRadar.theory,
      value: style.openingTheory,
      fullMark: 100
    },
    {
      attribute: t.styleRadar.timeManagement,
      value: style.timeManagement,
      fullMark: 100
    }
  ];

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="#475569" />
          <PolarAngleAxis 
            dataKey="attribute" 
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={{ fill: '#64748b', fontSize: 10 }}
          />
          <Radar
            name={t.ui.playingStyle}
            dataKey="value"
            stroke="#06b6d4"
            fill="#06b6d4"
            fillOpacity={0.6}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #06b6d4',
              borderRadius: '8px',
              color: '#e2e8f0'
            }}
            formatter={(value: number) => [`${value}/100`, 'Score']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
