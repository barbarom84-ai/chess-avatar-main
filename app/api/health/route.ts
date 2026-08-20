import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "degraded" | "error";

export async function GET() {
  const checks: Record<string, CheckStatus> = {
    supabase_env: "ok",
    supabase_db: "ok",
    stripe_env: "ok",
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon) checks.supabase_env = "error";
  if (!service) checks.supabase_env = "degraded";

  const sb = createServiceSupabase();
  if (!sb) {
    checks.supabase_db = checks.supabase_env === "error" ? "error" : "degraded";
  } else {
    const { error } = await sb.from("profiles").select("id").limit(1);
    if (error) checks.supabase_db = "error";
  }

  if (!process.env.STRIPE_SECRET_KEY) checks.stripe_env = "degraded";

  const values = Object.values(checks);
  const status: CheckStatus = values.includes("error")
    ? "error"
    : values.includes("degraded")
      ? "degraded"
      : "ok";

  const httpStatus = status === "error" ? 503 : 200;

  return NextResponse.json(
    {
      status,
      checks,
      build:
        process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
        process.env.NEXT_PUBLIC_BUILD_ID ??
        "dev",
      timestamp: new Date().toISOString(),
    },
    { status: httpStatus }
  );
}
