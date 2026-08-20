import { supabase, isSupabaseConfigured } from "./supabase";

export interface PvpTournament {
  id: string;
  name: string;
  description: string;
  status: "registration" | "active" | "completed" | "cancelled";
  max_players: number;
  time_control_ms: number;
  increment_ms: number;
  starts_at: string | null;
  created_at: string;
  player_count?: number;
}

export interface PvpLeagueStanding {
  user_id: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

export async function listTournaments(): Promise<PvpTournament[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("pvp_tournaments")
    .select("*, pvp_tournament_players(count)")
    .in("status", ["registration", "active"])
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    ...(row as PvpTournament),
    player_count: (row as { pvp_tournament_players?: { count: number }[] })
      .pvp_tournament_players?.[0]?.count ?? 0,
  }));
}

export async function joinTournament(tournamentId: string, displayName?: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from("pvp_tournament_players").insert({
    tournament_id: tournamentId,
    user_id: user.id,
    display_name: displayName ?? user.email?.split("@")[0] ?? "Player",
  });
  return !error;
}

export async function getLeagueStandings(leagueId: string): Promise<PvpLeagueStanding[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("pvp_league_standings")
    .select("user_id, rating, wins, losses, draws")
    .eq("league_id", leagueId)
    .order("rating", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data as PvpLeagueStanding[];
}

export async function getDefaultLeagueId(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase
    .from("pvp_leagues")
    .select("id")
    .eq("name", "Open League")
    .maybeSingle();
  return data?.id ?? null;
}
