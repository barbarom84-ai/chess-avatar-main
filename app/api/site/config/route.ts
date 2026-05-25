import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SITE_CONFIG, parseSiteConfig } from "@/lib/site-config";

export const runtime = "nodejs";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ config: DEFAULT_SITE_CONFIG });
  }

  const sb = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await sb.from("site_settings").select("config").eq("id", 1).maybeSingle();

  if (error || !data) {
    return NextResponse.json({ config: DEFAULT_SITE_CONFIG });
  }

  return NextResponse.json({
    config: parseSiteConfig(data.config),
  });
}
