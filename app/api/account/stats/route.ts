import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import { buildAccountStats, parseTzOffset } from "@/lib/account-stats-server";

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

  try {
    const tz = parseTzOffset(request.nextUrl.searchParams.get("tz"));
    const stats = await buildAccountStats(sb, user.id, tz);
    return NextResponse.json({ stats }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Stats load failed", 500);
  }
}
