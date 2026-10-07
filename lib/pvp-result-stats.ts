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
  return { totalMoves: fullMoveCount(hist.length), captures, checks };
}

/** Moves as players count them: 1.e4 e5 is one move, 1.e4 alone too. */
export function fullMoveCount(plies: number): number {
  return Math.ceil(Math.max(0, plies) / 2);
}

export function formatDurationSec(sec: number | undefined): string | undefined {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return undefined;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
