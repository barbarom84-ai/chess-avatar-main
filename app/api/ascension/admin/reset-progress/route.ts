import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { isSuperUserServer } from "@/lib/is-super-user-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const user = await getAuthedUserFromRequest(request, supabaseUrl, anonKey);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!(await isSuperUserServer(admin, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { userId?: string };
  try {
    body = (await request.json()) as { userId?: string };
  } catch {
    body = {};
  }

  const targetUserId = typeof body.userId === "string" && body.userId.trim() ? body.userId.trim() : user.id;

  const delCompletions = await admin
    .from("player_puzzle_completions")
    .delete()
    .eq("user_id", targetUserId);
  if (delCompletions.error) {
    return NextResponse.json({ error: delCompletions.error.message }, { status: 500 });
  }

  const delSkills = await admin.from("player_skill_allocations").delete().eq("user_id", targetUserId);
  if (delSkills.error) {
    return NextResponse.json({ error: delSkills.error.message }, { status: 500 });
  }

  const cardUpdate = await admin
    .from("player_champion_cards")
    .update({ elo: 0, xp: 0, tier: "stone" })
    .eq("user_id", targetUserId)
    .select("*")
    .maybeSingle();

  if (cardUpdate.error) {
    return NextResponse.json({ error: cardUpdate.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    userId: targetUserId,
    card: cardUpdate.data,
  });
}
