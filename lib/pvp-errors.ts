/** Message utilisateur à partir d'une erreur API PvP. */
export function mapPvpErrorMessage(raw: string, t: Record<string, string>): string {
  const key = raw.trim();
  const map: Record<string, string> = {
    Unauthorized: t.unauthorized ?? raw,
    Forbidden: t.forbidden ?? raw,
    "Not your turn": t.notYourTurn ?? raw,
    "Game is not active": t.gameNotActive ?? raw,
    "Game not started": t.gameNotStarted ?? raw,
    "Game not found": t.gameNotFound ?? raw,
    "Move in progress": t.moveInProgress ?? raw,
    "Move already submitted": t.moveAlreadySubmitted ?? raw,
    "Time expired": t.timeExpired ?? raw,
    "Time forfeiture": t.timeExpired ?? raw,
    "Illegal move": t.illegalMove ?? raw,
    "Invalid UCI": t.illegalMove ?? raw,
    "Too many requests": t.rateLimited ?? raw,
    "Too fast": t.rateLimited ?? raw,
    "Game over (time)": t.gameOver ?? raw,
    "Takeback not allowed in this position": t.takebackNotAllowed ?? raw,
    "No moves to take back": t.noMovesToTakeback ?? raw,
    "Network request failed": t.networkError ?? raw,
    "Server misconfigured": t.serverError ?? raw,
    "Cannot join this game": t.cannotJoin ?? raw,
    "Only open waiting lobbies can be cancelled": t.lobbyCancelFailed ?? raw,
    "Invalid action": t.invalidAction ?? raw,
    "No offer to cancel": t.noOfferToCancel ?? raw,
    "No opponent offer to decline": t.noOfferToDecline ?? raw,
    "No draw offer to accept": t.noDrawToAccept ?? raw,
    "Draw offer limit reached": t.drawOfferLimitReached ?? raw,
    "No takeback offer to accept": t.noTakebackToAccept ?? raw,
    "Game is not finished": t.gameNotFinished ?? raw,
    "Invalid or unsupported time control for matchmaking": t.matchmakingUnsupported ?? raw,
    "Unsupported time control": t.matchmakingUnsupported ?? raw,
    "Supabase client unavailable": t.networkError ?? raw,
    "Rematch failed": t.rematchFailed ?? raw,
    "No game": t.gameNotFound ?? raw,
    "Update failed": t.updateFailed ?? raw,
    "Insert failed": t.updateFailed ?? raw,
    "Join failed": t.joinFailed ?? raw,
    "Failed to create game": t.createFailed ?? raw,
    "Delete failed": t.updateFailed ?? raw,
    "Chat closed for this game": t.chatClosed ?? raw,
    "Invalid message": t.chatInvalid ?? raw,
  };
  return map[key] ?? (key.length > 0 && key.length < 120 ? key : t.generic ?? raw);
}

export function pvpErrorFromUnknown(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}
