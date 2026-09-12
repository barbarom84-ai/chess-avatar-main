/**
 * Post-game display Elo estimated from CAPS-style accuracy.
 * A single-game "performance rating" vs a 2700+ bot (opp ± 200) is meaningless
 * and contradicts a mid-70% accuracy score.
 */

export const GAME_ELO_MIN = 400;
export const GAME_ELO_MAX = 3000;

/** Accuracy % → typical online rating (Lichess / Chess.com ballpark). */
const ACCURACY_ELO_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [40, 400],
  [50, 700],
  [60, 1000],
  [70, 1350],
  [75, 1550],
  [80, 1750],
  [85, 2000],
  [90, 2250],
  [93, 2450],
  [96, 2650],
  [98, 2800],
  [100, 3000],
];

export function clampGameElo(elo: number): number {
  return Math.min(GAME_ELO_MAX, Math.max(GAME_ELO_MIN, Math.round(elo)));
}

/** Interpolate a rating from this side's accuracy in the game (0–100). */
export function estimatedEloFromAccuracy(accuracyPercent: number): number {
  if (!Number.isFinite(accuracyPercent)) return GAME_ELO_MIN;
  const acc = Math.min(100, Math.max(0, accuracyPercent));
  if (acc <= ACCURACY_ELO_ANCHORS[0][0]) return ACCURACY_ELO_ANCHORS[0][1];
  const last = ACCURACY_ELO_ANCHORS[ACCURACY_ELO_ANCHORS.length - 1];
  if (acc >= last[0]) return last[1];

  for (let i = 1; i < ACCURACY_ELO_ANCHORS.length; i++) {
    const [a1, e1] = ACCURACY_ELO_ANCHORS[i - 1];
    const [a2, e2] = ACCURACY_ELO_ANCHORS[i];
    if (acc <= a2) {
      const t = (acc - a1) / (a2 - a1);
      return clampGameElo(e1 + t * (e2 - e1));
    }
  }
  return last[1];
}

export type GameWinner = "white" | "black" | "draw";

const RESULT_NUDGE = 50;

/**
 * Elo for both sides from this game's accuracies (same curve).
 * Winner / loser get a small ±50 nudge so the result is visible without
 * dragging a 72% game up to GM numbers.
 */
export function estimatedGameElos(args: {
  accuracyWhite: number | null | undefined;
  accuracyBlack: number | null | undefined;
  winner: GameWinner;
}): { eloWhite: number | null; eloBlack: number | null } {
  const eloWhite =
    args.accuracyWhite == null || !Number.isFinite(args.accuracyWhite)
      ? null
      : clampGameElo(
          estimatedEloFromAccuracy(args.accuracyWhite) +
            (args.winner === "white"
              ? RESULT_NUDGE
              : args.winner === "black"
                ? -RESULT_NUDGE
                : 0)
        );
  const eloBlack =
    args.accuracyBlack == null || !Number.isFinite(args.accuracyBlack)
      ? null
      : clampGameElo(
          estimatedEloFromAccuracy(args.accuracyBlack) +
            (args.winner === "black"
              ? RESULT_NUDGE
              : args.winner === "white"
                ? -RESULT_NUDGE
                : 0)
        );
  return { eloWhite, eloBlack };
}

export function winnerFromPlayerResult(
  playerColor: "white" | "black",
  result: "win" | "loss" | "draw"
): GameWinner {
  if (result === "draw") return "draw";
  if (result === "win") return playerColor;
  return playerColor === "white" ? "black" : "white";
}
