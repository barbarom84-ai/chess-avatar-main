/** Live games: each side's clock starts with its own first move, so plies 1 and 2 cost no time. */
export const PVP_CLOCK_START_PLIES = 2;
/** Live games: a side that hasn't played its first move after this long aborts the game. */
export const PVP_FIRST_MOVE_ABORT_MS = 30_000;
/** Most network delay refunded on a move when the client reports its own thinking time. */
export const PVP_LAG_COMPENSATION_MAX_MS = 1_000;
