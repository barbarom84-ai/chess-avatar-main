import { NextRequest, NextResponse } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import { listAccountFriends, migrateAccountFriends } from "@/lib/account-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  if (!body || typeof body !== "object") return jsonError("Invalid payload", 400);
  const entriesRaw = (body as Record<string, unknown>).entries;
  if (!Array.isArray(entriesRaw)) return jsonError("Invalid entries", 400);

  const entries = entriesRaw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const userId = typeof row.userId === "string" ? row.userId.trim() : "";
      const label = typeof row.label === "string" ? row.label.trim() : "Friend";
      if (userId.length < 8) return null;
      return { userId, label };
    })
    .filter((entry): entry is { userId: string; label: string } => Boolean(entry));

  try {
    const imported = await migrateAccountFriends(sb, user.id, entries);
    const friends = await listAccountFriends(sb, user.id);
    return NextResponse.json({ imported, friends });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Friends migration failed", 500);
  }
}
