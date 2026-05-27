import { NextRequest, NextResponse } from "next/server";
import { FantasyChessEngine } from "@/lib/ascension/fantasy-chess/engine";
import type { PieceAbilityId, FantasyObjective } from "@/lib/ascension/fantasy-chess/types";
import { computePuzzleRewards } from "@/lib/ascension/progression";
import {
  mapDbCampaignPuzzle,
  mapDbChampionCard,
  requireAscensionPremium,
} from "@/lib/ascension/server-auth";
import {
  computeStandardPuzzleLocked,
  dedupeCampaignPuzzlesByLevel,
} from "@/lib/ascension/campaign-puzzle-utils";
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

  // Sequential unlock check for standard puzzles
  if (puzzle.kind === "standard") {
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

    const lockedMap = computeStandardPuzzleLocked(withCompletion);
    if (lockedMap.get(puzzle.id)) {
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

  const cardUpdate = await auth.ctx.admin
    .from("player_champion_cards")
    .update({
      elo: rewards.newElo,
      xp: rewards.newXp,
      tier: rewards.newTier,
    })
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
    card: cardUpdate.data ? mapDbChampionCard(cardUpdate.data as Record<string, unknown>) : null,
  });
}
