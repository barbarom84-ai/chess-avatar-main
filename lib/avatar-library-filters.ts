import type { EngineConfig } from "@/lib/analysis";
import type { DbProfile } from "@/lib/supabase";

export type AvatarLibraryPlatformFilter = "all" | "lichess" | "chesscom";
export type AvatarLibraryPlayStyleFilter = "all" | EngineConfig["playStyle"];
export type AvatarLibrarySort = "elo_desc" | "elo_asc" | "name_asc" | "difficulty_desc";
export type AvatarLibraryVisibilityFilter = "all" | "public" | "private";

export type AvatarLibraryFilterState = {
  search: string;
  platform: AvatarLibraryPlatformFilter;
  playStyle: AvatarLibraryPlayStyleFilter;
  sort: AvatarLibrarySort;
  visibility?: AvatarLibraryVisibilityFilter;
};

function profileSearchHaystack(p: DbProfile): string {
  const parts = [
    p.username,
    p.config.name,
    p.config.favoriteOpening,
    p.config.playStyle,
    String(p.config.elo),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function filterAvatarProfiles(
  profiles: DbProfile[],
  state: AvatarLibraryFilterState
): DbProfile[] {
  const needle = state.search.trim().toLowerCase();
  let out = profiles.filter((p) => {
    if (needle && !profileSearchHaystack(p).includes(needle)) return false;
    if (state.platform !== "all" && p.platform !== state.platform) return false;
    if (state.playStyle !== "all" && p.config.playStyle !== state.playStyle) {
      return false;
    }
    if (state.visibility === "public" && !p.is_public) return false;
    if (state.visibility === "private" && p.is_public) return false;
    return true;
  });

  out = [...out].sort((a, b) => {
    switch (state.sort) {
      case "elo_asc":
        return a.config.elo - b.config.elo;
      case "name_asc": {
        const na = (a.config.name || a.username).toLowerCase();
        const nb = (b.config.name || b.username).toLowerCase();
        return na.localeCompare(nb);
      }
      case "difficulty_desc":
        return b.config.difficulty - a.config.difficulty || b.config.elo - a.config.elo;
      case "elo_desc":
      default:
        return b.config.elo - a.config.elo;
    }
  });

  return out;
}
