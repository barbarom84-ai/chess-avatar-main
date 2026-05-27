import { NextRequest, NextResponse } from "next/server";
import {
  mapDbCampaignPuzzle,
  mapDbChampionCard,
  requireAscensionPremium,
} from "@/lib/ascension/server-auth";
import { dedupeCampaignPuzzlesByLevel, computeStandardPuzzleLocked } from "@/lib/ascension/campaign-puzzle-utils";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAscensionPremium(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const cardRes = await auth.ctx.admin
    .from("player_champion_cards")
    .select("elo")
    .eq("user_id", auth.ctx.user.id)
    .maybeSingle();

  const playerElo = Number(cardRes.data?.elo ?? 0);

  const { data: puzzles, error } = await auth.ctx.admin
    .from("campaign_puzzles")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const completions = await auth.ctx.admin
    .from("player_puzzle_completions")
    .select("puzzle_id, completed_at, attempts")
    .eq("user_id", auth.ctx.user.id);

  const completionMap = new Map(
    (completions.data ?? []).map((c) => [String(c.puzzle_id), c])
  );

  const withCompletion = dedupeCampaignPuzzlesByLevel(
    (puzzles ?? []).map((p) => mapDbCampaignPuzzle(p as Record<string, unknown>))
  ).map((puzzle) => {
    const completion = completionMap.get(puzzle.id);
    return {
      ...puzzle,
      completed: !!completion,
      attempts: completion?.attempts ?? 0,
    };
  });

  const standardLocked = computeStandardPuzzleLocked(withCompletion);

  const mapped = withCompletion.map((puzzle) => ({
    ...puzzle,
    locked: puzzle.kind === "standard" ? (standardLocked.get(puzzle.id) ?? false) : false,
  }));

  return NextResponse.json({
    puzzles: mapped,
    playerElo,
  });
}
