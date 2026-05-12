import { Chess } from "chess.js";
import { replayGameFromUcis } from "@/lib/pvp-chess";

export function pvpGameStatsFromUcis(ucis: string[]): {
  totalMoves: number;
  captures: number;
  checks: number;
} {
  const g = replayGameFromUcis(ucis);
  const hist = g.history({ verbose: true });
  let captures = 0;
  let checks = 0;
  for (const m of hist) {
    if (m.captured) captures += 1;
    if (m.san.includes("+") || m.san.includes("#")) checks += 1;
  }
  return { totalMoves: hist.length, captures, checks };
}

export function formatDurationSec(sec: number | undefined): string | undefined {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return undefined;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
