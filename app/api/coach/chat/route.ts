import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createAnonSupabase, createServiceSupabase } from "@/lib/supabase-service";
import { rateLimit } from "@/lib/rate-limit";
import { hasActivePremiumAccess } from "@/lib/subscription-access";
import { buildSystemPrompt, type ChatRequest } from "@/lib/avatar-chat-prompt";
import { localizeFrenchCoachText } from "@/lib/localized-san";
import { hydrateReviewChatContext, expandReviewCoachUserMessage } from "@/lib/review-coach-context";

export const runtime = "nodejs";

const MODEL = "gpt-4o-mini";
const FREE_DAILY_QUOTA = 20;

interface ChatRequestBody extends ChatRequest {
  history?: { role: "user" | "assistant"; content: string }[];
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, { windowMs: 60_000, max: 30 });
  if (!limited.ok) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  const openaiKey = process.env.OPENAI_API_KEY ?? "";
  if (!openaiKey) {
    return NextResponse.json({ error: "OPENAI_KEY_MISSING" }, { status: 503 });
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  if (!body.message?.trim() || !body.stats?.username) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const supabase = createAnonSupabase(token);
  if (!supabase) {
    return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 500 });
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();

  const isPremium = hasActivePremiumAccess(sub?.plan, sub?.status);

  if (!isPremium) {
    const admin = createServiceSupabase();
    if (admin) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: usageRow } = await admin
        .from("coach_usage")
        .select("count")
        .eq("user_id", user.id)
        .eq("day", today)
        .maybeSingle();
      const count = typeof usageRow?.count === "number" ? usageRow.count : 0;
      if (count >= FREE_DAILY_QUOTA) {
        return NextResponse.json({ error: "QUOTA_EXCEEDED" }, { status: 429 });
      }
    }
  }

  const openai = new OpenAI({ apiKey: openaiKey });
  const review = hydrateReviewChatContext(body.review);
  const promptBody = { ...body, review };
  const system = buildSystemPrompt(promptBody);
  const isReview = Boolean(
    review?.fen ||
      review?.fenBefore ||
      review?.lastMove ||
      review?.playerColor
  );
  const trimmed = body.message.trim();
  const userContent = isReview
    ? expandReviewCoachUserMessage(trimmed, review, body.lang)
    : trimmed;
  const prior = (body.history ?? []).slice(-6);
  const history =
    prior.length &&
    prior[prior.length - 1]?.role === "user" &&
    prior[prior.length - 1]?.content === trimmed
      ? prior.slice(0, -1)
      : prior;
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...history.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: userContent },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: isReview ? 220 : 180,
      temperature: isReview ? 0.25 : 0.85,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const reply =
      body.lang === "fr"
        ? localizeFrenchCoachText(raw, [
            review?.lastMove ?? "",
            review?.bestMove ?? "",
            ...(review?.legalMovesNow ?? []),
          ])
        : raw;

    let remaining: number | null = null;
    if (!isPremium) {
      const admin = createServiceSupabase();
      if (admin) {
        const today = new Date().toISOString().slice(0, 10);
        const { data: usageRow } = await admin
          .from("coach_usage")
          .select("count")
          .eq("user_id", user.id)
          .eq("day", today)
          .maybeSingle();
        const prev = typeof usageRow?.count === "number" ? usageRow.count : 0;
        const next = prev + 1;
        await admin.from("coach_usage").upsert(
          {
            user_id: user.id,
            day: today,
            count: next,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,day" }
        );
        remaining = Math.max(0, FREE_DAILY_QUOTA - next);
      }
    }

    return NextResponse.json({
      reply,
      remaining,
      limit: isPremium ? null : FREE_DAILY_QUOTA,
    });
  } catch {
    return NextResponse.json({ error: "OPENAI_ERROR" }, { status: 502 });
  }
}
