export type ArenaMoveQuality = "blunder" | "mistake" | "inaccuracy";

export type ArenaKeyMoment = {
  /** 1-based half-move number (the board after this ply shows the move). */
  ply: number;
  side: "w" | "b";
  san: string;
  quality: ArenaMoveQuality;
  /** Evaluation lost by the mover, in pawns (clamped scale). */
  loss: number;
  evalBefore: number;
  evalAfter: number;
};

export type ArenaSideSummary = {
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  /** Average evaluation lost per evaluated move, in pawns. */
  averageLoss: number;
};

export type ArenaGameSummary = {
  sides: { w: ArenaSideSummary; b: ArenaSideSummary };
  /** Worst moves first, at most `maxMoments`. */
  keyMoments: ArenaKeyMoment[];
};

/** Beyond this the position is decided: swings out there are not counted as errors. */
export const ARENA_SUMMARY_EVAL_CAP = 6;
const STARTING_EVAL = 0.2;
const THRESHOLDS: { quality: ArenaMoveQuality; loss: number }[] = [
  { quality: "blunder", loss: 2 },
  { quality: "mistake", loss: 1 },
  { quality: "inaccuracy", loss: 0.5 },
];

function clampEval(value: number): number {
  return Math.max(-ARENA_SUMMARY_EVAL_CAP, Math.min(ARENA_SUMMARY_EVAL_CAP, value));
}

export function classifyMoveLoss(loss: number): ArenaMoveQuality | null {
  for (const t of THRESHOLDS) if (loss >= t.loss) return t.quality;
  return null;
}

/**
 * Per-side error counts and key moments from the White-POV evaluation after
 * each ply (`evals[i]` follows `sans[i]`; `null` = not evaluated, skipped).
 */
export function summarizeArenaGame(
  sans: string[],
  evals: (number | null)[],
  maxMoments = 5
): ArenaGameSummary {
  const totals = {
    w: { blunders: 0, mistakes: 0, inaccuracies: 0, loss: 0, count: 0 },
    b: { blunders: 0, mistakes: 0, inaccuracies: 0, loss: 0, count: 0 },
  };
  const moments: ArenaKeyMoment[] = [];

  let before: number | null = STARTING_EVAL;
  for (let i = 0; i < sans.length; i++) {
    const raw = evals[i];
    const after = typeof raw === "number" && Number.isFinite(raw) ? clampEval(raw) : null;
    const side: "w" | "b" = i % 2 === 0 ? "w" : "b";
    if (before != null && after != null) {
      const loss = Math.max(0, side === "w" ? before - after : after - before);
      const t = totals[side];
      t.loss += loss;
      t.count += 1;
      const quality = classifyMoveLoss(loss);
      if (quality === "blunder") t.blunders += 1;
      else if (quality === "mistake") t.mistakes += 1;
      else if (quality === "inaccuracy") t.inaccuracies += 1;
      if (quality && quality !== "inaccuracy") {
        moments.push({
          ply: i + 1,
          side,
          san: sans[i] ?? "",
          quality,
          loss: Math.round(loss * 10) / 10,
          evalBefore: before,
          evalAfter: after,
        });
      }
    }
    before = after;
  }

  const side = (s: "w" | "b"): ArenaSideSummary => ({
    blunders: totals[s].blunders,
    mistakes: totals[s].mistakes,
    inaccuracies: totals[s].inaccuracies,
    averageLoss:
      totals[s].count > 0 ? Math.round((totals[s].loss / totals[s].count) * 100) / 100 : 0,
  });

  return {
    sides: { w: side("w"), b: side("b") },
    keyMoments: moments
      .sort((a, b) => b.loss - a.loss || a.ply - b.ply)
      .slice(0, maxMoments)
      .sort((a, b) => a.ply - b.ply),
  };
}

/** SVG polyline points for a White-POV eval series (top = White winning). */
export function evalGraphPoints(
  evals: (number | null)[],
  width: number,
  height: number
): { x: number; y: number; ply: number }[] {
  const n = evals.length;
  if (n === 0) return [];
  const step = n > 1 ? width / (n - 1) : 0;
  const points: { x: number; y: number; ply: number }[] = [];
  let last = STARTING_EVAL;
  for (let i = 0; i < n; i++) {
    const raw = evals[i];
    if (typeof raw === "number" && Number.isFinite(raw)) last = clampEval(raw);
    const y = height / 2 - (last / ARENA_SUMMARY_EVAL_CAP) * (height / 2);
    points.push({ x: Math.round(i * step * 10) / 10, y: Math.round(y * 10) / 10, ply: i + 1 });
  }
  return points;
}
