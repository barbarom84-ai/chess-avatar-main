import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { normalizeLichessPuzzlePayload } from "@/lib/lichess-puzzle";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 40 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  try {
    const response = await fetch("https://lichess.org/api/puzzle/daily", {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Lichess returned ${response.status}` },
        { status: response.status === 404 ? 404 : 502 }
      );
    }

    const raw: unknown = await response.json().catch(() => null);
    if (raw === null || typeof raw !== "object") {
      return NextResponse.json({ error: "Invalid response from Lichess" }, { status: 502 });
    }

    const puzzle = normalizeLichessPuzzlePayload(raw);
    if (!puzzle) {
      return NextResponse.json({ error: "Could not parse puzzle" }, { status: 502 });
    }

    return NextResponse.json(puzzle);
  } catch (e) {
    console.error("[puzzles/daily]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
