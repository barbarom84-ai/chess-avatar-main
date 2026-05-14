import { NextRequest, NextResponse } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import {
  applyAccountProfilePatch,
  buildOwnAccountProfile,
  normalizeProfilePatch,
} from "@/lib/account-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  try {
    const profile = await buildOwnAccountProfile(sb, sb, user);
    return NextResponse.json({ profile });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Profile load failed", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  try {
    await applyAccountProfilePatch(sb, user, normalizeProfilePatch(body));
    const profile = await buildOwnAccountProfile(sb, sb, user);
    return NextResponse.json({ profile });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Profile update failed", 500);
  }
}
