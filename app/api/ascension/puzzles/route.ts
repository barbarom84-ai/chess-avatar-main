import { NextRequest, NextResponse } from "next/server";
import {
  mapDbCampaignPuzzle,
  requireAscensionAuth,
} from "@/lib/ascension/server-auth";
import {
  dedupeCampaignPuzzlesByLevel,
  isMainCampaignComplete,
} from "@/lib/ascension/campaign-puzzle-utils";
import {
  ASCENSION_FREE_PUZZLES_PER_TRACK,
  ASCENSION_PREMIUM_PUZZLES_PER_TRACK,
} from "@/lib/ascension/constants";
import {
  computeMainStandardLocked,
  computeTrackSequentialLocked,
  isPuzzleWithinPlanLimit,
  isTrackUnlocked,
  mapDbCampaignTrack,
} from "@/lib/ascension/campaign-tracks";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAscensionAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const cardRes = await auth.ctx.admin
    .from("player_champion_cards")
    .select("elo")
    .eq("user_id", auth.ctx.user.id)
    .maybeSingle();

  const playerElo = Number(cardRes.data?.elo ?? 0);

  const [tracksRes, puzzlesRes] = await Promise.all([
    auth.ctx.admin.from("campaign_tracks").select("*").order("sort_order", { ascending: true }),
    auth.ctx.admin
      .from("campaign_puzzles")
      .select("*")
      .eq("is_published", true)
      .order("sort_order", { ascending: true }),
  ]);

  if (tracksRes.error) {
    return NextResponse.json({ error: tracksRes.error.message }, { status: 500 });
  }
  if (puzzlesRes.error) {
    return NextResponse.json({ error: puzzlesRes.error.message }, { status: 500 });
  }

  const tracks = (tracksRes.data ?? []).map((row) =>
    mapDbCampaignTrack(row as Record<string, unknown>)
  );

  const completions = await auth.ctx.admin
    .from("player_puzzle_completions")
    .select("puzzle_id, completed_at, attempts")
    .eq("user_id", auth.ctx.user.id);

  const completionMap = new Map(
    (completions.data ?? []).map((c) => [String(c.puzzle_id), c])
  );

  const withCompletion = dedupeCampaignPuzzlesByLevel(
    (puzzlesRes.data ?? []).map((p) => mapDbCampaignPuzzle(p as Record<string, unknown>))
  ).map((puzzle) => {
    const completion = completionMap.get(puzzle.id);
    return {
      ...puzzle,
      completed: !!completion,
      attempts: completion?.attempts ?? 0,
    };
  });

  const mainCampaignComplete = isMainCampaignComplete(withCompletion);
  const trackUnlock: Record<string, boolean> = {};
  for (const track of tracks) {
    trackUnlock[track.slug] = isTrackUnlocked(track, playerElo, withCompletion);
  }

  const mainStandardLocked = computeMainStandardLocked(withCompletion);
  const sequentialLocks = new Map<string, Map<string, boolean>>();
  for (const track of tracks) {
    sequentialLocks.set(
      track.slug,
      computeTrackSequentialLocked(
        track.slug,
        withCompletion,
        trackUnlock[track.slug] ?? true
      )
    );
  }

  const mapped = withCompletion.map((puzzle) => {
    let locked = false;
    let premiumLocked = false;

    if (!isPuzzleWithinPlanLimit(puzzle.sort_order, auth.ctx.isPremium)) {
      premiumLocked = true;
      locked = true;
    } else {
      const track = tracks.find((t) => t.slug === puzzle.track);
      if (puzzle.track === "main" && puzzle.kind === "standard") {
        locked = mainStandardLocked.get(puzzle.id) ?? false;
      } else if (track?.layout === "main" && puzzle.track === "main") {
        locked = false;
      } else if (track?.layout === "sequential" || puzzle.track === "fantasy") {
        locked = sequentialLocks.get(puzzle.track)?.get(puzzle.id) ?? true;
      }
      if (!trackUnlock[puzzle.track]) {
        locked = true;
      }
    }

    return { ...puzzle, locked, premiumLocked };
  });

  return NextResponse.json({
    puzzles: mapped,
    tracks,
    playerElo,
    isPremium: auth.ctx.isPremium,
    trackUnlock,
    mainCampaignComplete,
    fantasyTrackUnlocked: trackUnlock.fantasy ?? false,
    premiumPuzzlesPerTrack: ASCENSION_PREMIUM_PUZZLES_PER_TRACK,
    freePuzzlesPerTrack: ASCENSION_FREE_PUZZLES_PER_TRACK,
  });
}
