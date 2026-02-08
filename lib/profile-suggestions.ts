import type { PlayingStyle, ProfileMetadata, EnhancedProfile } from '@/types/chess';
import type { DbProfile } from './supabase-storage';

// ========================================
// Types de Suggestions
// ========================================

export interface SimilarProfile {
  profile: DbProfile;
  matchScore: number;        // 0-100
  matchReasons: string[];    // Raisons de la similarité
  commonOpenings: string[];  // Ouvertures en commun
  styleSimilarity: number;   // Similarité de style 0-100
}

export interface OpeningRecommendation {
  name: string;
  eco: string;               // Code ECO
  description: string;
  suitability: number;       // 0-100
  reasons: string[];         // Pourquoi cette ouverture convient
  difficulty: 'easy' | 'medium' | 'hard';
  successRate?: number;      // Taux de succès estimé
  resources?: string[];      // Liens vers cours/vidéos
}

export interface ConfigSuggestion {
  difficulty: number;        // 1-5
  threads: number;
  depth: number;
  thinkingTime: number;
  contempt: number;
  reason: string;
}

// ========================================
// Base de Données d'Ouvertures
// ========================================

interface OpeningData {
  name: string;
  eco: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  suitableFor: {
    aggression?: { min: number; max: number };
    tactical?: { min: number; max: number };
    positional?: { min: number; max: number };
  };
  tags: string[];
}

const OPENINGS_DATABASE: OpeningData[] = [
  // Ouvertures agressives
  {
    name: "Attaque Fried Liver",
    eco: "C57",
    description: "Attaque ultra-agressive sacrifiant un cavalier pour une attaque dévastatrice",
    difficulty: "medium",
    suitableFor: {
      aggression: { min: 75, max: 100 },
      tactical: { min: 70, max: 100 }
    },
    tags: ["agressif", "tactique", "sacrifice", "attaque"]
  },
  {
    name: "Gambit du Roi",
    eco: "C30",
    description: "Sacrifice précoce d'un pion pour ouvrir des lignes et attaquer rapidement",
    difficulty: "medium",
    suitableFor: {
      aggression: { min: 80, max: 100 },
      tactical: { min: 75, max: 100 }
    },
    tags: ["agressif", "gambit", "romantique", "attaque"]
  },
  {
    name: "Défense Sicilienne (Najdorf)",
    eco: "B90",
    description: "Ouverture complexe et combative, favorite des joueurs agressifs",
    difficulty: "hard",
    suitableFor: {
      aggression: { min: 60, max: 90 },
      tactical: { min: 70, max: 100 },
      positional: { min: 60, max: 85 }
    },
    tags: ["agressif", "complexe", "théorique", "contre-attaque"]
  },
  
  // Ouvertures positionnelles
  {
    name: "Partie Espagnole (Ruy Lopez)",
    eco: "C60",
    description: "Ouverture classique riche en plans stratégiques à long terme",
    difficulty: "medium",
    suitableFor: {
      positional: { min: 70, max: 100 },
      tactical: { min: 50, max: 80 }
    },
    tags: ["positionnel", "classique", "stratégique", "solide"]
  },
  {
    name: "Partie Italienne",
    eco: "C50",
    description: "Développement harmonieux avec plans positionnels clairs",
    difficulty: "easy",
    suitableFor: {
      positional: { min: 60, max: 90 },
      aggression: { min: 40, max: 70 }
    },
    tags: ["positionnel", "simple", "classique", "équilibré"]
  },
  {
    name: "Défense Caro-Kann",
    eco: "B10",
    description: "Ouverture solide et fiable privilégiant la structure de pions",
    difficulty: "easy",
    suitableFor: {
      positional: { min: 75, max: 100 },
      aggression: { min: 20, max: 50 }
    },
    tags: ["positionnel", "solide", "défensif", "structure"]
  },
  
  // Ouvertures équilibrées
  {
    name: "Partie des Quatre Cavaliers",
    eco: "C46",
    description: "Développement symétrique et sain, idéal pour débutants",
    difficulty: "easy",
    suitableFor: {
      positional: { min: 50, max: 80 },
      tactical: { min: 40, max: 70 }
    },
    tags: ["équilibré", "simple", "pédagogique", "symétrique"]
  },
  {
    name: "Défense Française",
    eco: "C00",
    description: "Ouverture solide avec possibilités tactiques et contre-attaque",
    difficulty: "medium",
    suitableFor: {
      positional: { min: 65, max: 90 },
      tactical: { min: 55, max: 80 }
    },
    tags: ["équilibré", "contre-attaque", "structure", "plan"]
  },
  {
    name: "Défense Est-Indienne",
    eco: "E60",
    description: "Système flexible permettant contre-jeu dynamique",
    difficulty: "medium",
    suitableFor: {
      positional: { min: 60, max: 85 },
      tactical: { min: 65, max: 90 },
      aggression: { min: 55, max: 80 }
    },
    tags: ["dynamique", "flexible", "contre-jeu", "moderne"]
  },
  
  // Ouvertures fermées
  {
    name: "Ouverture Anglaise",
    eco: "A10",
    description: "Ouverture hypermoderne avec nombreuses transpositions possibles",
    difficulty: "medium",
    suitableFor: {
      positional: { min: 70, max: 95 },
      tactical: { min: 50, max: 75 }
    },
    tags: ["positionnel", "flexible", "hypermoderne", "transpositions"]
  },
  {
    name: "Défense Slave",
    eco: "D10",
    description: "Défense solide du gambit dame, très fiable",
    difficulty: "easy",
    suitableFor: {
      positional: { min: 70, max: 95 },
      aggression: { min: 30, max: 60 }
    },
    tags: ["solide", "défensif", "simple", "fiable"]
  },
  
  // Ouvertures tactiques
  {
    name: "Dragon de Sicilienne",
    eco: "B70",
    description: "Variante explosive de la Sicilienne avec attaques mutuelles",
    difficulty: "hard",
    suitableFor: {
      aggression: { min: 75, max: 95 },
      tactical: { min: 80, max: 100 }
    },
    tags: ["agressif", "tactique", "double tranchant", "théorique"]
  },
  {
    name: "Gambit de Budapest",
    eco: "A51",
    description: "Gambit agressif sacrifiant un pion pour initiatives actives",
    difficulty: "medium",
    suitableFor: {
      aggression: { min: 70, max: 95 },
      tactical: { min: 75, max: 95 }
    },
    tags: ["gambit", "agressif", "initiative", "surprise"]
  }
];

// ========================================
// Fonctions de Matching de Profils
// ========================================

/**
 * Calculer le score de match entre deux profils
 */
export function calculateProfileMatch(
  userMetadata: ProfileMetadata,
  otherProfile: DbProfile,
  otherMetadata?: ProfileMetadata
): SimilarProfile {
  let totalScore = 0;
  const reasons: string[] = [];
  const commonOpenings: string[] = [];
  
  // 1. Similarité de style (40% du score)
  let styleSimilarity = 0;
  if (otherMetadata?.playingStyle) {
    styleSimilarity = calculateStyleSimilarity(
      userMetadata.playingStyle,
      otherMetadata.playingStyle
    );
    totalScore += (styleSimilarity / 100) * 40;
    
    if (styleSimilarity >= 80) {
      reasons.push("Style de jeu très similaire");
    } else if (styleSimilarity >= 70) {
      reasons.push("Style de jeu compatible");
    }
  }
  
  // 2. Tags en commun (20% du score)
  if (userMetadata.tags && otherMetadata?.tags) {
    const commonTags = userMetadata.tags.filter(tag => 
      otherMetadata.tags?.includes(tag)
    );
    const tagScore = (commonTags.length / Math.max(userMetadata.tags.length, otherMetadata.tags.length)) * 100;
    totalScore += (tagScore / 100) * 20;
    
    if (commonTags.length > 0) {
      reasons.push(`${commonTags.length} tag(s) en commun`);
    }
  }
  
  // 3. Plateforme (10% du score)
  if (otherProfile.platform === userMetadata.profileId) { // Approximation
    totalScore += 10;
    reasons.push("Même plateforme");
  }
  
  // 4. Forces/Faiblesses complémentaires (15% du score)
  if (userMetadata.strengths && otherMetadata?.strengths) {
    const commonStrengths = userMetadata.strengths.filter(s =>
      otherMetadata.strengths?.includes(s)
    );
    if (commonStrengths.length > 0) {
      totalScore += 15;
      reasons.push("Points forts communs");
    }
  }
  
  // 5. Niveau similaire (15% du score) - approximation
  totalScore += 15; // Par défaut si pas d'ELO disponible
  
  return {
    profile: otherProfile,
    matchScore: Math.min(100, Math.round(totalScore)),
    matchReasons: reasons,
    commonOpenings,
    styleSimilarity: Math.round(styleSimilarity)
  };
}

/**
 * Calculer la similarité entre deux styles
 */
function calculateStyleSimilarity(style1: PlayingStyle, style2: PlayingStyle): number {
  const keys: (keyof PlayingStyle)[] = [
    'aggression', 'tactical', 'positional', 
    'endgame', 'openingTheory', 'timeManagement'
  ];
  
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  keys.forEach(key => {
    dotProduct += style1[key] * style2[key];
    magnitude1 += style1[key] * style1[key];
    magnitude2 += style2[key] * style2[key];
  });
  
  const similarity = dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
  return Math.round(similarity * 100);
}

/**
 * Trouver les profils similaires
 */
export function findSimilarProfiles(
  userMetadata: ProfileMetadata,
  allProfiles: DbProfile[],
  limit: number = 5
): SimilarProfile[] {
  // Pour l'instant, retourne un tableau vide car on n'a pas accès aux métadonnées des autres profils
  // Cette fonctionnalité nécessiterait une API backend pour query les profils
  return [];
}

// ========================================
// Recommandations d'Ouvertures
// ========================================

/**
 * Vérifier si une ouverture correspond au style
 */
function isOpeningSuitable(opening: OpeningData, style: PlayingStyle): { suitable: boolean; score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  
  // Vérifier chaque critère
  if (opening.suitableFor.aggression) {
    const { min, max } = opening.suitableFor.aggression;
    if (style.aggression >= min && style.aggression <= max) {
      score += 35;
      if (style.aggression >= 75) {
        reasons.push("Correspond à votre style agressif");
      }
    } else if (Math.abs(style.aggression - min) <= 15 || Math.abs(style.aggression - max) <= 15) {
      score += 15;
    }
  }
  
  if (opening.suitableFor.tactical) {
    const { min, max } = opening.suitableFor.tactical;
    if (style.tactical >= min && style.tactical <= max) {
      score += 35;
      if (style.tactical >= 75) {
        reasons.push("Adapté à vos compétences tactiques");
      }
    } else if (Math.abs(style.tactical - min) <= 15 || Math.abs(style.tactical - max) <= 15) {
      score += 15;
    }
  }
  
  if (opening.suitableFor.positional) {
    const { min, max } = opening.suitableFor.positional;
    if (style.positional >= min && style.positional <= max) {
      score += 30;
      if (style.positional >= 75) {
        reasons.push("Convient à votre jeu positionnel");
      }
    } else if (Math.abs(style.positional - min) <= 15 || Math.abs(style.positional - max) <= 15) {
      score += 10;
    }
  }
  
  // Si aucun critère spécifique, score par défaut
  if (!opening.suitableFor.aggression && !opening.suitableFor.tactical && !opening.suitableFor.positional) {
    score = 50;
  }
  
  return {
    suitable: score >= 50,
    score: Math.min(100, score),
    reasons: reasons.length > 0 ? reasons : ["Ouverture universelle adaptée à tous styles"]
  };
}

/**
 * Recommander des ouvertures basées sur le style
 */
export function recommendOpenings(
  style: PlayingStyle,
  existingOpenings: string[] = [],
  limit: number = 5
): OpeningRecommendation[] {
  const recommendations: OpeningRecommendation[] = [];
  
  for (const opening of OPENINGS_DATABASE) {
    // Skip si déjà dans les favorites
    if (existingOpenings.some(o => o.toLowerCase() === opening.name.toLowerCase())) {
      continue;
    }
    
    const { suitable, score, reasons } = isOpeningSuitable(opening, style);
    
    if (suitable) {
      recommendations.push({
        name: opening.name,
        eco: opening.eco,
        description: opening.description,
        suitability: score,
        reasons,
        difficulty: opening.difficulty,
        successRate: score, // Approximation
        resources: [
          `https://www.chess.com/openings/${opening.name.replace(/\s+/g, '-')}`,
          `https://lichess.org/study/topic/${opening.eco}`
        ]
      });
    }
  }
  
  // Trier par score de correspondance
  return recommendations
    .sort((a, b) => b.suitability - a.suitability)
    .slice(0, limit);
}

// ========================================
// Configuration Moteur Optimale
// ========================================

/**
 * Suggérer une configuration moteur optimale
 */
export function suggestOptimalConfig(style: PlayingStyle): ConfigSuggestion {
  // Déterminer la difficulté basée sur le niveau général
  const avgScore = (
    style.aggression + style.tactical + style.positional +
    style.endgame + style.openingTheory + style.timeManagement
  ) / 6;
  
  let difficulty = 3; // Moyen par défaut
  if (avgScore >= 80) difficulty = 5;
  else if (avgScore >= 70) difficulty = 4;
  else if (avgScore >= 50) difficulty = 3;
  else if (avgScore >= 35) difficulty = 2;
  else difficulty = 1;
  
  // Threads : plus si bon en tactique/calcul
  let threads = 4;
  if (style.tactical >= 80 || style.timeManagement >= 80) threads = 6;
  else if (style.tactical <= 50) threads = 2;
  
  // Depth : plus si bon en tactique
  let depth = 15;
  if (style.tactical >= 80) depth = 18;
  else if (style.tactical >= 70) depth = 16;
  else if (style.tactical <= 50) depth = 12;
  
  // Thinking time : plus si bon en gestion du temps
  let thinkingTime = 1000;
  if (style.timeManagement >= 80) thinkingTime = 1500;
  else if (style.timeManagement <= 50) thinkingTime = 700;
  
  // Contempt : basé sur l'agressivité
  let contempt = 0;
  if (style.aggression >= 75) contempt = 20;
  else if (style.aggression >= 60) contempt = 10;
  else if (style.aggression <= 40) contempt = -10;
  
  return {
    difficulty,
    threads,
    depth,
    thinkingTime,
    contempt,
    reason: `Configuration optimisée pour votre style (avg: ${Math.round(avgScore)}/100)`
  };
}
