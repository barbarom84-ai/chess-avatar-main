import { NextRequest, NextResponse } from "next/server";
import { FantasyChessEngine } from "@/lib/ascension/fantasy-chess/engine";
import type { PieceAbilityId, FantasyObjective } from "@/lib/ascension/fantasy-chess/types";
import { computePuzzleRewards } from "@/lib/ascension/progression";
import {
  mapDbCampaignPuzzle,
  mapDbChampionCard,
  requireAscensionPremium,
} from "@/lib/ascension/server-auth";
import { Chess } from "chess.js";

export const runtime = "nodejs";

function validateStandardSolution(fen: string, solutionUcis: string[]): boolean {
  const chess = new Chess(fen);
  for (const uci of solutionUcis) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    try {
      const move = chess.move({ from, to, promotion: promotion as "q" | "r" | "b" | "n" | undefined });
      if (!move) return false;
    } catch {
      return false;
    }
  }
  return true;
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
  if (card.elo < puzzle.min_elo) {
    return NextResponse.json({ error: "ELO too low for this puzzle" }, { status: 403 });
  }

  const submitted = body.moves.map((m) => m.trim().toLowerCase());
  const solution = puzzle.solution_ucis.map((m) => m.trim().toLowerCase());

  let solved = false;
  if (submitted.length !== solution.length) {
    solved = false;
  } else if (puzzle.kind === "fantasy") {
    const fr = puzzle.fantasy_rules;
    const rules = {
      enabledAbilities: (fr.enabledAbilities ?? []) as PieceAbilityId[],
      objective: fr.objective as FantasyObjective | undefined,
      objectiveSquare: fr.objectiveSquare as string | undefined,
      objectivePiece: fr.objectivePiece as string | undefined,
    };
    const replay = FantasyChessEngine.replaySolution(puzzle.fen, rules, submitted);
    solved = replay.ok && submitted.every((m, i) => m === solution[i]);
  } else {
    solved =
      submitted.every((m, i) => m === solution[i]) &&
      validateStandardSolution(puzzle.fen, submitted);
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

  const rewards = computePuzzleRewards(card.elo, card.xp, {
    kind: puzzle.kind,
    xpReward: puzzle.xp_reward,
    eloReward: puzzle.elo_reward,
    isFirstCompletion,
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
