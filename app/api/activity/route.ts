import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const MAX_EVENTS = 20;
const MAX_NAME_LEN = 64;
const MAX_PATH_LEN = 256;

type IncomingEvent = {
  event_name?: string;
  path?: string | null;
  session_id?: string;
  props?: Record<string, unknown>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function sanitizeProps(raw: unknown): Record<string, string | number | boolean> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (k.length > 48) continue;
    if (typeof v === "string" && v.length <= 200) out[k] = v;
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean") out[k] = v;
  }
  return out;
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 120 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  let body: { events?: IncomingEvent[] };
  try {
    body = (await request.json()) as { events?: IncomingEvent[] };
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const events = body.events;
  if (!Array.isArray(events) || events.length === 0) {
    return jsonError("events required", 400);
  }
  if (events.length > MAX_EVENTS) {
    return jsonError(`Max ${MAX_EVENTS} events per request`, 400);
  }

  const rows: {
    user_id: string;
    session_id: string | null;
    event_name: string;
    path: string | null;
    props: Record<string, string | number | boolean>;
  }[] = [];

  for (const e of events) {
    const name = String(e.event_name ?? "").slice(0, MAX_NAME_LEN);
    if (!name) return jsonError("event_name required", 400);
    rows.push({
      user_id: user.id,
      session_id: String(e.session_id ?? "").slice(0, 64) || null,
      event_name: name,
      path: e.path ? String(e.path).slice(0, MAX_PATH_LEN) : null,
      props: sanitizeProps(e.props),
    });
  }

  const { error } = await sb.from("activity_events").insert(rows);
  if (error) return jsonError(error.message ?? "Insert failed", 500);
  return NextResponse.json({ ok: true, count: rows.length });
}
