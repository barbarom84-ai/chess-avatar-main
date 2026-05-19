import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import OpenAI from "openai";

import { rateLimit } from "@/lib/rate-limit";
import { hasActivePremiumAccess } from "@/lib/subscription-access";
import { type CoachToneId, isCoachToneId } from "@/lib/coach-tone";

export const runtime = "nodejs";

const MODEL = "gpt-4o-mini";
/** Free users get this many non-cache-hit explanations per UTC day. */
const FREE_DAILY_QUOTA = 10;
/** Hard cap on the response length (the LLM answer is short by design). */
const MAX_OUTPUT_TOKENS = 220;

/** PostgREST code returned when a referenced table doesn't exist. */
const PG_UNDEFINED_TABLE = "42P01";

interface ExplainRequest {
  fenBefore: string;
  uciPlayed: string;
  uciBest: string;
  cpl: number;
  classification: string;
  sideToMove: "white" | "black";
  /** "fr" | "en" — controls the answer language. */
  lang: "fr" | "en";
  /** Optional: 1-based move number for prompt context. */
  moveNumber?: number;
  /** Optional: SAN played and SAN best — improve readability of the prompt. */
  sanPlayed?: string;
  sanBest?: string;
  coachTone?: CoachToneId;
}

type ExplainErrorCode =
  | "NOT_AUTHENTICATED"
  | "INVALID_BODY"
  | "OPENAI_KEY_MISSING"
  | "SUPABASE_NOT_CONFIGURED"
  | "QUOTA_EXCEEDED"
  | "OPENAI_ERROR"
  | "RATE_LIMITED";

interface ExplainSuccess {
  explanation: string;
  cached: boolean;
  /** For free users: how many calls remain today (after this one). */
  remaining: number | null;
  /** Free daily quota (or null for premium / unlimited). */
  limit: number | null;
  /** Set when the persistence layer is degraded (e.g. tables missing). */
  warning?: string;
}

function errorResponse(
  code: ExplainErrorCode,
  status: number,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error: code, ...(extra ?? {}) }, { status });
}

function isValidUci(uci: unknown): uci is string {
  return typeof uci === "string" && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci);
}

function isValidFen(fen: unknown): fen is string {
  return (
    typeof fen === "string" &&
    fen.length > 10 &&
    fen.length < 100 &&
    fen.split(" ").length >= 4
  );
}

function buildCacheKey(req: ExplainRequest): string {
  // Bucketize CPL so similar blunders share an explanation.
  const cplBucket = Math.min(20, Math.floor(req.cpl / 50));
  const tone = req.coachTone ?? "pedagogical";
  const payload = [
    MODEL,
    req.lang,
    tone,
    req.fenBefore,
    req.uciPlayed,
    req.uciBest,
    cplBucket,
    req.classification,
  ].join("|");
  return createHash("sha256").update(payload).digest("hex");
}

function coachSystemPrompt(lang: "fr" | "en", tone: CoachToneId): string {
  if (lang === "fr") {
    switch (tone) {
      case "concise":
        return "Tu es un coach d'échecs ultra-bref : une ou deux phrases maximum, aucune variante longue, aucune liste.";
      case "witty":
        return "Tu es un coach d'échecs avec une pointe d'humour léger et bienveillant — sans moquerie du joueur. Reste factuel sur l'échiquier. 2 à 4 phrases courtes.";
      default:
        return "Tu es un coach d'échecs concis. Tu expliques pourquoi un coup est sous-optimal en 2 à 4 phrases courtes. Pas de variantes longues, pas de notation algébrique multi-coups, pas de listes — juste une explication claire et pédagogique.";
    }
  }
  switch (tone) {
    case "concise":
      return "You are an ultra-brief chess coach: one or two sentences max, no long variations, no bullet lists.";
    case "witty":
      return "You are a chess coach with light, kind humor — never mock the player. Stay accurate about the position. 2–4 short sentences.";
    default:
      return "You are a concise chess coach. Explain why a move is sub-optimal in 2 to 4 short sentences. No long variations, no multi-move algebraic notation, no bullet lists — just a clear, educational explanation.";
  }
}

function buildPrompt(req: ExplainRequest): { system: string; user: string } {
  const isFr = req.lang === "fr";
  const tone = req.coachTone ?? "pedagogical";
  const sideLabel = req.sideToMove === "white"
    ? (isFr ? "les Blancs" : "White")
    : (isFr ? "les Noirs" : "Black");
  const moveLabel = req.sanPlayed ?? req.uciPlayed;
  const bestLabel = req.sanBest ?? req.uciBest;
  const cpInfo = isFr
    ? `Perte évaluée à ${req.cpl} centipions (${req.classification}).`
    : `Estimated loss: ${req.cpl} centipawns (${req.classification}).`;

  const system = coachSystemPrompt(req.lang, tone);

  const user = isFr
    ? `Position FEN : ${req.fenBefore}\nCoup joué par ${sideLabel} : ${moveLabel}\nMeilleur coup recommandé : ${bestLabel}\n${cpInfo}\n\nExplique en 2-4 phrases pourquoi ${moveLabel} est moins bon que ${bestLabel}, et ce que ${sideLabel} aurait dû considérer.`
    : `FEN: ${req.fenBefore}\nMove played by ${sideLabel}: ${moveLabel}\nBest move: ${bestLabel}\n${cpInfo}\n\nExplain in 2-4 sentences why ${moveLabel} is worse than ${bestLabel}, and what ${sideLabel} should have considered.`;

  return { system, user };
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, { windowMs: 60_000, max: 20 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED" satisfies ExplainErrorCode },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) return errorResponse("NOT_AUTHENTICATED", 401);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const openaiKey = process.env.OPENAI_API_KEY ?? "";
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return errorResponse("SUPABASE_NOT_CONFIGURED", 500);
  }
  if (!openaiKey) return errorResponse("OPENAI_KEY_MISSING", 500);

  // 1) Authenticate the caller.
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user?.id) return errorResponse("NOT_AUTHENTICATED", 401);

  // 2) Validate body.
  const body = (await req.json().catch(() => null)) as Partial<ExplainRequest> | null;
  if (
    !body ||
    !isValidFen(body.fenBefore) ||
    !isValidUci(body.uciPlayed) ||
    !isValidUci(body.uciBest) ||
    typeof body.cpl !== "number" ||
    !Number.isFinite(body.cpl) ||
    typeof body.classification !== "string" ||
    (body.sideToMove !== "white" && body.sideToMove !== "black") ||
    (body.lang !== "fr" && body.lang !== "en")
  ) {
    return errorResponse("INVALID_BODY", 400);
  }
  const toneRaw = body.coachTone;
  const coachTone: CoachToneId =
    isCoachToneId(toneRaw) ? toneRaw : "pedagogical";

  const explainReq: ExplainRequest = {
    fenBefore: body.fenBefore,
    uciPlayed: body.uciPlayed,
    uciBest: body.uciBest,
    cpl: Math.max(0, Math.round(body.cpl)),
    classification: body.classification.slice(0, 32),
    sideToMove: body.sideToMove,
    lang: body.lang,
    moveNumber: typeof body.moveNumber === "number" ? body.moveNumber : undefined,
    sanPlayed: typeof body.sanPlayed === "string" ? body.sanPlayed.slice(0, 16) : undefined,
    sanBest: typeof body.sanBest === "string" ? body.sanBest.slice(0, 16) : undefined,
    coachTone,
  };

  // 3) Service-role client for shared cache + usage writes.
  const adminClient: AdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const cacheKey = buildCacheKey(explainReq);

  // Tracks whether DB-side persistence (cache + quota) is available. When the
  // migration hasn't been run yet, we degrade gracefully: skip cache reads,
  // skip quota writes, and surface a `warning` field on success.
  let dbWarning: string | null = null;

  // 4) Try the shared cache first (best-effort).
  let cachedExplanation: string | null = null;
  {
    const { data, error } = await adminClient
      .from("coach_explanations")
      .select("explanation")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (error) {
      if (error.code === PG_UNDEFINED_TABLE) {
        dbWarning = "coach_explanations_missing";
      } else {
        console.error("coach_explanations select error:", error);
      }
    }
    const row = data as { explanation?: string } | null;
    if (row?.explanation) cachedExplanation = row.explanation;
  }

  // 5) Premium check (decides quota path).
  const { data: subRow } = await userClient
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();
  const isPremium = hasActivePremiumAccess(subRow?.plan, subRow?.status);

  if (cachedExplanation) {
    const remaining = isPremium
      ? null
      : await getRemainingQuota(adminClient, user.id);
    return NextResponse.json({
      explanation: cachedExplanation,
      cached: true,
      remaining,
      limit: isPremium ? null : FREE_DAILY_QUOTA,
      ...(dbWarning ? { warning: dbWarning } : {}),
    } satisfies ExplainSuccess);
  }

  // 6) Quota check for non-premium users (only counts cache MISS).
  if (!isPremium) {
    const usage = await getUsageCount(adminClient, user.id);
    if (usage.tableMissing) {
      dbWarning = "coach_usage_missing";
    }
    if (usage.count >= FREE_DAILY_QUOTA) {
      return errorResponse("QUOTA_EXCEEDED", 429, {
        used: usage.count,
        limit: FREE_DAILY_QUOTA,
      });
    }
  }

  // 7) Call OpenAI.
  const { system, user: userPrompt } = buildPrompt(explainReq);
  let explanation: string;
  let promptTokens = 0;
  let completionTokens = 0;
  try {
    const openai = new OpenAI({ apiKey: openaiKey });
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: MAX_OUTPUT_TOKENS,
    });
    const choice = completion.choices?.[0]?.message?.content;
    if (typeof choice !== "string" || choice.trim().length === 0) {
      return errorResponse("OPENAI_ERROR", 502, { detail: "EMPTY_COMPLETION" });
    }
    explanation = choice.trim();
    promptTokens = completion.usage?.prompt_tokens ?? 0;
    completionTokens = completion.usage?.completion_tokens ?? 0;
  } catch (err) {
    const detail =
      err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 200) : "UNKNOWN";
    console.error("OpenAI error:", err);
    return errorResponse("OPENAI_ERROR", 502, { detail });
  }

  // 8) Persist to the shared cache (best-effort — table may not exist yet).
  await adminClient
    .from("coach_explanations")
    .insert({
      cache_key: cacheKey,
      explanation,
      model: MODEL,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
    })
    .then(({ error }) => {
      if (!error) return;
      if (error.code === "23505") return; // unique violation = race-condition cache hit
      if (error.code === PG_UNDEFINED_TABLE) {
        dbWarning = "coach_explanations_missing";
        return;
      }
      console.error("coach_explanations insert error:", error);
    });

  // 9) Increment usage for non-premium.
  let remaining: number | null = null;
  if (!isPremium) {
    const result = await incrementUsage(adminClient, user.id);
    if (result.tableMissing) {
      dbWarning = "coach_usage_missing";
      // Tables missing: we can't enforce quota — return null so the UI doesn't
      // show a misleading "9 left" counter.
      remaining = null;
    } else {
      remaining = Math.max(0, FREE_DAILY_QUOTA - result.count);
    }
  }

  return NextResponse.json({
    explanation,
    cached: false,
    remaining,
    limit: isPremium ? null : FREE_DAILY_QUOTA,
    ...(dbWarning ? { warning: dbWarning } : {}),
  } satisfies ExplainSuccess);
}

// ---------------------------------------------------------------------------
// Quota helpers (use service-role client so we can write coach_usage rows
// regardless of RLS).
// ---------------------------------------------------------------------------

// We deliberately use a loose `SupabaseClient` type here — the cache/usage
// tables are not present in the project's generated DB types yet, so without
// `any` the typed generics resolve to `never` and reject our row shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, any, any>;

interface UsageReadResult {
  count: number;
  tableMissing: boolean;
}

async function getUsageCount(
  client: AdminClient,
  userId: string,
): Promise<UsageReadResult> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await client
    .from("coach_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("day", today)
    .maybeSingle();
  if (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      return { count: 0, tableMissing: true };
    }
    console.error("coach_usage select error:", error);
    return { count: 0, tableMissing: false };
  }
  const row = data as { count?: number } | null;
  return {
    count: typeof row?.count === "number" ? row.count : 0,
    tableMissing: false,
  };
}

async function getRemainingQuota(
  client: AdminClient,
  userId: string,
): Promise<number> {
  const usage = await getUsageCount(client, userId);
  if (usage.tableMissing) return FREE_DAILY_QUOTA; // optimistic when DB unavailable
  return Math.max(0, FREE_DAILY_QUOTA - usage.count);
}

interface UsageWriteResult {
  /** New count after increment (0 when tableMissing). */
  count: number;
  tableMissing: boolean;
}

async function incrementUsage(
  client: AdminClient,
  userId: string,
): Promise<UsageWriteResult> {
  const today = new Date().toISOString().slice(0, 10);
  const current = await getUsageCount(client, userId);
  if (current.tableMissing) return { count: 0, tableMissing: true };
  const next = current.count + 1;
  // Upsert on (user_id, day) — atomic enough for a per-user quota; race
  // conditions can at worst over/under-count by 1, which is acceptable.
  const { error } = await client
    .from("coach_usage")
    .upsert(
      {
        user_id: userId,
        day: today,
        count: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,day" },
    );
  if (error) {
    if (error.code === PG_UNDEFINED_TABLE) {
      return { count: next, tableMissing: true };
    }
    console.error("coach_usage upsert error:", error);
  }
  return { count: next, tableMissing: false };
}
