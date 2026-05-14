import { NextRequest, NextResponse } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { createServiceSupabase } from "@/lib/supabase-service";
import {
  addAccountFriend,
  listAccountFriends,
  removeAccountFriend,
} from "@/lib/account-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  try {
    const friends = await listAccountFriends(sb, user.id);
    return NextResponse.json({ friends });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Friends load failed", 500);
  }
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
  const o = body as Record<string, unknown>;
  const friendUserId = typeof o.friendUserId === "string" ? o.friendUserId.trim() : "";
  const label = typeof o.label === "string" ? o.label.trim() : "Friend";
  if (friendUserId.length < 8) return jsonError("Invalid friend id", 400);

  try {
    await addAccountFriend(sb, user.id, friendUserId, label);
    const friends = await listAccountFriends(sb, user.id);
    return NextResponse.json({ friends });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Friend add failed", 500);
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthedUserFromRequest(request, supabaseUrl, supabaseAnonKey);
  if (!user) return jsonError("Unauthorized", 401);

  const sb = createServiceSupabase();
  if (!sb) return jsonError("Server misconfigured", 503);

  const friendUserId = request.nextUrl.searchParams.get("friendUserId")?.trim() ?? "";
  if (friendUserId.length < 8) return jsonError("Invalid friend id", 400);

  try {
    await removeAccountFriend(sb, user.id, friendUserId);
    const friends = await listAccountFriends(sb, user.id);
    return NextResponse.json({ friends });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Friend remove failed", 500);
  }
}
