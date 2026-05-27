import { NextRequest, NextResponse } from "next/server";
import { createAnonSupabase } from "@/lib/supabase-service";
import { isActiveSuperPlan } from "@/lib/subscription-access";
import { rateLimit } from "@/lib/rate-limit";
import { splitPgnGames } from "@/lib/pgn-to-uci";

export const runtime = "nodejs";

/** 2 MB cap on PGN payloads to keep memory/parse cost bounded. */
const MAX_PGN_BYTES = 2 * 1024 * 1024;

interface PgnFetchResult {
  pgn: string;
  sourceLabel: string;
  gameCount: number;
}

/** A per-host adapter: rewrites a user-pasted page URL to a PGN-returning URL and labels the source. */
interface Adapter {
  label: string;
  hosts: string[];
  resolve(url: URL): { fetchUrl: string; headers?: Record<string, string> } | null;
  /** Optional response transformer; some hosts return JSON wrapping the PGN. */
  parse?(rawBody: string, contentType: string): Promise<string> | string;
}

function isAllowedHost(url: URL, host: string): boolean {
  return url.hostname === host || url.hostname.endsWith(`.${host}`);
}

const lichessAdapter: Adapter = {
  label: "Lichess",
  hosts: ["lichess.org"],
  resolve(url) {
    const path = url.pathname.replace(/\/+$/, "");
    const studyMatch = path.match(/^\/study\/([A-Za-z0-9]{8})(?:\/([A-Za-z0-9]{8}))?$/);
    if (studyMatch) {
      const studyId = studyMatch[1];
      const chapterId = studyMatch[2];
      const fetchUrl = chapterId
        ? `https://lichess.org/api/study/${studyId}/${chapterId}.pgn`
        : `https://lichess.org/api/study/${studyId}.pgn`;
      return { fetchUrl };
    }
    const gameMatch = path.match(/^\/([A-Za-z0-9]{8,12})$/);
    if (gameMatch) {
      const gameId = gameMatch[1].slice(0, 8);
      return { fetchUrl: `https://lichess.org/game/export/${gameId}.pgn` };
    }
    if (/\.pgn$/i.test(path)) {
      return { fetchUrl: url.toString() };
    }
    return null;
  },
};

const chessComAdapter: Adapter = {
  label: "Chess.com",
  hosts: ["chess.com", "www.chess.com", "api.chess.com"],
  resolve(url) {
    const path = url.pathname.replace(/\/+$/, "");
    const liveMatch = path.match(/^\/game\/(?:live|daily)\/(\d+)/);
    if (liveMatch) {
      const gameType = path.includes("/daily/") ? "daily" : "live";
      return {
        fetchUrl: `https://www.chess.com/callback/${gameType}/game/${liveMatch[1]}`,
        headers: { Accept: "application/json" },
      };
    }
    if (/\.pgn$/i.test(path)) {
      return { fetchUrl: url.toString() };
    }
    return null;
  },
  async parse(rawBody, contentType) {
    if (contentType.includes("application/json")) {
      try {
        const data = JSON.parse(rawBody) as { game?: { pgnHeaders?: unknown; moveList?: unknown; pgn?: unknown } };
        if (data?.game && typeof data.game === "object" && typeof data.game.pgn === "string") {
          return data.game.pgn;
        }
      } catch {
        // fall through
      }
    }
    return rawBody;
  },
};

const twoSevenHundredAdapter: Adapter = {
  label: "2700chess.com",
  hosts: ["2700chess.com"],
  resolve(url) {
    const path = url.pathname.replace(/\/+$/, "");
    if (/\.pgn$/i.test(path)) {
      return { fetchUrl: `https://2700chess.com${path}` };
    }
    const tournamentMatch = path.match(/^\/tournaments\/([^/]+)/);
    if (tournamentMatch) {
      return { fetchUrl: `https://2700chess.com/pgn/${tournamentMatch[1]}.pgn` };
    }
    const playerMatch = path.match(/^\/players\/([^/]+)/);
    if (playerMatch) {
      return { fetchUrl: `https://2700chess.com/pgn/${playerMatch[1]}.pgn` };
    }
    return null;
  },
};

const pgnMentorAdapter: Adapter = {
  label: "PGN Mentor",
  hosts: ["pgnmentor.com"],
  resolve(url) {
    if (/\.(pgn|zip)$/i.test(url.pathname)) {
      return { fetchUrl: url.toString() };
    }
    return null;
  },
};

const ADAPTERS: Adapter[] = [lichessAdapter, chessComAdapter, twoSevenHundredAdapter, pgnMentorAdapter];

function findAdapter(url: URL): Adapter | null {
  for (const adapter of ADAPTERS) {
    if (adapter.hosts.some((h) => isAllowedHost(url, h))) return adapter;
  }
  return null;
}

async function authorizeSuperUser(req: NextRequest): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) return { ok: false, status: 401, error: "NOT_AUTHENTICATED" };
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, error: "SUPABASE_NOT_CONFIGURED" };
  }
  const supabase = createAnonSupabase(token);
  if (!supabase) {
    return { ok: false, status: 500, error: "SUPABASE_NOT_CONFIGURED" };
  }
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user?.id) return { ok: false, status: 401, error: "NOT_AUTHENTICATED" };
  const { data: subRow } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();
  if (!isActiveSuperPlan(subRow?.plan, subRow?.status)) {
    return { ok: false, status: 403, error: "FORBIDDEN" };
  }
  return { ok: true };
}

async function fetchWithSizeCap(url: string, headers: Record<string, string> | undefined): Promise<{ body: string; contentType: string }> {
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/x-chess-pgn, text/plain;q=0.9, */*;q=0.5", ...(headers ?? {}) },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Upstream ${res.status} ${res.statusText}`);
  }
  const contentLength = Number(res.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_PGN_BYTES) {
    throw new Error("PGN_TOO_LARGE");
  }
  const reader = res.body?.getReader();
  const contentType = res.headers.get("content-type") ?? "";
  if (!reader) {
    const text = await res.text();
    if (text.length > MAX_PGN_BYTES) throw new Error("PGN_TOO_LARGE");
    return { body: text, contentType };
  }
  const decoder = new TextDecoder("utf-8");
  let body = "";
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_PGN_BYTES) {
        try {
          await reader.cancel();
        } catch {}
        throw new Error("PGN_TOO_LARGE");
      }
      body += decoder.decode(value, { stream: true });
    }
  }
  body += decoder.decode();
  return { body, contentType };
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, { windowMs: 60_000, max: 30 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const auth = await authorizeSuperUser(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
  if (!body || typeof body.url !== "string") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(body.url);
  } catch {
    return NextResponse.json({ error: "INVALID_URL" }, { status: 400 });
  }
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    return NextResponse.json({ error: "UNSUPPORTED_PROTOCOL" }, { status: 400 });
  }
  parsedUrl.hash = "";

  const adapter = findAdapter(parsedUrl);
  if (!adapter) {
    return NextResponse.json({ error: "UNSUPPORTED_HOST" }, { status: 400 });
  }
  const resolved = adapter.resolve(parsedUrl);
  if (!resolved) {
    return NextResponse.json({ error: "UNSUPPORTED_URL_FOR_HOST" }, { status: 400 });
  }

  let raw: { body: string; contentType: string };
  try {
    raw = await fetchWithSizeCap(resolved.fetchUrl, resolved.headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : "FETCH_FAILED";
    const status = message === "PGN_TOO_LARGE" ? 413 : 502;
    return NextResponse.json({ error: message }, { status });
  }

  const pgn = adapter.parse ? await adapter.parse(raw.body, raw.contentType) : raw.body;
  const trimmed = pgn?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "EMPTY_PGN" }, { status: 502 });
  }
  const games = splitPgnGames(trimmed);

  const result: PgnFetchResult = {
    pgn: trimmed,
    sourceLabel: adapter.label,
    gameCount: games.length,
  };
  return NextResponse.json(result);
}
