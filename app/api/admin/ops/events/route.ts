import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import { isSuperUserServer } from "@/lib/is-super-user-server";
import { fetchAccountSummariesByUserIds } from "@/lib/account-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 120 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  if (!(await isSuperUserServer(sb, user.id))) {
    return jsonError("Forbidden", 403);
  }

  const limit = Math.min(
    100,
    Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? "50"))
  );

  const { data, error } = await sb
    .from("activity_events")
    .select("id, created_at, user_id, event_name, path, props")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return jsonError(error.message ?? "Query failed", 500);

  const events = data ?? [];
  const userIds = [
    ...new Set(
      events
        .map((row) => row.user_id)
        .filter((id): id is string => typeof id === "string" && id.length >= 8)
    ),
  ];
  const summaries = await fetchAccountSummariesByUserIds(sb, userIds);
  const userSummaries: Record<string, { displayName: string; avatarUrl: string | null }> =
    {};
  for (const [id, summary] of summaries) {
    userSummaries[id] = summary;
  }

  return NextResponse.json({ events, userSummaries });
}
