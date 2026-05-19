import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import {
  buildCloudMoveChallengeFromPgn,
  canBuildCloudPuzzleFromPgn,
  type CloudPuzzlePayload,
} from "@/lib/cloud-puzzle";

export const runtime = "nodejs";

const MAX_SAMPLE = 400;
/** Plus de tentatives car le filtre tactique réduit fortement les plies valides. */
const MAX_TRIES = 36;

type GamePuzzleRow = {
  id: string;
  pgn: string | null;
  opponent_name: string | null;
  moves_count: number;
};

async function tryLegacyPoolScan(admin: SupabaseClient): Promise<CloudPuzzlePayload | null> {
  const q1 = await admin
    .from("games")
    .select("id, pgn, opponent_name, moves_count")
    .gte("moves_count", 10)
    .order("created_at", { ascending: false })
    .limit(MAX_SAMPLE);

  if (q1.error) {
    console.error("[puzzles/cloud-random] legacy query", q1.error);
    return null;
  }

  let rows = q1.data as GamePuzzleRow[] | null;

  if (!rows?.length) {
    const q2 = await admin
      .from("games")
      .select("id, pgn, opponent_name, moves_count")
      .order("created_at", { ascending: false })
      .limit(Math.min(200, MAX_SAMPLE));

    if (q2.error || !q2.data?.length) {
      return null;
    }
    rows = q2.data as GamePuzzleRow[];
  }

  const usable = rows.filter(
    (r): r is GamePuzzleRow & { pgn: string } =>
      typeof r.pgn === "string" && r.pgn.length > 0 && canBuildCloudPuzzleFromPgn(r.pgn)
  );
  if (usable.length === 0) {
    return null;
  }

  for (let t = 0; t < MAX_TRIES; t++) {
    const row = usable[Math.floor(Math.random() * usable.length)];
    if (!row) break;
    const built = buildCloudMoveChallengeFromPgn(row.pgn, {
      gameId: row.id,
      opponentName: row.opponent_name ?? "?",
    });
    if (built) return built;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 30 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  if (!serviceKey) {
    return NextResponse.json(
      { error: "Server puzzle pool unavailable (missing service role)" },
      { status: 503 }
    );
  }

  const user = await getAuthedUserFromRequest(request, supabaseUrl, anonKey);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rpcResult = await admin.rpc("random_community_puzzle");
  if (rpcResult.error) {
    console.warn("[puzzles/cloud-random] random_community_puzzle:", rpcResult.error.message);
  } else {
    const arr = rpcResult.data as { payload?: unknown; game_id?: string }[] | null;
    const first = arr?.[0];
    if (first?.payload && typeof first.game_id === "string") {
      const payload = first.payload as CloudPuzzlePayload;
      if (payload.kind === "cloud") {
        const { data: gameRow } = await admin
          .from("games")
          .select("opponent_name")
          .eq("id", first.game_id)
          .maybeSingle();

        const name =
          typeof gameRow?.opponent_name === "string" ? gameRow.opponent_name.trim() : "";
        if (name) {
          payload.opponentName = name;
        }

        return NextResponse.json(payload);
      }
    }
  }

  if (process.env.CLOUD_PUZZLE_ALLOW_LEGACY_SCAN === "true") {
    const legacy = await tryLegacyPoolScan(admin);
    if (legacy) {
      return NextResponse.json(legacy);
    }
    return NextResponse.json(
      { error: "Could not build a puzzle from the pool (legacy scan)" },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      error:
        "No indexed community puzzles yet. Apply the community_puzzles migration and run npm run index-community-puzzles.",
    },
    { status: 404 }
  );
}
