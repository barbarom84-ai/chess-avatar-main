import { NextRequest, NextResponse } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import { buildPublicAccountProfile } from "@/lib/account-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const viewer = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!viewer) return jsonError("Unauthorized", 401);

  const { userId } = await context.params;
  if (!userId || userId.length < 8) return jsonError("Invalid user id", 400);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  try {
    const profile = await buildPublicAccountProfile(sb, sb, userId);
    if (!profile) return jsonError("Profile not found", 404);
    return NextResponse.json({ profile });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Profile load failed", 500);
  }
}
