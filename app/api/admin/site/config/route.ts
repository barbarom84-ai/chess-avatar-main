import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthedUserFromRequest } from "@/lib/supabase-auth-request";
import { isSuperUserServer } from "@/lib/is-super-user-server";
import { DEFAULT_SITE_CONFIG, parseSiteConfig, type SiteConfig } from "@/lib/site-config";

export const runtime = "nodejs";

function serviceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireSuper(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!supabaseUrl || !anonKey) {
    return { error: NextResponse.json({ error: "Supabase not configured" }, { status: 503 }) };
  }

  const user = await getAuthedUserFromRequest(request, supabaseUrl, anonKey);
  if (!user) {
    return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }

  const admin = serviceClient();
  if (!admin) {
    return { error: NextResponse.json({ error: "Supabase not configured" }, { status: 503 }) };
  }

  if (!(await isSuperUserServer(admin, user.id))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { admin, userId: user.id };
}

export async function GET(request: NextRequest) {
  const auth = await requireSuper(request);
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.admin
    .from("site_settings")
    .select("config, updated_at, updated_by")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    config: parseSiteConfig(data?.config ?? DEFAULT_SITE_CONFIG),
    updatedAt: data?.updated_at ?? null,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireSuper(request);
  if ("error" in auth) return auth.error;

  let body: { config?: SiteConfig };
  try {
    body = (await request.json()) as { config?: SiteConfig };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.config) {
    return NextResponse.json({ error: "Missing config" }, { status: 400 });
  }

  const config = parseSiteConfig(body.config);

  const { data, error } = await auth.admin
    .from("site_settings")
    .upsert(
      { id: 1, config, updated_by: auth.userId },
      { onConflict: "id" }
    )
    .select("config, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    config: parseSiteConfig(data.config),
    updatedAt: data.updated_at,
  });
}
