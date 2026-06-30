import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createAnonSupabase, createServiceSupabase } from "@/lib/supabase-service";
import { rateLimit } from "@/lib/rate-limit";
import { hasActivePremiumAccess } from "@/lib/subscription-access";
import { buildSystemPrompt, type ChatRequest } from "@/lib/avatar-chat-prompt";

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
  const system = buildSystemPrompt(body);
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...(body.history ?? []).slice(-6).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: body.message.trim() },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: 180,
      temperature: 0.85,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "";

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
        await admin.from("coach_usage").upsert(
          { user_id: user.id, day: today, count: prev + 1, updated_at: new Date().toISOString() },
          { onConflict: "user_id,day" }
        );
      }
    }

    return NextResponse.json({
      reply,
      remaining: isPremium ? null : Math.max(0, FREE_DAILY_QUOTA - 1),
    });
  } catch {
    return NextResponse.json({ error: "OPENAI_ERROR" }, { status: 502 });
  }
}
