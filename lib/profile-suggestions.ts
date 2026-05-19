import type { PlayingStyle, ProfileMetadata } from '@/types/chess';
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
  nameEn?: string;
  eco: string;               // Code ECO
  description: string;
  descriptionEn?: string;
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
  nameEn?: string;
  eco: string;
  description: string;
  descriptionEn?: string;
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
    nameEn: "Fried Liver Attack",
    eco: "C57",
    description: "Attaque ultra-agressive sacrifiant un cavalier pour une attaque dévastatrice",
    descriptionEn: "Ultra-aggressive attack sacrificing a knight for a devastating attack",
    difficulty: "medium",
    suitableFor: {
      aggression: { min: 75, max: 100 },
      tactical: { min: 70, max: 100 }
    },
    tags: ["agressif", "tactique", "sacrifice", "attaque"]
  },
  {
    name: "Gambit du Roi",
    nameEn: "King's Gambit",
    eco: "C30",
    description: "Sacrifice précoce d'un pion pour ouvrir des lignes et attaquer rapidement",
    descriptionEn: "Early pawn sacrifice to open lines and attack quickly",
    difficulty: "medium",
    suitableFor: {
      aggression: { min: 80, max: 100 },
      tactical: { min: 75, max: 100 }
    },
    tags: ["agressif", "gambit", "romantique", "attaque"]
  },
  {
    name: "Défense Sicilienne (Najdorf)",
    nameEn: "Sicilian Defense (Najdorf)",
    eco: "B90",
    description: "Ouverture complexe et combative, favorite des joueurs agressifs",
    descriptionEn: "Complex and combative opening, favorite of aggressive players",
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
    nameEn: "Spanish Game (Ruy Lopez)",
    eco: "C60",
    description: "Ouverture classique riche en plans stratégiques à long terme",
    descriptionEn: "Classical opening rich in long-term strategic plans",
    difficulty: "medium",
    suitableFor: {
      positional: { min: 70, max: 100 },
      tactical: { min: 50, max: 80 }
    },
    tags: ["positionnel", "classique", "stratégique", "solide"]
  },
  {
    name: "Partie Italienne",
    nameEn: "Italian Game",
    eco: "C50",
    description: "Développement harmonieux avec plans positionnels clairs",
    descriptionEn: "Harmonious development with clear positional plans",
    difficulty: "easy",
    suitableFor: {
      positional: { min: 60, max: 90 },
      aggression: { min: 40, max: 70 }
    },
    tags: ["positionnel", "simple", "classique", "équilibré"]
  },
  {
    name: "Défense Caro-Kann",
    nameEn: "Caro-Kann Defense",
    eco: "B10",
    description: "Ouverture solide et fiable privilégiant la structure de pions",
    descriptionEn: "Solid and reliable opening favoring pawn structure",
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
    nameEn: "Four Knights Game",
    eco: "C46",
    description: "Développement symétrique et sain, idéal pour débutants",
    descriptionEn: "Symmetrical and sound development, ideal for beginners",
    difficulty: "easy",
    suitableFor: {
      positional: { min: 50, max: 80 },
      tactical: { min: 40, max: 70 }
    },
    tags: ["équilibré", "simple", "pédagogique", "symétrique"]
  },
  {
    name: "Défense Française",
    nameEn: "French Defense",
    eco: "C00",
    description: "Ouverture solide avec possibilités tactiques et contre-attaque",
    descriptionEn: "Solid opening with tactical possibilities and counterattack",
    difficulty: "medium",
    suitableFor: {
      positional: { min: 65, max: 90 },
      tactical: { min: 55, max: 80 }
    },
    tags: ["équilibré", "contre-attaque", "structure", "plan"]
  },
  {
    name: "Défense Est-Indienne",
    nameEn: "King's Indian Defense",
    eco: "E60",
    description: "Système flexible permettant contre-jeu dynamique",
    descriptionEn: "Flexible system allowing dynamic counterplay",
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
    nameEn: "English Opening",
    eco: "A10",
    description: "Ouverture hypermoderne avec nombreuses transpositions possibles",
    descriptionEn: "Hypermodern opening with many possible transpositions",
    difficulty: "medium",
    suitableFor: {
      positional: { min: 70, max: 95 },
      tactical: { min: 50, max: 75 }
    },
    tags: ["positionnel", "flexible", "hypermoderne", "transpositions"]
  },
  {
    name: "Défense Slave",
    nameEn: "Slav Defense",
    eco: "D10",
    description: "Défense solide du gambit dame, très fiable",
    descriptionEn: "Solid defense of the Queen's Gambit, very reliable",
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
    nameEn: "Sicilian Dragon",
    eco: "B70",
    description: "Variante explosive de la Sicilienne avec attaques mutuelles",
    descriptionEn: "Explosive Sicilian variation with mutual attacks",
    difficulty: "hard",
    suitableFor: {
      aggression: { min: 75, max: 95 },
      tactical: { min: 80, max: 100 }
    },
    tags: ["agressif", "tactique", "double tranchant", "théorique"]
  },
  {
    name: "Gambit de Budapest",
    nameEn: "Budapest Gambit",
    eco: "A51",
    description: "Gambit agressif sacrifiant un pion pour initiatives actives",
    descriptionEn: "Aggressive gambit sacrificing a pawn for active initiative",
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
      reasons.push("Very similar playing style");
    } else if (styleSimilarity >= 70) {
      reasons.push("Compatible playing style");
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
      reasons.push(`${commonTags.length} tag(s) in common`);
    }
  }
  
  // 3. Plateforme (10% du score) — caller passes userPlatform via rankSimilarProfiles
  
  // 4. Forces/Faiblesses complémentaires (15% du score)
  if (userMetadata.strengths && otherMetadata?.strengths) {
    const commonStrengths = userMetadata.strengths.filter(s =>
      otherMetadata.strengths?.includes(s)
    );
    if (commonStrengths.length > 0) {
      totalScore += 15;
      reasons.push("Common strengths");
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
 * Rank candidate profiles by similarity to the current user's metadata.
 */
export function rankSimilarProfiles(
  userMetadata: ProfileMetadata,
  userPlatform: "lichess" | "chesscom",
  candidates: Array<{ profile: DbProfile; metadata?: ProfileMetadata | null }>,
  limit = 6
): SimilarProfile[] {
  return candidates
    .filter((c) => c.profile.id !== userMetadata.profileId)
    .map((c) => {
      const match = calculateProfileMatch(
        userMetadata,
        c.profile,
        c.metadata ?? undefined
      );
      if (c.profile.platform === userPlatform) {
        match.matchScore = Math.min(100, match.matchScore + 10);
        if (!match.matchReasons.includes("Same platform")) {
          match.matchReasons.push("Same platform");
        }
      }
      return match;
    })
    .filter((s) => s.matchScore >= 35)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

// ========================================
// Recommandations d'Ouvertures
// ========================================

/**
 * Vérifier si une ouverture correspond au style
 */
function isOpeningSuitable(opening: OpeningData, style: PlayingStyle, lang: string = 'fr'): { suitable: boolean; score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  
  const reasonTexts = {
    aggressiveStyle: lang === 'en' ? "Matches your aggressive style" : "Correspond à votre style agressif",
    tacticalSkills: lang === 'en' ? "Suited to your tactical skills" : "Adapté à vos compétences tactiques",
    positionalPlay: lang === 'en' ? "Fits your positional play" : "Convient à votre jeu positionnel",
    universalOpening: lang === 'en' ? "Universal opening suited to all styles" : "Ouverture universelle adaptée à tous styles"
  };
  
  // Vérifier chaque critère
  if (opening.suitableFor.aggression) {
    const { min, max } = opening.suitableFor.aggression;
    if (style.aggression >= min && style.aggression <= max) {
      score += 35;
      if (style.aggression >= 75) {
        reasons.push(reasonTexts.aggressiveStyle);
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
        reasons.push(reasonTexts.tacticalSkills);
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
        reasons.push(reasonTexts.positionalPlay);
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
    reasons: reasons.length > 0 ? reasons : [reasonTexts.universalOpening]
  };
}

/**
 * Recommander des ouvertures basées sur le style
 */
export function recommendOpenings(
  style: PlayingStyle,
  existingOpenings: string[] = [],
  limit: number = 5,
  lang: string = 'fr'
): OpeningRecommendation[] {
  const recommendations: OpeningRecommendation[] = [];
  
  for (const opening of OPENINGS_DATABASE) {
    // Skip si déjà dans les favorites
    if (existingOpenings.some(o => o.toLowerCase() === opening.name.toLowerCase())) {
      continue;
    }
    
    const { suitable, score, reasons } = isOpeningSuitable(opening, style, lang);
    
    if (suitable) {
      recommendations.push({
        name: lang === 'en' && opening.nameEn ? opening.nameEn : opening.name,
        nameEn: opening.nameEn,
        eco: opening.eco,
        description: lang === 'en' && opening.descriptionEn ? opening.descriptionEn : opening.description,
        descriptionEn: opening.descriptionEn,
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
    reason: `Optimized configuration for your style (avg: ${Math.round(avgScore)}/100)`
  };
}
