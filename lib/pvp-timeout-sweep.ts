import type { SupabaseClient } from "@supabase/supabase-js";
import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";
import { replayGameFromUcis } from "@/lib/pvp-chess";
import { checkTimeoutForTimedGame } from "@/lib/pvp-clock-server";

export type PvpTimeoutSweepResult = {
  checked: number;
  timedOut: number;
  errors: number;
};

/** Applique les timeouts manqués sur les parties en cours (sans client actif). */
export async function sweepPvpTimeouts(
  sb: SupabaseClient,
  options?: { nowMs?: number; limit?: number }
): Promise<PvpTimeoutSweepResult> {
  const nowMs = options?.nowMs ?? Date.now();
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500);

  const { data: rows, error } = await sb
    .from("pvp_games")
    .select("id")
    .eq("status", "playing")
    .not("black_user_id", "is", null)
    .in("clock_mode", ["timed", "correspondence"])
    .not("clock_turn_started_at", "is", null)
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error || !rows?.length) {
    return { checked: 0, timedOut: 0, errors: error ? 1 : 0 };
  }

  let timedOut = 0;
  let errors = 0;

  for (const { id } of rows) {
    try {
      const { data: game, error: gErr } = await sb
        .from("pvp_games")
        .select("*")
        .eq("id", id)
        .eq("status", "playing")
        .maybeSingle();

      if (gErr || !game) continue;
      const row = game as PvpGameRow;

      const { data: moveRows, error: mErr } = await sb
        .from("pvp_moves")
        .select("uci")
        .eq("game_id", id)
        .order("ply", { ascending: true });

      if (mErr) {
        errors += 1;
        continue;
      }

      const ucis = ((moveRows ?? []) as Pick<PvpMoveRow, "uci">[]).map((m) => m.uci);
      const chess = replayGameFromUcis(ucis);
      const patch = checkTimeoutForTimedGame(row, chess, nowMs);
      if (!patch) continue;

      const { error: upErr } = await sb.from("pvp_games").update(patch).eq("id", id).eq("status", "playing");
      if (upErr) {
        errors += 1;
      } else {
        timedOut += 1;
      }
    } catch {
      errors += 1;
    }
  }

  return { checked: rows.length, timedOut, errors };
}
