/**
 * Fonctions de sauvegarde cloud avec Supabase
 */

import { supabase, isSupabaseConfigured, type DbProfile } from './supabase';
import { hasActivePremiumAccess } from './subscription-access';
import type { EngineConfig, PersonaStats } from './analysis';
import { getSavedConfigs } from './storage';

// Ré-exporter DbProfile pour faciliter les imports
export type { DbProfile } from './supabase';

/**
 * Interface pour une partie sauvegardée
 */
/**
 * Partie stockée pour l’utilisateur (Supabase). Pour corpus bulk / millions de parties,
 * voir [`game-sources`](./game-sources.ts) — ne pas utiliser cette ligne comme entrepôt analytique.
 */
export type GameKind = 'human_vs_bot' | 'arena_bot_vs_bot';

export interface DbGame {
  id: string;
  user_id: string;
  opponent_name: string;
  opponent_avatar?: string;
  opponent_platform?: string;
  result: 'win' | 'loss' | 'draw';
  result_type: string;
  result_message?: string;
  player_color: 'white' | 'black';
  pgn: string;
  final_fen: string;
  moves_count: number;
  duration_seconds?: number;
  captures_count?: number;
  checks_count?: number;
  best_eval?: number;
  worst_eval?: number;
  avg_eval?: number;
  created_at: string;
  updated_at: string;
  bot_config?: EngineConfig;
  /** Arène : deux profils moteur (blancs / noirs). */
  arena_configs?: { white: EngineConfig; black: EngineConfig };
  /** human_vs_bot (défaut) | arena_bot_vs_bot */
  game_kind?: GameKind;
  /** Optionnel : lien ou ID jeu distant — voir `DbGameExternalRef` dans game-sources.ts */
  external_game_id?: string;
  external_game_url?: string;
}

export function isArenaBotVsBotGame(game: Pick<DbGame, 'game_kind'>): boolean {
  return game.game_kind === 'arena_bot_vs_bot';
}

/**
 * Check if user has reached the free profile limit
 */
export async function getUserProfileCount(): Promise<number> {
  if (!isSupabaseConfigured || !supabase) return 0;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Check if user has premium status
 */
export async function checkPremiumStatus(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .single();

    return hasActivePremiumAccess(data?.plan, data?.status);
  } catch {
    return false;
  }
}

/**
 * Sauvegarder un profil dans le cloud
 */
export async function saveProfileToCloud(
  config: EngineConfig,
  stats: PersonaStats,
  isPublic: boolean = false
): Promise<DbProfile | null> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase non configuré');
    return null;
  }

  try {
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Erreur d\'authentification:', authError);
      throw new Error(`Erreur d'authentification: ${authError.message || JSON.stringify(authError)}`);
    }
    
    if (!user) {
      throw new Error('Utilisateur non authentifié. Veuillez vous connecter.');
    }

    // Check profile limit for free users
    const isPremium = await checkPremiumStatus();
    if (!isPremium) {
      const profileCount = await getUserProfileCount();
      if (profileCount >= 3) {
        throw new Error('PROFILE_LIMIT_REACHED');
      }
    }

    console.log('✅ Utilisateur authentifié:', user.id);
    console.log('📝 Tentative de sauvegarde:', {
      username: stats.username,
      platform: stats.platform || config.platform || 'lichess'
    });

    // Déterminer la plateforme depuis les stats ou config
    const detectedPlatform = stats.platform || config.platform || 'lichess';

    const configWithCreator = {
      ...config,
      creatorName: user.email?.split('@')[0] || 'unknown',
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        username: stats.username,
        platform: detectedPlatform,
        config: configWithCreator,
        stats: stats,
        is_public: isPublic,
      })
      .select('id, user_id, username, platform, config, stats, is_public, created_at, updated_at')
      .single();

    if (error) {
      console.error('❌ Erreur Supabase brute:', error);
      console.error('❌ Erreur stringifiée:', JSON.stringify(error, null, 2));
      console.error('❌ Type d\'erreur:', typeof error);
      console.error('❌ Clés de l\'objet erreur:', Object.keys(error));
      
      // Extraire le message d'erreur de différentes manières
      const errorMessage = 
        error.message || 
        (typeof error === 'string' ? error : null) ||
        'Erreur inconnue';
      
      throw new Error(`Erreur de sauvegarde: ${errorMessage}`);
    }

    console.log('✅ Profil sauvegardé avec succès:', data.id);
    return data;
  } catch (error: unknown) {
    console.error("❌ Exception capturée:", error);
    if (error instanceof Error) {
      console.error("❌ Message:", error.message);
      console.error("❌ Stack:", error.stack);
    }
    throw error;
  }
}

/**
 * Récupérer tous les profils de l'utilisateur
 */
export async function getUserProfiles(): Promise<DbProfile[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    return [];
  }
}

/**
 * Récupérer un profil par ID
 */
export async function getProfileById(id: string): Promise<DbProfile | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    return null;
  }
}

export type UpdateProfileResult = { success: true } | { success: false; error: string };

/**
 * Mettre à jour un profil.
 * Seules config, stats et is_public sont envoyées (avatar dans config.avatarUrl).
 */
export async function updateProfile(
  id: string,
  updates: Partial<Pick<DbProfile, 'config' | 'stats' | 'is_public'>>
): Promise<UpdateProfileResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase non configuré.' };
  }

  try {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.config !== undefined) updateData.config = updates.config;
    if (updates.stats !== undefined) updateData.stats = updates.stats;
    if (updates.is_public !== undefined) updateData.is_public = updates.is_public;

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Erreur Supabase updateProfile:', error);
      return { success: false, error: error.message || 'Erreur inconnue lors de la mise à jour.' };
    }

    return { success: true };
  } catch (e: unknown) {
    console.error("Exception updateProfile:", e);
    const msg = e instanceof Error ? e.message : "Erreur inconnue.";
    return { success: false, error: msg };
  }
}

/**
 * Supprimer un profil
 */
export async function deleteProfile(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    return false;
  }
}

/**
 * Récupérer les profils publics
 */
export async function getPublicProfiles(limit: number = 20): Promise<DbProfile[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des profils publics:', error);
    return [];
  }
}

/**
 * Rechercher des profils publics par nom d'utilisateur
 */
export async function searchPublicProfiles(query: string): Promise<DbProfile[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_public', true)
      .ilike('username', `%${query}%`)
      .limit(10);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    return [];
  }
}

/**
 * Options de filtrage et tri pour les profils
 */
export type ProfileFilter = 'all' | 'public' | 'private' | 'my';
export type ProfileSort = 'date' | 'elo' | 'name' | 'difficulty';
/** Filtre source Lichess / Chess.com dans la bibliothèque */
export type ProfilePlatformFilter = 'all' | 'lichess' | 'chesscom';

const DEDUPE_FETCH_CAP = 400;
const DEDUPE_MULTIPLIER = 6;

/**
 * Garde une entrée par couple (pseudo normalisé + plateforme), la plus récemment mise à jour.
 */
export function dedupeProfilesByUsernamePlatform(profiles: DbProfile[]): DbProfile[] {
  const best = new Map<string, DbProfile>();
  for (const p of profiles) {
    const key = `${p.username.trim().toLowerCase()}|${p.platform}`;
    const cur = best.get(key);
    const pTime = new Date(p.updated_at || p.created_at).getTime();
    if (!cur || pTime > new Date(cur.updated_at || cur.created_at).getTime()) {
      best.set(key, p);
    }
  }
  return Array.from(best.values());
}

export function sortProfilesClient(
  profiles: DbProfile[],
  sort: ProfileSort
): DbProfile[] {
  const out = [...profiles];
  switch (sort) {
    case 'date':
      out.sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      );
      break;
    case 'elo':
      out.sort((a, b) => (b.config?.elo ?? 0) - (a.config?.elo ?? 0));
      break;
    case 'name':
      out.sort((a, b) =>
        a.username.localeCompare(b.username, undefined, { sensitivity: 'base' })
      );
      break;
    case 'difficulty':
      out.sort(
        (a, b) => (b.config?.difficulty ?? 0) - (a.config?.difficulty ?? 0)
      );
      break;
  }
  return out;
}

export interface GetFilteredProfilesOptions {
  /** Lichess uniquement, Chess.com uniquement, ou les deux */
  platform?: ProfilePlatformFilter;
  /**
   * Une seule carte par pseudo + plateforme (entrée la plus récente).
   * Demande un échantillon plus large côté API puis réduit en mémoire.
   */
  dedupeByUsernamePlatform?: boolean;
}

/**
 * Récupérer et filtrer les profils avec options de tri
 */
export async function getFilteredProfiles(
  filter: ProfileFilter = 'public',
  sort: ProfileSort = 'date',
  limit: number = 50,
  searchQuery?: string,
  options?: GetFilteredProfilesOptions
): Promise<DbProfile[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const platform = options?.platform ?? 'all';
  const dedupe = options?.dedupeByUsernamePlatform === true;
  const effectiveLimit = Math.min(Math.max(5, limit), 200);
  const fetchLimit = dedupe
    ? Math.min(DEDUPE_FETCH_CAP, effectiveLimit * DEDUPE_MULTIPLIER)
    : effectiveLimit;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase.from('profiles').select('*');

    // Appliquer le filtre
    switch (filter) {
      case 'public':
        query = query.eq('is_public', true);
        break;
      case 'private':
        query = query.eq('is_public', false);
        if (user) {
          query = query.eq('user_id', user.id);
        }
        break;
      case 'my':
        if (user) {
          query = query.eq('user_id', user.id);
        } else {
          return [];
        }
        break;
      case 'all':
        // Tous les profils publics + les profils privés de l'utilisateur
        if (user) {
          query = query.or(`is_public.eq.true,user_id.eq.${user.id}`);
        } else {
          query = query.eq('is_public', true);
        }
        break;
    }

    if (platform !== 'all') {
      query = query.eq('platform', platform);
    }

    // Appliquer la recherche si fournie
    if (searchQuery && searchQuery.trim()) {
      query = query.ilike('username', `%${searchQuery.trim()}%`);
    }

    // Appliquer le tri
    switch (sort) {
      case 'date':
        query = query.order('created_at', { ascending: false });
        break;
      case 'elo':
        // Tri par ELO (depuis config->elo)
        query = query.order('config->elo', { ascending: false });
        break;
      case 'name':
        query = query.order('username', { ascending: true });
        break;
      case 'difficulty':
        // Tri par difficulté (depuis config->difficulty)
        query = query.order('config->difficulty', { ascending: false });
        break;
    }

    query = query.limit(fetchLimit);

    const { data, error } = await query;

    if (error) throw error;

    let rows = data || [];
    if (dedupe) {
      rows = dedupeProfilesByUsernamePlatform(rows);
      rows = sortProfilesClient(rows, sort);
      rows = rows.slice(0, effectiveLimit);
    }

    return rows;
  } catch (error) {
    console.error('Erreur lors de la récupération filtrée:', error);
    return [];
  }
}

/**
 * Migrer les profils localStorage vers Supabase
 */
export async function migrateLocalToCloud(): Promise<number> {
  if (!isSupabaseConfigured || !supabase) return 0;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Récupérer les profils locaux
    const localConfigs = getSavedConfigs();
    
    let migrated = 0;
    
    for (const saved of localConfigs) {
      // Vérifier si le profil existe déjà
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('username', saved.config.name)
        .single();

      if (!existing) {
        // Créer des stats minimales depuis la config
        const stats: PersonaStats = {
          username: saved.config.name,
          gameCount: 0,
          winRate: 50,
          drawRate: 25,
          lossRate: 25,
          avgMoves: 40,
          style: "Équilibré",
          topOpenings: [],
        };

        const result = await saveProfileToCloud(saved.config, stats, false);
        if (result) migrated++;
      }
    }

    return migrated;
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    return 0;
  }
}

/**
 * Vérifier si l'utilisateur est authentifié
 */
export async function isAuthenticated(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

/**
 * Obtenir l'utilisateur courant
 */
export async function getCurrentUser() {
  if (!isSupabaseConfigured || !supabase) return null;
  
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Sauvegarder une partie dans le cloud
 */
export async function saveGameToCloud(gameData: {
  opponentName: string;
  opponentAvatar?: string;
  opponentPlatform?: string;
  result: 'win' | 'loss' | 'draw';
  resultType: string;
  resultMessage?: string;
  playerColor: 'white' | 'black';
  pgn: string;
  finalFen: string;
  movesCount: number;
  durationSeconds?: number;
  capturesCount?: number;
  checksCount?: number;
  bestEval?: number;
  worstEval?: number;
  avgEval?: number;
  botConfig?: EngineConfig;
  gameKind?: GameKind;
  arenaConfigs?: { white: EngineConfig; black: EngineConfig };
}): Promise<DbGame | null> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase non configuré');
    return null;
  }

  try {
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Utilisateur non authentifié');
      return null;
    }

    // Insérer la partie
    const { data, error } = await supabase
      .from('games')
      .insert({
        user_id: user.id,
        opponent_name: gameData.opponentName,
        opponent_avatar: gameData.opponentAvatar,
        opponent_platform: gameData.opponentPlatform,
        result: gameData.result,
        result_type: gameData.resultType,
        result_message: gameData.resultMessage,
        player_color: gameData.playerColor,
        pgn: gameData.pgn,
        final_fen: gameData.finalFen,
        moves_count: gameData.movesCount,
        duration_seconds: gameData.durationSeconds,
        captures_count: gameData.capturesCount,
        checks_count: gameData.checksCount,
        best_eval: gameData.bestEval,
        worst_eval: gameData.worstEval,
        avg_eval: gameData.avgEval,
        bot_config: gameData.botConfig,
        game_kind: gameData.gameKind ?? 'human_vs_bot',
        arena_configs: gameData.arenaConfigs ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la sauvegarde de la partie:', error);
      throw new Error(`Erreur de sauvegarde: ${error.message}`);
    }

    console.log('✅ Partie sauvegardée avec succès:', data.id);
    return data as DbGame;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    throw error;
  }
}

/**
 * Récupérer toutes les parties de l'utilisateur
 */
export async function getUserGames(limit?: number): Promise<DbGame[]> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase non configuré');
    return [];
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return [];
    }

    let query = supabase
      .from('games')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur lors de la récupération des parties:', error);
      return [];
    }

    return (data || []) as DbGame[];
  } catch (error) {
    console.error('Erreur:', error);
    return [];
  }
}

/**
 * Supprimer une partie
 */
export async function deleteGame(gameId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId);

    if (error) {
      console.error('Erreur lors de la suppression:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur:', error);
    return false;
  }
}

/**
 * Obtenir les statistiques globales des parties
 */
export async function getGamesStats(): Promise<{
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { total: 0, wins: 0, losses: 0, draws: 0, winRate: 0 };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { total: 0, wins: 0, losses: 0, draws: 0, winRate: 0 };
    }

    const { data, error } = await supabase
      .from('games')
      .select('result, game_kind')
      .eq('user_id', user.id);

    if (error || !data) {
      return { total: 0, wins: 0, losses: 0, draws: 0, winRate: 0 };
    }

    const rows = data.filter(
      (g: { game_kind?: string | null }) =>
        (g.game_kind ?? 'human_vs_bot') !== 'arena_bot_vs_bot'
    );

    const total = rows.length;
    const wins = rows.filter((g: { result: string }) => g.result === 'win').length;
    const losses = rows.filter((g: { result: string }) => g.result === 'loss').length;
    const draws = rows.filter((g: { result: string }) => g.result === 'draw').length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;

    return { total, wins, losses, draws, winRate };
  } catch (error) {
    console.error('Erreur:', error);
    return { total: 0, wins: 0, losses: 0, draws: 0, winRate: 0 };
  }
}
