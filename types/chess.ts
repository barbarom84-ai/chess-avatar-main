// Interface pour une partie d'échecs
export interface Game {
  id: string;
  whitePlayer: string;
  blackPlayer: string;
  moves: string;
  winner: 'white' | 'black' | 'draw' | null;
  date: number;
  rated: boolean;
  speed: string;
  status: string;
  opening?: {
    eco: string;
    name: string;
  };
  players: {
    white: {
      username: string;
      rating?: number;
    };
    black: {
      username: string;
      rating?: number;
    };
  };
}

// Interface pour la réponse de l'API
export interface FetchGamesResponse {
  success: boolean;
  games?: Game[];
  error?: string;
}

// ========================================
// Interfaces pour Profils Enrichis
// ========================================

// Style de jeu d'un profil
export interface PlayingStyle {
  aggression: number;        // 0-100
  tactical: number;          // 0-100
  positional: number;        // 0-100
  endgame: number;           // 0-100
  openingTheory: number;     // 0-100
  timeManagement: number;    // 0-100
}

// Ouverture favorite
export interface FavoriteOpening {
  id: string;
  profileId: string;
  name: string;
  eco?: string;              // Code ECO (E4, D4, etc.)
  description?: string;
  winRate?: number;
  gamesPlayed?: number;
  preferenceOrder?: number;
  createdAt: string;
}

// Métadonnées de profil enrichi
export interface ProfileMetadata {
  id: string;
  profileId: string;
  userId: string;
  
  // Informations textuelles
  biography?: string;
  notes?: string;
  tags?: string[];
  
  // Style de jeu
  playingStyle: PlayingStyle;
  
  // Forces et faiblesses
  strengths?: string[];
  weaknesses?: string[];
  
  // Statistiques
  gamesPlayed: number;
  lastPlayedAt?: string;
  
  // Analyse IA
  aiSummary?: string;
  aiStyleDescription?: string;
  aiConfidence?: number;
  aiUpdatedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

// Interface complète d'un profil enrichi
export interface EnhancedProfile {
  // Profil de base
  id: string;
  username: string;
  platform: 'lichess' | 'chesscom';
  stats: any;  // PersonaStats
  config: any; // EngineConfig
  
  // Métadonnées enrichies
  metadata?: ProfileMetadata;
  favoriteOpenings?: FavoriteOpening[];
}

// Tags prédéfinis disponibles
export const AVAILABLE_TAGS = [
  'Agressif',
  'Défensif',
  'Tactique',
  'Positionnel',
  'Blitz',
  'Rapid',
  'Classical',
  'Gambit',
  'Attaque',
  'Contre-attaque',
  'Solide',
  'Créatif',
  'Théoricien',
  'Pragmatique',
  'Calculateur',
  'Intuitif'
] as const;

// Forces/Faiblesses prédéfinies
export const AVAILABLE_STRENGTHS = [
  'Finales',
  'Milieu de jeu',
  'Ouvertures',
  'Tactique',
  'Calcul',
  'Patience',
  'Endurance',
  'Vitesse',
  'Créativité',
  'Mémoire',
  'Sang-froid',
  'Récupération'
] as const;

export const AVAILABLE_WEAKNESSES = [
  'Finales',
  'Milieu de jeu',
  'Ouvertures',
  'Tactique',
  'Calcul',
  'Patience',
  'Time pressure',
  'Gambit',
  'Positions fermées',
  'Positions ouvertes',
  'Sacrifices',
  'Endgame technique'
] as const;

// Re-exports for accuracy / move classification (CAPS-style analysis)
export type {
  GameAccuracyResult,
  MoveEvalInput,
  MoveClassification,
} from '@/lib/analysis-engine';
