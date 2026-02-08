import { supabase, isSupabaseConfigured } from './supabase';
import type { 
  ProfileMetadata, 
  FavoriteOpening, 
  PlayingStyle 
} from '@/types/chess';

// ========================================
// Fonctions pour ProfileMetadata
// ========================================

/**
 * Récupérer les métadonnées d'un profil
 */
export async function getProfileMetadata(profileId: string): Promise<ProfileMetadata | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from('profile_metadata')
      .select('*')
      .eq('profile_id', profileId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Pas de métadonnées, retourner null
        return null;
      }
      throw error;
    }

    // Transformer snake_case en camelCase
    return {
      id: data.id,
      profileId: data.profile_id,
      userId: data.user_id,
      biography: data.biography,
      notes: data.notes,
      tags: data.tags || [],
      playingStyle: {
        aggression: data.style_aggression || 50,
        tactical: data.style_tactical || 50,
        positional: data.style_positional || 50,
        endgame: data.style_endgame || 50,
        openingTheory: data.style_opening_theory || 50,
        timeManagement: data.style_time_management || 50
      },
      strengths: data.strengths || [],
      weaknesses: data.weaknesses || [],
      gamesPlayed: data.games_played || 0,
      lastPlayedAt: data.last_played_at,
      aiSummary: data.ai_summary,
      aiStyleDescription: data.ai_style_description,
      aiConfidence: data.ai_confidence,
      aiUpdatedAt: data.ai_updated_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des métadonnées:', error);
    return null;
  }
}

/**
 * Sauvegarder ou mettre à jour les métadonnées d'un profil
 */
export async function saveProfileMetadata(
  profileId: string,
  metadata: Partial<ProfileMetadata>
): Promise<ProfileMetadata | null> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase non configuré');
    return null;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non authentifié');

    // Vérifier si des métadonnées existent déjà
    const existing = await getProfileMetadata(profileId);

    // Préparer les données au format snake_case
    const dbData: any = {
      profile_id: profileId,
      user_id: user.id
    };

    if (metadata.biography !== undefined) dbData.biography = metadata.biography;
    if (metadata.notes !== undefined) dbData.notes = metadata.notes;
    if (metadata.tags !== undefined) dbData.tags = metadata.tags;
    if (metadata.strengths !== undefined) dbData.strengths = metadata.strengths;
    if (metadata.weaknesses !== undefined) dbData.weaknesses = metadata.weaknesses;
    
    if (metadata.playingStyle) {
      dbData.style_aggression = metadata.playingStyle.aggression;
      dbData.style_tactical = metadata.playingStyle.tactical;
      dbData.style_positional = metadata.playingStyle.positional;
      dbData.style_endgame = metadata.playingStyle.endgame;
      dbData.style_opening_theory = metadata.playingStyle.openingTheory;
      dbData.style_time_management = metadata.playingStyle.timeManagement;
    }

    if (metadata.gamesPlayed !== undefined) dbData.games_played = metadata.gamesPlayed;
    if (metadata.lastPlayedAt !== undefined) dbData.last_played_at = metadata.lastPlayedAt;
    if (metadata.aiSummary !== undefined) dbData.ai_summary = metadata.aiSummary;
    if (metadata.aiStyleDescription !== undefined) dbData.ai_style_description = metadata.aiStyleDescription;
    if (metadata.aiConfidence !== undefined) dbData.ai_confidence = metadata.aiConfidence;
    if (metadata.aiUpdatedAt !== undefined) dbData.ai_updated_at = metadata.aiUpdatedAt;

    let result;
    
    if (existing) {
      // Mise à jour
      const { data, error } = await supabase
        .from('profile_metadata')
        .update(dbData)
        .eq('profile_id', profileId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insertion
      const { data, error } = await supabase
        .from('profile_metadata')
        .insert(dbData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Retourner au format camelCase
    return getProfileMetadata(profileId);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des métadonnées:', error);
    return null;
  }
}

// ========================================
// Fonctions pour FavoriteOpenings
// ========================================

/**
 * Récupérer les ouvertures favorites d'un profil
 */
export async function getFavoriteOpenings(profileId: string): Promise<FavoriteOpening[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('favorite_openings')
      .select('*')
      .eq('profile_id', profileId)
      .order('preference_order', { ascending: true });

    if (error) throw error;

    return (data || []).map(opening => ({
      id: opening.id,
      profileId: opening.profile_id,
      name: opening.name,
      eco: opening.eco,
      description: opening.description,
      winRate: opening.win_rate,
      gamesPlayed: opening.games_played,
      preferenceOrder: opening.preference_order,
      createdAt: opening.created_at
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des ouvertures:', error);
    return [];
  }
}

/**
 * Ajouter une ouverture favorite
 */
export async function addFavoriteOpening(
  profileId: string,
  opening: Omit<FavoriteOpening, 'id' | 'profileId' | 'createdAt'>
): Promise<FavoriteOpening | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from('favorite_openings')
      .insert({
        profile_id: profileId,
        name: opening.name,
        eco: opening.eco,
        description: opening.description,
        win_rate: opening.winRate,
        games_played: opening.gamesPlayed,
        preference_order: opening.preferenceOrder || 0
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      profileId: data.profile_id,
      name: data.name,
      eco: data.eco,
      description: data.description,
      winRate: data.win_rate,
      gamesPlayed: data.games_played,
      preferenceOrder: data.preference_order,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'ouverture:', error);
    return null;
  }
}

/**
 * Supprimer une ouverture favorite
 */
export async function deleteFavoriteOpening(openingId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const { error } = await supabase
      .from('favorite_openings')
      .delete()
      .eq('id', openingId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'ouverture:', error);
    return false;
  }
}

/**
 * Mettre à jour l'ordre des ouvertures favorites
 */
export async function reorderFavoriteOpenings(
  openings: { id: string; preferenceOrder: number }[]
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    // Mise à jour par batch
    const updates = openings.map(({ id, preferenceOrder }) => {
      if (!supabase) return Promise.resolve();
      return supabase
        .from('favorite_openings')
        .update({ preference_order: preferenceOrder })
        .eq('id', id);
    });

    await Promise.all(updates);
    return true;
  } catch (error) {
    console.error('Erreur lors de la réorganisation des ouvertures:', error);
    return false;
  }
}

// ========================================
// Utilitaires
// ========================================

/**
 * Créer un style de jeu par défaut
 */
export function createDefaultPlayingStyle(): PlayingStyle {
  return {
    aggression: 50,
    tactical: 50,
    positional: 50,
    endgame: 50,
    openingTheory: 50,
    timeManagement: 50
  };
}

/**
 * Valider un style de jeu (0-100 pour chaque attribut)
 */
export function validatePlayingStyle(style: PlayingStyle): boolean {
  const values = Object.values(style);
  return values.every(v => v >= 0 && v <= 100);
}
