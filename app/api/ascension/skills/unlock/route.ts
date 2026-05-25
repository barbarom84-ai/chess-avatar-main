import { NextRequest, NextResponse } from "next/server";
import { canUnlockSkill, getSkillById } from "@/lib/ascension/skill-tree";
import { spendXp } from "@/lib/ascension/progression";
import {
  mapDbChampionCard,
  requireAscensionPremium,
} from "@/lib/ascension/server-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAscensionPremium(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { skillId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.skillId || !getSkillById(body.skillId)) {
    return NextResponse.json({ error: "Unknown skill" }, { status: 400 });
  }

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

  const unlocked = (skillsRes.data ?? []).map((s) => String(s.skill_id));
  const check = canUnlockSkill(body.skillId, unlocked, card.xp);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason ?? "Cannot unlock" }, { status: 400 });
  }

  const skill = getSkillById(body.skillId)!;
  let newXp = card.xp;
  if (skill.cost > 0) {
    try {
      newXp = spendXp(card.xp, skill.cost);
    } catch {
      return NextResponse.json({ error: "INSUFFICIENT_XP" }, { status: 400 });
    }
  }

  const insertSkill = await auth.ctx.admin.from("player_skill_allocations").insert({
    user_id: auth.ctx.user.id,
    skill_id: body.skillId,
    rank: 1,
  });

  if (insertSkill.error) {
    return NextResponse.json({ error: insertSkill.error.message }, { status: 500 });
  }

  const cardUpdate = await auth.ctx.admin
    .from("player_champion_cards")
    .update({ xp: newXp })
    .eq("user_id", auth.ctx.user.id)
    .select("*")
    .single();

  return NextResponse.json({
    card: cardUpdate.data ? mapDbChampionCard(cardUpdate.data as Record<string, unknown>) : null,
    unlockedSkillId: body.skillId,
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireAscensionPremium(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const skillsRes = await auth.ctx.admin
    .from("player_skill_allocations")
    .select("skill_id, rank, unlocked_at")
    .eq("user_id", auth.ctx.user.id);

  return NextResponse.json({ skills: skillsRes.data ?? [] });
}
