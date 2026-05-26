import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveChampionTier } from "@/lib/ascension/tiers";
import { mapDbChampionCard, requireAscensionPremium } from "@/lib/ascension/server-auth";

export const runtime = "nodejs";

async function ensureChampionCard(admin: SupabaseClient, userId: string) {
  const existing = await admin
    .from("player_champion_cards")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing.data) {
    // Ensure root skill is always present (backfill for pre-existing cards).
    await admin
      .from("player_skill_allocations")
      .upsert({ user_id: userId, skill_id: "root", rank: 1 }, { onConflict: "user_id,skill_id" });
    return mapDbChampionCard(existing.data as Record<string, unknown>);
  }

  const account = await admin
    .from("user_accounts")
    .select("display_name, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  const displayName =
    typeof account.data?.display_name === "string" && account.data.display_name.trim()
      ? account.data.display_name.trim()
      : "Champion";
  const avatarUrl =
    typeof account.data?.avatar_url === "string" ? account.data.avatar_url : null;

  const insert = await admin
    .from("player_champion_cards")
    .insert({
      user_id: userId,
      display_name: displayName,
      avatar_url: avatarUrl,
      tier: resolveChampionTier(0),
    })
    .select("*")
    .single();

  if (insert.error || !insert.data) {
    throw new Error(insert.error?.message ?? "Failed to create champion card");
  }

  await admin.from("player_skill_allocations").upsert(
    { user_id: userId, skill_id: "root", rank: 1 },
    { onConflict: "user_id,skill_id" }
  );

  return mapDbChampionCard(insert.data as Record<string, unknown>);
}

export async function POST(request: NextRequest) {
  const auth = await requireAscensionPremium(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const card = await ensureChampionCard(auth.ctx.admin, auth.ctx.user.id);
    return NextResponse.json({ card });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Init failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAscensionPremium(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const card = await ensureChampionCard(auth.ctx.admin, auth.ctx.user.id);
    return NextResponse.json({ card });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500 }
    );
  }
}
