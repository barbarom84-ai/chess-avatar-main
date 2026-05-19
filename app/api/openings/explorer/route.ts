import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  explorerCacheKey,
  getCachedExplorer,
  setCachedExplorer,
} from "@/lib/explorer-response-cache";

export const runtime = "nodejs";

const EXPLORER_BASE = "https://explorer.lichess.ovh";

function isValidFen(fen: unknown): fen is string {
  return (
    typeof fen === "string" &&
    fen.length > 10 &&
    fen.length < 120 &&
    fen.split(" ").length >= 4
  );
}

/**
 * Proxy + cache vers l'Opening Explorer Lichess (stats réelles, pas de base locale énorme).
 * GET ?fen=...&pool=masters|lichess
 */
export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 30 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const fen = searchParams.get("fen");
  const poolParam = searchParams.get("pool") ?? "masters";
  const pool = poolParam === "lichess" ? "lichess" : "masters";
  const variant = searchParams.get("variant") ?? "standard";

  if (!isValidFen(fen)) {
    return NextResponse.json({ error: "INVALID_FEN" }, { status: 400 });
  }

  const cacheKey = explorerCacheKey(fen, variant, pool);
  const hit = getCachedExplorer(cacheKey);
  if (hit !== null) {
    return NextResponse.json({ data: hit, cached: true });
  }

  const url = new URL(`${EXPLORER_BASE}/${pool}`);
  url.searchParams.set("fen", fen);
  if (pool === "lichess") {
    url.searchParams.set("variant", variant);
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "ChessAvatar/1.0 (opening explorer proxy)",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "UPSTREAM_ERROR", status: res.status },
        { status: 502 }
      );
    }

    const json: unknown = await res.json().catch(() => null);
    if (json === null) {
      return NextResponse.json({ error: "INVALID_UPSTREAM" }, { status: 502 });
    }

    setCachedExplorer(cacheKey, json);
    return NextResponse.json({ data: json, cached: false });
  } catch {
    return NextResponse.json({ error: "FETCH_FAILED" }, { status: 502 });
  }
}
