import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function pvpRateLimitOrResponse(
  request: NextRequest,
  options: { windowMs: number; max: number }
): Promise<NextResponse | null> {
  const limited = await rateLimit(request, options);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }
  return null;
}
