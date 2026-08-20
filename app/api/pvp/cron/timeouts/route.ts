import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-service";
import { sweepPvpTimeouts } from "@/lib/pvp-timeout-sweep";

function isAuthorizedCron(request: NextRequest): boolean {
  const secret =
    process.env.PVP_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "";
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** Sweep timed PvP games for forfeits (external scheduler or Vercel Pro cron). */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createServiceSupabase();
  if (!sb) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  const result = await sweepPvpTimeouts(sb);
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
