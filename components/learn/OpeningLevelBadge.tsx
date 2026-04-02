"use client";

import { Badge } from "@/components/ui/badge";
import type { Opening } from "@/lib/openings-library";

interface OpeningLevelBadgeProps {
  difficulty: Opening["difficulty"];
  labels: [string, string, string, string, string];
}

export default function OpeningLevelBadge({ difficulty, labels }: OpeningLevelBadgeProps) {
  const idx = Math.min(4, Math.max(0, difficulty - 1));
  const label = labels[idx];
  const colors = [
    "border-green-500/60 text-green-300 bg-green-500/10",
    "border-blue-500/60 text-blue-300 bg-blue-500/10",
    "border-purple-500/60 text-purple-300 bg-purple-500/10",
    "border-orange-500/60 text-orange-300 bg-orange-500/10",
    "border-red-500/60 text-red-300 bg-red-500/10",
  ];
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${colors[idx]}`}>
      {label}
    </Badge>
  );
}
