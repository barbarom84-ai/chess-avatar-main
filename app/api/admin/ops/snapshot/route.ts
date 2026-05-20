import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import { isSuperUserServer } from "@/lib/is-super-user-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 60 });
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

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    playingRes,
    waitingRes,
    games24Res,
    pvpFinished24Res,
    activity24Res,
    subsRes,
    eventBreakdownRes,
  ] = await Promise.all([
    sb.from("pvp_games").select("id", { count: "exact", head: true }).eq("status", "playing"),
    sb
      .from("pvp_games")
      .select("id", { count: "exact", head: true })
      .eq("status", "waiting")
      .is("black_user_id", null)
      .gte("created_at", since24h),
    sb
      .from("games")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
    sb
      .from("pvp_games")
      .select("id", { count: "exact", head: true })
      .eq("status", "finished")
      .gte("updated_at", since24h),
    sb
      .from("activity_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
    sb.from("subscriptions").select("plan, status").eq("status", "active"),
    sb
      .from("activity_events")
      .select("event_name")
      .gte("created_at", since24h)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const subsByPlan: Record<string, number> = {};
  for (const row of subsRes.data ?? []) {
    const plan = row.plan ?? "unknown";
    subsByPlan[plan] = (subsByPlan[plan] ?? 0) + 1;
  }

  const eventCounts: Record<string, number> = {};
  for (const row of eventBreakdownRes.data ?? []) {
    const name = row.event_name ?? "unknown";
    eventCounts[name] = (eventCounts[name] ?? 0) + 1;
  }

  const sentryConfigured = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
  const posthogConfigured = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

  return NextResponse.json({
    pvpPlaying: playingRes.count ?? 0,
    pvpWaiting: waitingRes.count ?? 0,
    gamesBot24h: games24Res.count ?? 0,
    pvpFinished24h: pvpFinished24Res.count ?? 0,
    activityEvents24h: activity24Res.count ?? 0,
    subscriptionsActive: subsByPlan,
    eventCounts24h: eventCounts,
    integrations: { sentry: sentryConfigured, posthog: posthogConfigured },
    generatedAt: new Date().toISOString(),
  });
}
