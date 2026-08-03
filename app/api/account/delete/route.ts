import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, ok: false }, { status });
}

/** Best-effort cleanup of user-owned rows before Auth deletion. */
async function scrubUserData(
  sb: NonNullable<ReturnType<typeof createServiceSupabase>>,
  userId: string
) {
  const tables: Array<{ table: string; column: string }> = [
    { table: "subscriptions", column: "user_id" },
    { table: "profiles", column: "user_id" },
    { table: "friendships", column: "user_id" },
    { table: "friendships", column: "friend_id" },
    { table: "friends", column: "user_id" },
    { table: "friends", column: "friend_user_id" },
    { table: "account_profiles", column: "user_id" },
    { table: "user_profiles", column: "user_id" },
    { table: "ascension_progress", column: "user_id" },
    { table: "ascension_user_progress", column: "user_id" },
    { table: "coach_sessions", column: "user_id" },
    { table: "activity_events", column: "user_id" },
  ];

  for (const { table, column } of tables) {
    try {
      await sb.from(table).delete().eq(column, userId);
    } catch {
      /* table may not exist — ignore */
    }
  }
}

/**
 * GDPR / Play account deletion.
 * POST /api/account/delete
 * Authorization: Bearer <supabase access token>
 */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 5 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests", ok: false },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonError("Server misconfigured", 503);
  }

  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user?.id) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  try {
    await scrubUserData(sb, user.id);

    const { error } = await sb.auth.admin.deleteUser(user.id);
    if (error) {
      console.error("account delete failed:", error.message);
      return jsonError(error.message || "DELETE_FAILED", 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("account delete error:", error);
    return jsonError(
      error instanceof Error ? error.message : "DELETE_FAILED",
      500
    );
  }
}
