import type { EngineConfig, PersonaStats } from "@/lib/analysis";
import type { ProfileOption } from "@/lib/arena-types";
import { isFeaturedChampionConfig } from "@/lib/arena-featured-persist";
import { normalizeEnginePlatform } from "@/lib/normalize-engine-platform";
import { getSavedConfigs, getRecentConfigs } from "@/lib/storage";
import { getFilteredProfiles } from "@/lib/supabase-storage";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type ProfilePlatformFilter = "all" | "lichess" | "chesscom";

export function profileIdentityKey(config: EngineConfig): string {
  const name = (config.name || "").trim().toLowerCase();
  return `${name}|${normalizeEnginePlatform(config)}`;
}

export function buildRawOptions(
  savedLabel: string,
  recentLabel: string
): ProfileOption[] {
  const saved = getSavedConfigs();
  const recent = getRecentConfigs();
  const out: ProfileOption[] = [];
  const seenIdentity = new Set<string>();
  for (const s of saved) {
    seenIdentity.add(profileIdentityKey(s.config));
    const labelBase = s.customName || s.config.name;
    out.push({
      key: `saved:${s.id}`,
      label: `${labelBase} (${savedLabel})`,
      config: s.config,
      savedAt: s.savedAt,
    });
  }
  for (const r of recent) {
    if (seenIdentity.has(profileIdentityKey(r.config))) continue;
    seenIdentity.add(profileIdentityKey(r.config));
    out.push({
      key: `recent:${r.id}`,
      label: `${r.config.name} (${recentLabel})`,
      config: r.config,
      savedAt: r.savedAt,
    });
  }
  out.sort((a, b) => b.savedAt - a.savedAt);
  return out;
}

export async function fetchCloudArenaProfileOptions(
  cloudLabel: string
): Promise<ProfileOption[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const rows = await getFilteredProfiles("public", "date", 120, undefined, {
      platform: "all",
      dedupeByUsernamePlatform: true,
    });
    return rows.map((p) => ({
      key: `cloud:${p.id}`,
      label: `${p.username} (${cloudLabel})`,
      config: { ...p.config, platform: p.platform },
      stats: p.stats as PersonaStats,
      savedAt: new Date(p.updated_at || p.created_at).getTime(),
    }));
  } catch {
    return [];
  }
}

export function mergeLocalAndCloud(
  local: ProfileOption[],
  cloud: ProfileOption[]
): ProfileOption[] {
  const seen = new Set(local.map((o) => profileIdentityKey(o.config)));
  const out = [...local];
  for (const c of cloud) {
    const ik = profileIdentityKey(c.config);
    if (seen.has(ik)) continue;
    seen.add(ik);
    out.push(c);
  }
  out.sort((a, b) => b.savedAt - a.savedAt);
  return out;
}

export function mergeFeaturedFirst(
  featured: ProfileOption[],
  rest: ProfileOption[]
): ProfileOption[] {
  const seen = new Set<string>();
  const out: ProfileOption[] = [];
  for (const f of featured) {
    const ik = profileIdentityKey(f.config);
    if (seen.has(ik)) continue;
    seen.add(ik);
    out.push(f);
  }
  for (const r of rest) {
    const ik = profileIdentityKey(r.config);
    if (seen.has(ik)) continue;
    seen.add(ik);
    out.push(r);
  }
  return out;
}

function arenaOptionFromFeaturedApi(o: {
  key: string;
  label: string;
  config: EngineConfig;
  stats?: PersonaStats;
  savedAt: number;
}): ProfileOption {
  return {
    key: o.key,
    label: o.label || `${o.config.name}`,
    config: { ...o.config, featuredSeed: true },
    stats: o.stats,
    savedAt: o.savedAt,
  };
}

/** Champions déjà persistés (lecture base via API, sans import API chess). */
export async function fetchArenaChampionsFromDatabase(): Promise<
  ProfileOption[]
> {
  try {
    const res = await fetch("/api/arena/champions", {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      options?: {
        key: string;
        label: string;
        config: EngineConfig;
        stats: PersonaStats;
        savedAt: number;
      }[];
    };
    return (data.options ?? []).map(arenaOptionFromFeaturedApi);
  } catch {
    return [];
  }
}

export function featuredChampionsFromPool(
  pool: ProfileOption[]
): ProfileOption[] {
  return pool.filter((o) => isFeaturedChampionConfig(o.config));
}

/** Charge le pool Arène : champions en base + bibliothèque locale/cloud. */
export async function loadArenaProfilePool(labels: {
  savedProfiles: string;
  recentProfiles: string;
  cloudLibrary: string;
  featuredChampions: string;
}): Promise<ProfileOption[]> {
  const [local, cloud, dbChampions] = await Promise.all([
    Promise.resolve(
      buildRawOptions(labels.savedProfiles, labels.recentProfiles)
    ),
    fetchCloudArenaProfileOptions(labels.cloudLibrary),
    fetchArenaChampionsFromDatabase(),
  ]);

  const champions =
    dbChampions.length > 0
      ? dbChampions
      : featuredChampionsFromPool(cloud);

  const merged = mergeLocalAndCloud(local, cloud);
  return mergeFeaturedFirst(champions, merged);
}

export function filterByPlatform(
  options: ProfileOption[],
  platform: ProfilePlatformFilter
): ProfileOption[] {
  if (platform === "all") return options;
  return options.filter(
    (o) => normalizeEnginePlatform(o.config) === platform
  );
}

export function dedupeByIdentity(options: ProfileOption[]): ProfileOption[] {
  const map = new Map<string, ProfileOption>();
  for (const o of options) {
    const key = profileIdentityKey(o.config);
    const prev = map.get(key);
    if (!prev || o.savedAt >= prev.savedAt) map.set(key, o);
  }
  return Array.from(map.values()).sort((a, b) => b.savedAt - a.savedAt);
}

export function filterBySearch(options: ProfileOption[], q: string): ProfileOption[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return options;
  return options.filter((o) => {
    const name = (o.config.name || "").toLowerCase();
    return (
      o.label.toLowerCase().includes(needle) || name.includes(needle)
    );
  });
}
