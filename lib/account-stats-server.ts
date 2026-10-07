import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountStats } from "@/lib/account-types";
import {
  computeAccountStats,
  type StatsAscensionInput,
  type StatsGameRow,
  type StatsLeagueInput,
  type StatsPvpRow,
} from "@/lib/account-stats";

const MAX_ROWS = 2000;
const DEFAULT_LEAGUE_NAME = "Open League";

/** Clamp the browser offset to a real timezone range (UTC-14 … UTC+12). */
export function parseTzOffset(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-840, Math.min(720, Math.round(n)));
}

async function loadGames(sb: SupabaseClient, userId: string): Promise<StatsGameRow[]> {
  const { data, error } = await sb
    .from("games")
    .select("id, result, player_color, opponent_name, duration_seconds, moves_count, created_at, game_kind, result_type")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  if (error || !Array.isArray(data)) return [];
  return data as StatsGameRow[];
}

async function loadPvpGames(sb: SupabaseClient, userId: string): Promise<StatsPvpRow[]> {
  const { data, error } = await sb
    .from("pvp_games")
    .select("id, white_user_id, black_user_id, result, time_preset, white_display_name, black_display_name, created_at, updated_at")
    .eq("status", "finished")
    .or(`white_user_id.eq.${userId},black_user_id.eq.${userId}`)
    .order("updated_at", { ascending: false })
    .limit(MAX_ROWS);
  if (error || !Array.isArray(data)) return [];
  return data as StatsPvpRow[];
}

async function countRows(sb: SupabaseClient, table: string, userId: string): Promise<number> {
  const { count, error } = await sb
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return error || typeof count !== "number" ? 0 : count;
}

async function loadAscension(sb: SupabaseClient, userId: string): Promise<StatsAscensionInput | null> {
  const [card, puzzlesSolved] = await Promise.all([
    sb.from("player_champion_cards").select("tier, elo, xp").eq("user_id", userId).maybeSingle(),
    countRows(sb, "player_puzzle_completions", userId),
  ]);
  const row = card.data as { tier?: string | null; elo?: number | null; xp?: number | null } | null;
  if (card.error || !row) return null;
  return { tier: row.tier ?? null, elo: row.elo ?? null, xp: row.xp ?? null, puzzlesSolved };
}

async function loadLeague(sb: SupabaseClient, userId: string): Promise<StatsLeagueInput | null> {
  const { data: league } = await sb
    .from("pvp_leagues")
    .select("id")
    .eq("name", DEFAULT_LEAGUE_NAME)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const leagueId = (league as { id?: string } | null)?.id;
  if (!leagueId) return null;

  const { data: standing } = await sb
    .from("pvp_league_standings")
    .select("rating, wins, losses, draws")
    .eq("league_id", leagueId)
    .eq("user_id", userId)
    .maybeSingle();
  const row = standing as { rating?: number | null; wins?: number | null; losses?: number | null; draws?: number | null } | null;
  if (!row) return null;
  const rating = row.rating ?? 1200;

  const { count } = await sb
    .from("pvp_league_standings")
    .select("*", { count: "exact", head: true })
    .eq("league_id", leagueId)
    .gt("rating", rating);

  return {
    rating,
    rank: (typeof count === "number" ? count : 0) + 1,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    draws: row.draws ?? 0,
  };
}

export async function buildAccountStats(
  sb: SupabaseClient,
  userId: string,
  tzOffsetMinutes: number,
  now = new Date()
): Promise<AccountStats> {
  const [games, pvpGames, avatars, ascension, league] = await Promise.all([
    loadGames(sb, userId),
    loadPvpGames(sb, userId),
    countRows(sb, "profiles", userId),
    loadAscension(sb, userId),
    loadLeague(sb, userId),
  ]);
  return computeAccountStats({ userId, games, pvpGames, avatars, ascension, league, now, tzOffsetMinutes });
}
