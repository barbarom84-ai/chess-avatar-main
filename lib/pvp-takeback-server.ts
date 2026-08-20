import type { SupabaseClient } from "@supabase/supabase-js";
import type { PvpGameRow, PvpMoveRow } from "@/lib/pvp-chess";
import { replayGameFromUcis } from "@/lib/pvp-chess";

export type TakebackResult = {
  ok: true;
  removedPly: number;
  game: Partial<PvpGameRow>;
};

/** Supprime le dernier coup et remet la partie en état « en cours ». */
export async function undoLastPvpMove(
  sb: SupabaseClient,
  gameId: string,
  row: PvpGameRow
): Promise<TakebackResult | { ok: false; error: string }> {
  const { data: lastMove, error: loadErr } = await sb
    .from("pvp_moves")
    .select("id, ply, uci")
    .eq("game_id", gameId)
    .order("ply", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (loadErr) return { ok: false, error: loadErr.message ?? "Load failed" };
  if (!lastMove) return { ok: false, error: "No moves to undo" };

  const ply = (lastMove as Pick<PvpMoveRow, "ply">).ply;

  const { data: allMoves, error: allErr } = await sb
    .from("pvp_moves")
    .select("uci")
    .eq("game_id", gameId)
    .lt("ply", ply)
    .order("ply", { ascending: true });

  if (allErr) return { ok: false, error: allErr.message ?? "Load failed" };

  const ucis = ((allMoves ?? []) as Pick<PvpMoveRow, "uci">[]).map((m) => m.uci);
  replayGameFromUcis(ucis);

  const { error: delErr } = await sb
    .from("pvp_moves")
    .delete()
    .eq("game_id", gameId)
    .eq("ply", ply);

  if (delErr) return { ok: false, error: delErr.message ?? "Delete failed" };

  const patch: Partial<PvpGameRow> & Record<string, unknown> = {
    status: "playing",
    result: null,
    result_reason: null,
    takeback_offered_by: null,
    draw_offered_by: null,
    clock_turn_started_at: new Date().toISOString(),
  };

  const { error: upErr } = await sb.from("pvp_games").update(patch).eq("id", gameId);
  if (upErr) return { ok: false, error: upErr.message ?? "Update failed" };

  return {
    ok: true,
    removedPly: ply,
    game: patch,
  };
}
