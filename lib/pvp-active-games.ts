/** True when it is the given side's turn from the number of moves played (max ply). */
export function pvpActiveGameIsMyTurn(
  role: "white" | "black",
  moveCount: number
): boolean {
  return role === "white" ? moveCount % 2 === 0 : moveCount % 2 === 1;
}
