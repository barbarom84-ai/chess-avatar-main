import type { EngineConfig } from "@/lib/analysis";
import type { ArenaOutcome } from "@/lib/arena-chess";
import { replayUci } from "@/lib/arena-chess";
import { buildArenaPgn, countArenaCapturesChecks } from "@/lib/arena-pgn";
import { saveGameToCloud } from "@/lib/supabase-storage";

/** Résultat PGN/cloud aligné sur le vainqueur du duel Playoff (ex. nulle → noirs). */
export function playoffOutcomeForSave(
  winnerKey: string,
  whiteKey: string,
  blackKey: string,
  note: string,
  base: ArenaOutcome
): ArenaOutcome {
  if (winnerKey === whiteKey) {
    return {
      ...base,
      result: "win",
      winner: "white",
      pgnResult: "1-0",
      resultMessage: note,
      resultType: `arena_playoff_${base.resultType}`,
    };
  }
  if (winnerKey === blackKey) {
    return {
      ...base,
      result: "loss",
      winner: "black",
      pgnResult: "0-1",
      resultMessage: note,
      resultType: `arena_playoff_${base.resultType}`,
    };
  }
  return { ...base, resultMessage: note, resultType: `arena_playoff_${base.resultType}` };
}

export async function saveArenaMatchToCloud(params: {
  whiteConfig: EngineConfig;
  blackConfig: EngineConfig;
  uciHist: string[];
  outcome: ArenaOutcome;
  durationSeconds?: number;
  event?: string;
  round?: string;
}): Promise<void> {
  const {
    whiteConfig,
    blackConfig,
    uciHist,
    outcome,
    durationSeconds,
    event,
    round,
  } = params;

  const game = replayUci(uciHist);
  const whiteName = whiteConfig.name || "White";
  const blackName = blackConfig.name || "Black";
  const pgn = buildArenaPgn({
    whiteName,
    blackName,
    outcome,
    uciMoves: uciHist,
    event,
    round,
  });
  const { captures, checks } = countArenaCapturesChecks(game);

  await saveGameToCloud({
    opponentName: `${whiteName} vs ${blackName}`,
    opponentPlatform: "arena",
    result: outcome.result,
    resultType: outcome.resultType,
    resultMessage: outcome.resultMessage,
    playerColor: "white",
    pgn,
    finalFen: game.fen(),
    movesCount: uciHist.length,
    durationSeconds,
    capturesCount: captures,
    checksCount: checks,
    botConfig: blackConfig,
    gameKind: "arena_bot_vs_bot",
    arenaConfigs: { white: whiteConfig, black: blackConfig },
  });
}
