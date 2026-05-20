import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { EngineConfig, PersonaStats } from "@/lib/analysis";
import type { ArenaFeaturedOption } from "@/lib/arena-featured-profiles";

const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const CHAMPIONS_CREATOR = "ChessAvatar Champions";

export type FeaturedPersistResult = {
  inserted: number;
  updated: number;
  skipped: number;
  ownerId: string | null;
  errors: string[];
};

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isFeaturedChampionConfig(config: unknown): config is EngineConfig {
  if (typeof config !== "object" || config === null) return false;
  const c = config as EngineConfig;
  return (
    c.featuredSeed === true ||
    c.creatorName === CHAMPIONS_CREATOR
  );
}

/** UUID propriétaire des bots publics (env → base → session connectée). */
export async function resolveFeaturedSeedOwnerId(
  client: SupabaseClient,
  sessionUserId?: string | null
): Promise<string | null> {
  const fromEnv = process.env.FEATURED_PROFILE_SEED_USER_ID?.trim() ?? "";
  if (fromEnv) return fromEnv;

  const { data, error } = await client
    .from("profiles")
    .select("user_id, config")
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(40);

  if (!error && data?.length) {
    for (const row of data) {
      if (isFeaturedChampionConfig(row.config)) {
        return row.user_id;
      }
    }
  }

  const session = sessionUserId?.trim();
  if (session) return session;

  return null;
}

export function getArenaChampionsSetupHints(sessionUserId?: string | null): {
  hasServiceRole: boolean;
  hasSeedEnv: boolean;
  sessionUserId: string | null;
  canPersist: boolean;
  hintFr: string;
  hintEn: string;
} {
  const hasServiceRole = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
  const hasSeedEnv = Boolean(
    process.env.FEATURED_PROFILE_SEED_USER_ID?.trim()
  );
  const session = sessionUserId?.trim() || null;
  const canPersist = hasServiceRole && (hasSeedEnv || Boolean(session));

  let hintFr: string;
  let hintEn: string;

  if (!hasServiceRole) {
    hintFr =
      "Ajoutez SUPABASE_SERVICE_ROLE_KEY dans .env.local (Supabase → Settings → API → service_role), redémarrez le serveur, puis Synchroniser.";
    hintEn =
      "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase → Settings → API → service_role), restart the dev server, then Sync.";
  } else if (!hasSeedEnv && !session) {
    hintFr =
      "Connectez-vous sur le site, puis cliquez Synchroniser (les champions seront enregistrés sur votre compte, publics). Ou ajoutez FEATURED_PROFILE_SEED_USER_ID dans .env.local.";
    hintEn =
      "Sign in, then click Sync (champions save to your account as public). Or set FEATURED_PROFILE_SEED_USER_ID in .env.local.";
  } else if (!hasSeedEnv && session) {
    hintFr =
      "Première sync : les champions seront créés sur votre compte en profils publics. Pour un compte dédié, copiez votre UUID ci-dessous dans FEATURED_PROFILE_SEED_USER_ID.";
    hintEn =
      "First sync saves champions to your account as public profiles. For a dedicated owner, copy your UUID into FEATURED_PROFILE_SEED_USER_ID.";
  } else {
    hintFr =
      "Cliquez Synchroniser pour importer les tops (1–2 min). Les profils restent en bibliothèque publique.";
    hintEn = "Click Sync to import top players (1–2 min). Profiles stay in the public library.";
  }

  return {
    hasServiceRole,
    hasSeedEnv,
    sessionUserId: session,
    canPersist,
    hintFr,
    hintEn,
  };
}

function rowToOption(
  row: {
    id: string;
    username: string;
    platform: "lichess" | "chesscom";
    config: EngineConfig;
    stats: PersonaStats;
    updated_at: string;
  },
  suffix: string
): ArenaFeaturedOption {
  const config = {
    ...row.config,
    featuredSeed: true,
    creatorName: CHAMPIONS_CREATOR,
  };
  const rating = config.elo != null ? ` · ${config.elo} ELO` : "";
  return {
    key: `cloud:${row.id}`,
    label: `${row.username}${rating} (${suffix})`,
    config,
    stats: row.stats,
    savedAt: new Date(row.updated_at).getTime(),
    platform: row.platform,
    leaderboardRating: config.elo,
  };
}

/** Champions publics déjà en base (service role, tous comptes). */
export async function loadFeaturedProfilesFromDatabase(
  lichessSuffix: string,
  chesscomSuffix: string
): Promise<ArenaFeaturedOption[]> {
  const client = adminClient();
  if (!client) return [];

  const { data, error } = await client
    .from("profiles")
    .select("id, username, platform, config, stats, updated_at, is_public")
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(120);

  if (error) {
    console.error("[arena-featured] load DB:", error.message);
    return [];
  }
  if (!data?.length) return [];

  const out: ArenaFeaturedOption[] = [];
  const seen = new Set<string>();

  for (const row of data) {
    if (!isFeaturedChampionConfig(row.config)) continue;
    const ik = `${row.platform}|${(row.username || "").toLowerCase()}`;
    if (seen.has(ik)) continue;
    seen.add(ik);
    const suffix =
      row.platform === "lichess" ? lichessSuffix : chesscomSuffix;
    out.push(
      rowToOption(
        {
          id: row.id,
          username: row.username,
          platform: row.platform,
          config: row.config as EngineConfig,
          stats: row.stats as PersonaStats,
          updated_at: row.updated_at,
        },
        suffix
      )
    );
  }
  out.sort((a, b) => b.savedAt - a.savedAt);
  return out;
}

export function featuredOptionsAreFresh(
  options: ArenaFeaturedOption[],
  minCount = 8
): boolean {
  if (options.length < minCount) return false;
  const oldest = Math.min(...options.map((o) => o.savedAt));
  return Date.now() - oldest < STALE_MS;
}

async function upsertForOwner(
  client: SupabaseClient,
  ownerId: string,
  opt: ArenaFeaturedOption,
  errors: string[]
): Promise<"inserted" | "updated" | "skipped"> {
  const username = (opt.stats.username || opt.config.name || "").trim();
  if (!username) return "skipped";

  const { data: existing, error: lookupError } = await client
    .from("profiles")
    .select("id")
    .eq("username", username)
    .eq("platform", opt.platform)
    .eq("user_id", ownerId)
    .maybeSingle();

  if (lookupError) {
    errors.push(`${username}: lookup ${lookupError.message}`);
    return "skipped";
  }

  const payload = {
    user_id: ownerId,
    username,
    platform: opt.platform,
    config: {
      ...opt.config,
      featuredSeed: true,
      creatorName: CHAMPIONS_CREATOR,
    },
    stats: opt.stats,
    is_public: true,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await client
      .from("profiles")
      .update(payload)
      .eq("id", existing.id);
    if (error) {
      errors.push(`${username}: update ${error.message}`);
      return "skipped";
    }
    return "updated";
  }

  const { error } = await client.from("profiles").insert(payload);
  if (error) {
    errors.push(`${username}: insert ${error.message}`);
    return "skipped";
  }
  return "inserted";
}

/** Upsert public (compte seed global ou utilisateur connecté en secours). */
export async function persistFeaturedProfiles(
  options: ArenaFeaturedOption[],
  sessionUserId?: string | null
): Promise<FeaturedPersistResult> {
  const client = adminClient();
  const errors: string[] = [];

  if (!client) {
    return {
      inserted: 0,
      updated: 0,
      skipped: options.length,
      ownerId: null,
      errors: ["SUPABASE_SERVICE_ROLE_KEY manquant — impossible d’écrire en base."],
    };
  }

  const ownerId = await resolveFeaturedSeedOwnerId(client, sessionUserId);
  if (!ownerId) {
    const hints = getArenaChampionsSetupHints(sessionUserId);
    return {
      inserted: 0,
      updated: 0,
      skipped: options.length,
      ownerId: null,
      errors: [hints.hintFr],
    };
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const opt of options) {
    const result = await upsertForOwner(client, ownerId, opt, errors);
    if (result === "inserted") inserted++;
    else if (result === "updated") updated++;
    else skipped++;
  }

  return { inserted, updated, skipped, ownerId, errors };
}
