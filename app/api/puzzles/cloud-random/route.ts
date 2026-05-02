import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";
import { buildCloudMoveChallengeFromPgn, canBuildCloudPuzzleFromPgn } from "@/lib/cloud-puzzle";

export const runtime = "nodejs";

const MAX_SAMPLE = 400;
/** Plus de tentatives car le filtre tactique réduit fortement les plies valides. */
const MAX_TRIES = 36;

async function getAuthedUser(
  request: NextRequest,
  supabaseUrl: string,
  anonKey: string
): Promise<User | null> {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (bearer) {
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error,
    } = await sb.auth.getUser();
    if (!error && user) return user;
  }

  const cookieStore = await cookies();
  const authClient = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* ignore */
        }
      },
    },
  });

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();
  if (!error && user) return user;
  return null;
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, { windowMs: 60_000, max: 30 });
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

  const user = await getAuthedUser(request, supabaseUrl, anonKey);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const q1 = await admin
    .from("games")
    .select("id, pgn, opponent_name, moves_count")
    .gte("moves_count", 10)
    .order("created_at", { ascending: false })
    .limit(MAX_SAMPLE);

  if (q1.error) {
    console.error("[puzzles/cloud-random] query", q1.error);
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }

  let rows = q1.data;

  if (!rows?.length) {
    const q2 = await admin
      .from("games")
      .select("id, pgn, opponent_name, moves_count")
      .order("created_at", { ascending: false })
      .limit(Math.min(200, MAX_SAMPLE));

    if (q2.error || !q2.data?.length) {
      return NextResponse.json(
        { error: "No saved games in the pool yet" },
        { status: 404 }
      );
    }
    rows = q2.data;
  }

  const usable = rows.filter((r) => r.pgn && canBuildCloudPuzzleFromPgn(r.pgn));
  if (usable.length === 0) {
    return NextResponse.json(
      { error: "No suitable games for puzzles yet" },
      { status: 404 }
    );
  }

  for (let t = 0; t < MAX_TRIES; t++) {
    const row = usable[Math.floor(Math.random() * usable.length)];
    if (!row) break;
    const built = buildCloudMoveChallengeFromPgn(row.pgn, {
      gameId: row.id,
      opponentName: row.opponent_name ?? "?",
    });
    if (built) {
      return NextResponse.json(built);
    }
  }

  return NextResponse.json({ error: "Could not build a puzzle from the pool" }, { status: 502 });
}
