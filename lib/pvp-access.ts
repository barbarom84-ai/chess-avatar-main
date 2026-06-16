/** Whether an authenticated non-participant may view a game as spectator. */
export function canAccessPvpGameAsSpectator(
  status: string,
  isParticipant: boolean,
  canJoin: boolean
): boolean {
  return (
    !isParticipant &&
    !canJoin &&
    (status === "playing" || status === "finished")
  );
}

/** Which color the rematch initiator should play (true = White host / standard join flow). */
export function pvpRematchWantWhite(wasWhite: boolean, swapColors: boolean): boolean {
  return swapColors ? !wasWhite : wasWhite;
}
