import { createClient } from '@supabase/supabase-js';
import type { EngineConfig, PersonaStats } from '@/lib/analysis';

// Configuration Supabase
// Ces valeurs doivent être dans les variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Vérifier si Supabase est configuré
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Client Supabase singleton (null si non configuré)
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Types pour la base de données
export interface DbProfile {
  id: string;
  user_id: string;
  username: string;
  platform: 'lichess' | 'chesscom';
  config: EngineConfig;
  stats: PersonaStats;
  is_public: boolean;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUser {
  id: string;
  email: string;
  created_at: string;
}
