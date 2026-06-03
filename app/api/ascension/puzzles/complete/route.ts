import { NextRequest, NextResponse } from "next/server";
import { FantasyChessEngine } from "@/lib/ascension/fantasy-chess/engine";
import type {
  PieceAbilityId,
  FantasyObjective,
  SquareEffect,
} from "@/lib/ascension/fantasy-chess/types";
import { computePuzzleRewards, ELO_CAP } from "@/lib/ascension/progression";
import { playerFantasyAbilities } from "@/lib/ascension/skill-tree";
import type { ChampionCardCustomization } from "@/lib/ascension/types";
import {
  mapDbCampaignPuzzle,
  mapDbChampionCard,
  requireAscensionPremium,
} from "@/lib/ascension/server-auth";
import {
  computeStandardPuzzleLocked,
  computeFantasyTrackLocked,
  dedupeCampaignPuzzlesByLevel,
  isMainCampaignComplete,
} from "@/lib/ascension/campaign-puzzle-utils";

const FANTASY_TRACK_ELO_GATE = 3000;
import {
  extractPlayerMoves,
  getSolverColor,
  validatePlayerSolution,
} from "@/lib/ascension/puzzle-sequence";
import { getSideToMoveFromFen } from "@/lib/ascension/fen-utils";

export const runtime = "nodejs";

function validateFantasyPlayerSolution(
  fen: string,
  rules: {
    enabledAbilities: PieceAbilityId[];
    objective?: FantasyObjective;
    objectiveSquare?: string;
    objectivePiece?: string;
    specialSquares?: SquareEffect[];
  },
  solutionUcis: string[],
  playerMoves: string[]
): boolean {
  const normalizedSolution = solutionUcis.map((m) => m.trim().toLowerCase());
  const normalizedPlayer = playerMoves.map((m) => m.trim().toLowerCase());
  const solverColor = getSolverColor(fen);

  const expectedIndices: number[] = [];
  const engine = new FantasyChessEngine(fen, {
    enabledAbilities: rules.enabledAbilities,
    objective: rules.objective,
    objectiveSquare: rules.objectiveSquare,
    objectivePiece: rules.objectivePiece,
    specialSquares: rules.specialSquares,
    fantasySide: solverColor,
  });

  for (let i = 0; i < normalizedSolution.length; i++) {
    if (getSideToMoveFromFen(engine.fen) === solverColor) {
      expectedIndices.push(i);
    }
    if (!engine.applyMove(normalizedSolution[i]!)) return false;
  }

  const expectedPlayer = expectedIndices.map((i) => normalizedSolution[i]!);
  if (normalizedPlayer.length !== expectedPlayer.length) return false;
  return normalizedPlayer.every((m, i) => m === expectedPlayer[i]);
}

export async function POST(request: NextRequest) {
  const auth = await requireAscensionPremium(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { puzzleId?: string; moves?: string[]; timeMs?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.puzzleId || !Array.isArray(body.moves)) {
    return NextResponse.json({ error: "Missing puzzleId or moves" }, { status: 400 });
  }

  const puzzleRes = await auth.ctx.admin
    .from("campaign_puzzles")
    .select("*")
    .eq("id", body.puzzleId)
    .eq("is_published", true)
    .maybeSingle();

  if (puzzleRes.error || !puzzleRes.data) {
    return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
  }

  const puzzle = mapDbCampaignPuzzle(puzzleRes.data as Record<string, unknown>);

  const cardRes = await auth.ctx.admin
    .from("player_champion_cards")
    .select("*")
    .eq("user_id", auth.ctx.user.id)
    .maybeSingle();

  if (!cardRes.data) {
    return NextResponse.json({ error: "Champion card not initialized" }, { status: 404 });
  }

  const card = mapDbChampionCard(cardRes.data as Record<string, unknown>);

  const skillsRes = await auth.ctx.admin
    .from("player_skill_allocations")
    .select("skill_id")
    .eq("user_id", auth.ctx.user.id);
  const unlockedSkills = (skillsRes.data ?? []).map((r) => String(r.skill_id));
  const playerAbilities = playerFantasyAbilities(unlockedSkills);

  // Main-track bonus fantasy puzzles require unlocked powers from the skill tree.
  if (puzzle.kind === "fantasy" && puzzle.track === "main") {
    const required = (puzzle.fantasy_rules.enabledAbilities ?? []) as PieceAbilityId[];
    const missing = required.filter((a) => !playerAbilities.includes(a));
    if (missing.length > 0) {
      return NextResponse.json({ error: "Required fantasy power not unlocked" }, { status: 403 });
    }
  }

  // Sequential unlock check (per track) so a locked puzzle cannot be force-completed.
  if (puzzle.kind === "standard" || puzzle.track === "fantasy") {
    const allPuzzlesRes = await auth.ctx.admin
      .from("campaign_puzzles")
      .select("*")
      .eq("is_published", true)
      .order("sort_order", { ascending: true });

    const completionsRes = await auth.ctx.admin
      .from("player_puzzle_completions")
      .select("puzzle_id")
      .eq("user_id", auth.ctx.user.id);

    const completedIds = new Set((completionsRes.data ?? []).map((c) => String(c.puzzle_id)));
    const withCompletion = dedupeCampaignPuzzlesByLevel(
      (allPuzzlesRes.data ?? []).map((p) => mapDbCampaignPuzzle(p as Record<string, unknown>))
    ).map((p) => ({
      ...p,
      completed: completedIds.has(p.id),
    }));

    let locked = false;
    if (puzzle.track === "fantasy") {
      const trackUnlocked =
        card.elo >= FANTASY_TRACK_ELO_GATE || isMainCampaignComplete(withCompletion);
      locked = computeFantasyTrackLocked(withCompletion, trackUnlocked).get(puzzle.id) ?? true;
    } else {
      locked = computeStandardPuzzleLocked(withCompletion).get(puzzle.id) ?? false;
    }

    if (locked) {
      return NextResponse.json({ error: "Puzzle locked" }, { status: 403 });
    }
  }

  const submitted = body.moves.map((m) => m.trim().toLowerCase());
  const solution = puzzle.solution_ucis.map((m) => m.trim().toLowerCase());

  let solved = false;
  if (puzzle.kind === "fantasy") {
    const fr = puzzle.fantasy_rules;
    const rules = {
      enabledAbilities: (fr.enabledAbilities ?? []) as PieceAbilityId[],
      objective: fr.objective as FantasyObjective | undefined,
      objectiveSquare: fr.objectiveSquare as string | undefined,
      objectivePiece: fr.objectivePiece as string | undefined,
      specialSquares: fr.specialSquares as SquareEffect[] | undefined,
    };
    solved = validateFantasyPlayerSolution(puzzle.fen, rules, solution, submitted);
  } else {
    solved = validatePlayerSolution(puzzle.fen, solution, submitted);
  }

  const existing = await auth.ctx.admin
    .from("player_puzzle_completions")
    .select("*")
    .eq("user_id", auth.ctx.user.id)
    .eq("puzzle_id", puzzle.id)
    .maybeSingle();

  const isFirstCompletion = !existing.data;

  if (!solved) {
    if (existing.data) {
      await auth.ctx.admin
        .from("player_puzzle_completions")
        .update({ attempts: Number(existing.data.attempts ?? 0) + 1 })
        .eq("id", existing.data.id);
    } else {
      await auth.ctx.admin.from("player_puzzle_completions").insert({
        user_id: auth.ctx.user.id,
        puzzle_id: puzzle.id,
        attempts: 1,
      });
    }
    return NextResponse.json({ solved: false });
  }

  // Count total completed puzzles (after this one) to compute the new tier milestone.
  const { count: existingCount } = await auth.ctx.admin
    .from("player_puzzle_completions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", auth.ctx.user.id);

  const completedPuzzleCount = (existingCount ?? 0) + (isFirstCompletion ? 1 : 0);

  const rewards = computePuzzleRewards(card.elo, card.xp, {
    kind: puzzle.kind,
    xpReward: puzzle.xp_reward,
    eloReward: puzzle.elo_reward,
    isFirstCompletion,
    completedPuzzleCount,
  });

  const customization = (card.customization ?? {}) as ChampionCardCustomization;
  let achievement: "elo_cap_3000" | undefined;
  const achievements = { ...(customization.achievements ?? {}) };
  if (
    card.elo < ELO_CAP &&
    rewards.newElo >= ELO_CAP &&
    !achievements.elo_cap_3000
  ) {
    achievements.elo_cap_3000 = new Date().toISOString();
    achievement = "elo_cap_3000";
  }

  const cardUpdatePayload: Record<string, unknown> = {
    elo: rewards.newElo,
    xp: rewards.newXp,
    tier: rewards.newTier,
  };
  if (achievement) {
    cardUpdatePayload.customization = { ...customization, achievements };
  }

  const cardUpdate = await auth.ctx.admin
    .from("player_champion_cards")
    .update(cardUpdatePayload)
    .eq("user_id", auth.ctx.user.id)
    .select("*")
    .single();

  if (existing.data) {
    await auth.ctx.admin
      .from("player_puzzle_completions")
      .update({
        attempts: Number(existing.data.attempts ?? 0) + 1,
        best_time_ms:
          body.timeMs != null
            ? Math.min(Number(existing.data.best_time_ms ?? body.timeMs), body.timeMs)
            : existing.data.best_time_ms,
      })
      .eq("id", existing.data.id);
  } else {
    await auth.ctx.admin.from("player_puzzle_completions").insert({
      user_id: auth.ctx.user.id,
      puzzle_id: puzzle.id,
      attempts: 1,
      best_time_ms: body.timeMs ?? null,
    });
  }

  return NextResponse.json({
    solved: true,
    rewards,
    achievement,
    card: cardUpdate.data ? mapDbChampionCard(cardUpdate.data as Record<string, unknown>) : null,
  });
}
