"use client";

import { useStockfish } from "@/hooks/useStockfish";

/** Shared Stockfish / ChessAvatar handle for the whole Arena page (one worker). */
export type ArenaEngine = ReturnType<typeof useStockfish>;

export function useArenaEngine(): ArenaEngine {
  return useStockfish();
}
