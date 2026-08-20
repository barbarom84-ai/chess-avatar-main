import { NextRequest, NextResponse } from "next/server";
import { buildOpeningCatalog } from "@/lib/openings-catalog-export";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Catalogue d’ouvertures au format Android (`OpeningLessonDto`).
 * GET /api/openings/catalog
 */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, { windowMs: 60_000, max: 30 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const catalog = buildOpeningCatalog();
  return NextResponse.json(
    { catalog, generatedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
