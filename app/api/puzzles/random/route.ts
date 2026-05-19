import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  firstPuzzleFromBatchResponse,
  normalizeLichessPuzzlePayload,
} from "@/lib/lichess-puzzle";

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

  const { searchParams } = new URL(request.url);
  const difficulty = searchParams.get("difficulty");
  const allowed = new Set(["easiest", "easier", "normal", "harder", "hardest"]);
  const lichessUrl = new URL("https://lichess.org/api/puzzle/batch/mix");
  lichessUrl.searchParams.set("nb", "1");
  if (difficulty && allowed.has(difficulty)) {
    lichessUrl.searchParams.set("difficulty", difficulty);
  }

  try {
    const response = await fetch(lichessUrl.toString(),
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Lichess returned ${response.status}` },
        { status: response.status === 401 || response.status === 403 ? response.status : 502 }
      );
    }

    const raw: unknown = await response.json().catch(() => null);
    if (raw === null || typeof raw !== "object") {
      return NextResponse.json({ error: "Invalid response from Lichess" }, { status: 502 });
    }

    const first = firstPuzzleFromBatchResponse(raw);
    if (!first) {
      return NextResponse.json({ error: "Could not parse puzzle batch" }, { status: 502 });
    }

    /** Batch/mix omits `puzzle.fen`; detail endpoint matches daily shape and includes FEN. */
    const detailRes = await fetch(
      `https://lichess.org/api/puzzle/${encodeURIComponent(first.puzzleId)}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );
    if (!detailRes.ok) {
      return NextResponse.json(
        { error: `Lichess puzzle detail returned ${detailRes.status}` },
        { status: 502 }
      );
    }
    const detailRaw: unknown = await detailRes.json().catch(() => null);
    const puzzle = normalizeLichessPuzzlePayload(detailRaw);
    if (!puzzle) {
      return NextResponse.json({ error: "Could not parse puzzle detail" }, { status: 502 });
    }

    return NextResponse.json(puzzle);
  } catch (e) {
    console.error("[puzzles/random]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
