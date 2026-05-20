import type { EngineConfig, PersonaStats } from "@/lib/analysis";
import {
  featuredOptionsAreFresh,
  loadFeaturedProfilesFromDatabase,
  persistFeaturedProfiles,
} from "@/lib/arena-featured-persist";
import {
  fetchAllFeaturedTopPlayers,
  type TopPlayerEntry,
} from "@/lib/leaderboard-top-players";
import { importPlayerProfile } from "@/lib/server-import-player";
import { mapWithConcurrency } from "@/lib/fetch-concurrency";

export type ArenaFeaturedOption = {
  key: string;
  label: string;
  config: EngineConfig;
  stats: PersonaStats;
  savedAt: number;
  platform: "lichess" | "chesscom";
  leaderboardRating?: number;
};

const FEATURED_TTL_MS = 6 * 60 * 60 * 1000;

type FeaturedCacheEntry = {
  options: ArenaFeaturedOption[];
  expiresAt: number;
  source: "database" | "import";
};

let memoryCache: FeaturedCacheEntry | null = null;

function entryLabel(
  entry: TopPlayerEntry,
  platform: "lichess" | "chesscom",
  suffix: string
): string {
  const title = entry.title ? ` ${entry.title}` : "";
  const rating =
    entry.rating != null ? ` · ${entry.rating} ELO` : "";
  return `${entry.username}${title}${rating} (${suffix})`;
}

async function importTopList(
  entries: TopPlayerEntry[],
  platform: "lichess" | "chesscom",
  suffix: string
): Promise<ArenaFeaturedOption[]> {
  const results = await mapWithConcurrency(entries, 2, async (entry) => {
    const imported = await importPlayerProfile(entry.username, platform);
    if (!imported) return null;
    return {
      key: `featured:${platform}:${entry.username.toLowerCase()}`,
      label: entryLabel(entry, platform, suffix),
      config: imported.config,
      stats: imported.stats,
      savedAt: Date.now(),
      platform,
      leaderboardRating: entry.rating,
    } satisfies ArenaFeaturedOption;
  });

  const out: ArenaFeaturedOption[] = [];
  for (const r of results) {
    if (r) out.push(r);
  }
  return out;
}

export async function buildArenaFeaturedOptions(
  lichessSuffix: string,
  chesscomSuffix: string
): Promise<ArenaFeaturedOption[]> {
  const { lichess, chesscom } = await fetchAllFeaturedTopPlayers();

  const [lichessOpts, chessOpts] = await Promise.all([
    importTopList(lichess, "lichess", lichessSuffix),
    importTopList(chesscom, "chesscom", chesscomSuffix),
  ]);

  return [...lichessOpts, ...chessOpts];
}

function identityKey(platform: string, username: string): string {
  return `${username.trim().toLowerCase()}|${platform}`;
}

async function importMissingTops(
  dbOptions: ArenaFeaturedOption[],
  lichessSuffix: string,
  chesscomSuffix: string
): Promise<ArenaFeaturedOption[]> {
  const { lichess, chesscom } = await fetchAllFeaturedTopPlayers();
  const have = new Set(
    dbOptions.map((o) =>
      identityKey(o.platform, o.stats.username || o.config.name)
    )
  );

  const missingLichess = lichess.filter(
    (e) => !have.has(identityKey("lichess", e.username))
  );
  const missingChess = chesscom.filter(
    (e) => !have.has(identityKey("chesscom", e.username))
  );

  const [addedLichess, addedChess] = await Promise.all([
    importTopList(missingLichess, "lichess", lichessSuffix),
    importTopList(missingChess, "chesscom", chesscomSuffix),
  ]);

  return [...dbOptions, ...addedLichess, ...addedChess];
}

async function finalizeWithDatabase(
  imported: ArenaFeaturedOption[],
  lichessSuffix: string,
  chesscomSuffix: string,
  sessionUserId?: string | null
): Promise<{
  options: ArenaFeaturedOption[];
  persist: Awaited<ReturnType<typeof persistFeaturedProfiles>>;
}> {
  const persist = await persistFeaturedProfiles(imported, sessionUserId);
  const fromDb = await loadFeaturedProfilesFromDatabase(
    lichessSuffix,
    chesscomSuffix
  );
  if (fromDb.length > 0) {
    return { options: fromDb, persist };
  }
  return { options: imported, persist };
}

export type ArenaFeaturedLoadResult = {
  options: ArenaFeaturedOption[];
  source: "database" | "import";
  persist: Awaited<ReturnType<typeof persistFeaturedProfiles>> | null;
};

export async function loadArenaFeaturedOptions(
  lichessSuffix: string,
  chesscomSuffix: string,
  forceRefresh = false,
  sessionUserId?: string | null
): Promise<ArenaFeaturedLoadResult> {
  if (
    !forceRefresh &&
    memoryCache &&
    Date.now() < memoryCache.expiresAt &&
    memoryCache.source === "database"
  ) {
    return {
      options: memoryCache.options,
      source: "database",
      persist: null,
    };
  }

  const fromDb = await loadFeaturedProfilesFromDatabase(
    lichessSuffix,
    chesscomSuffix
  );

  if (!forceRefresh && featuredOptionsAreFresh(fromDb)) {
    memoryCache = {
      options: fromDb,
      expiresAt: Date.now() + FEATURED_TTL_MS,
      source: "database",
    };
    return { options: fromDb, source: "database", persist: null };
  }

  let imported: ArenaFeaturedOption[];
  if (fromDb.length > 0 && !forceRefresh) {
    imported = await importMissingTops(fromDb, lichessSuffix, chesscomSuffix);
  } else {
    imported = await buildArenaFeaturedOptions(lichessSuffix, chesscomSuffix);
  }

  const { options, persist } = await finalizeWithDatabase(
    imported,
    lichessSuffix,
    chesscomSuffix,
    sessionUserId
  );

  const source = options.some((o) => o.key.startsWith("cloud:"))
    ? "database"
    : "import";

  memoryCache = {
    options,
    expiresAt: Date.now() + FEATURED_TTL_MS,
    source,
  };

  return { options, source, persist };
}

/** @deprecated Utiliser loadArenaFeaturedOptions */
export async function getCachedArenaFeaturedOptions(
  lichessSuffix: string,
  chesscomSuffix: string,
  forceRefresh = false,
  sessionUserId?: string | null
): Promise<ArenaFeaturedOption[]> {
  const { options } = await loadArenaFeaturedOptions(
    lichessSuffix,
    chesscomSuffix,
    forceRefresh,
    sessionUserId
  );
  return options;
}

export function clearArenaFeaturedCache(): void {
  memoryCache = null;
}
