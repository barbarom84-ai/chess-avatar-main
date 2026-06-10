import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SITE_CONFIG, parseSiteConfig, type SiteConfig } from "@/lib/site-config";

export async function loadSiteConfig(sb: SupabaseClient): Promise<SiteConfig> {
  const { data, error } = await sb
    .from("site_settings")
    .select("config")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return DEFAULT_SITE_CONFIG;
  return parseSiteConfig(data.config);
}
