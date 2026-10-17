/** Map campaign puzzle ELO band to a player-facing difficulty tier. */
export type PuzzleDifficulty = "easy" | "medium" | "hard";

export function puzzleDifficultyFromElo(minElo: number, maxElo: number): PuzzleDifficulty {
  const mid = (Math.max(0, minElo) + Math.max(minElo, maxElo)) / 2;
  if (mid < 900) return "easy";
  if (mid < 1600) return "medium";
  return "hard";
}
