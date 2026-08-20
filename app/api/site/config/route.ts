import { NextResponse } from "next/server";
import { createAnonSupabase } from "@/lib/supabase-service";
import { DEFAULT_SITE_CONFIG, parseSiteConfig } from "@/lib/site-config";

export const runtime = "nodejs";

export async function GET() {
  const sb = createAnonSupabase();
  if (!sb) {
    return NextResponse.json({ config: DEFAULT_SITE_CONFIG });
  }

  const { data, error } = await sb.from("site_settings").select("config").eq("id", 1).maybeSingle();

  if (error || !data) {
    return NextResponse.json({ config: DEFAULT_SITE_CONFIG });
  }

  return NextResponse.json({
    config: parseSiteConfig(data.config),
  });
}
