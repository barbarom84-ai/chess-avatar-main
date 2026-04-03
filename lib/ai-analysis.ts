import type { PersonaStats } from './analysis';
import type { PlayingStyle, ProfileMetadata } from '@/types/chess';

// ========================================
// Types d'Analyse IA
// ========================================

export interface AIAnalysis {
  summary: string;              // Résumé général du joueur
  styleDescription: string;     // Description détaillée du style
  recommendations: string[];    // Recommandations (3-5)
  improvementAreas: string[];   // Axes d'amélioration (2-4)
  strengths: string[];          // Points forts détectés (2-4)
  famousComparisons: FamousPlayerComparison[];  // Comparaisons (1-2)
  confidence: number;           // Confiance 0-100
  generatedAt: string;          // Date de génération
}

export interface FamousPlayerComparison {
  player: string;               // Nom du joueur
  similarity: number;           // Similarité 0-100
  reason: string;               // Raison de la comparaison
}

// Joueurs célèbres avec leurs styles caractéristiques
const FAMOUS_PLAYERS = {
  // Joueurs agressifs/tactiques
  mikhailTal: {
    name: 'Mikhail Tal',
    style: { aggression: 95, tactical: 98, positional: 60, endgame: 70, openingTheory: 85, timeManagement: 70 },
    traits: ['sacrifices audacieux', 'attaques brillantes', 'imagination tactique']
  },
  bobbyFischer: {
    name: 'Bobby Fischer',
    style: { aggression: 80, tactical: 90, positional: 85, endgame: 95, openingTheory: 90, timeManagement: 85 },
    traits: ['précision technique', 'ouvertures solides', 'finales impeccables']
  },
  garryKasparov: {
    name: 'Garry Kasparov',
    style: { aggression: 85, tactical: 92, positional: 80, endgame: 88, openingTheory: 95, timeManagement: 80 },
    traits: ['jeu dynamique', 'préparation d\'ouverture', 'combativité']
  },
  
  // Joueurs positionnels
  tigraPetrosian: {
    name: 'Tigran Petrosian',
    style: { aggression: 30, tactical: 70, positional: 98, endgame: 92, openingTheory: 85, timeManagement: 95 },
    traits: ['prophylaxie', 'solidité défensive', 'patience']
  },
  anatolyKarpov: {
    name: 'Anatoly Karpov',
    style: { aggression: 40, tactical: 75, positional: 95, endgame: 98, openingTheory: 90, timeManagement: 90 },
    traits: ['jeu positionnel pur', 'technique en finale', 'pressions lentes']
  },
  
  // Joueurs équilibrés
  magnusCarlsen: {
    name: 'Magnus Carlsen',
    style: { aggression: 70, tactical: 85, positional: 90, endgame: 99, openingTheory: 75, timeManagement: 95 },
    traits: ['polyvalence', 'finales exceptionnelles', 'jeu universel']
  },
  viswananthanAnand: {
    name: 'Viswanathan Anand',
    style: { aggression: 75, tactical: 88, positional: 82, endgame: 90, openingTheory: 88, timeManagement: 92 },
    traits: ['rapidité de calcul', 'jeu solide', 'adaptabilité']
  },
  
  // Styles spécifiques
  aleksandrAlekhine: {
    name: 'Alexander Alekhine',
    style: { aggression: 90, tactical: 95, positional: 75, endgame: 85, openingTheory: 88, timeManagement: 70 },
    traits: ['attaques combinées', 'créativité tactique', 'audace']
  },
  joseLRaulCapablanca: {
    name: 'José Raúl Capablanca',
    style: { aggression: 50, tactical: 80, positional: 92, endgame: 99, openingTheory: 85, timeManagement: 95 },
    traits: ['simplicité élégante', 'technique pure', 'finales légendaires']
  }
};

// ========================================
// Fonctions d'Analyse
// ========================================

/**
 * Calculer la similarité entre deux styles (cosine similarity)
 */
function calculateStyleSimilarity(style1: PlayingStyle, style2: PlayingStyle): number {
  const keys: (keyof PlayingStyle)[] = ['aggression', 'tactical', 'positional', 'endgame', 'openingTheory', 'timeManagement'];
  
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
 * Trouver les joueurs célèbres similaires
 */
function findFamousComparisons(style: PlayingStyle): FamousPlayerComparison[] {
  const comparisons: FamousPlayerComparison[] = [];
  
  Object.values(FAMOUS_PLAYERS).forEach(famous => {
    const similarity = calculateStyleSimilarity(style, famous.style);
    
    if (similarity >= 70) {
      comparisons.push({
        player: famous.name,
        similarity,
        reason: `Partage son ${famous.traits[0]}`
      });
    }
  });
  
  // Trier par similarité et prendre top 2
  return comparisons.sort((a, b) => b.similarity - a.similarity).slice(0, 2);
}

/**
 * Déterminer le style dominant
 */
function getDominantStyle(style: PlayingStyle): { name: string; value: number } {
  const styles = [
    { name: 'agressif', value: style.aggression },
    { name: 'tactique', value: style.tactical },
    { name: 'positionnel', value: style.positional }
  ];
  
  return styles.reduce((max, current) => current.value > max.value ? current : max);
}

/**
 * Générer un résumé du style
 */
function generateSummary(style: PlayingStyle): string {
  const dominant = getDominantStyle(style);

  if (dominant.name === 'agressif' && dominant.value >= 80) {
    return `Joueur très agressif qui privilégie l'attaque directe et les sacrifices tactiques. N'hésite pas à prendre des risques pour obtenir l'initiative.`;
  } else if (dominant.name === 'tactique' && dominant.value >= 80) {
    return `Joueur tactique affûté excellent dans les complications et le calcul concret. Recherche activement les combinaisons gagnantes.`;
  } else if (dominant.name === 'positionnel' && dominant.value >= 80) {
    return `Joueur positionnel solide qui privilégie la stratégie à long terme et les améliorations progressives. Patient et méthodique.`;
  } else if (style.endgame >= 85) {
    return `Joueur technique avec une excellente maîtrise des finales. Convertit efficacement les avantages minimes en victoires.`;
  } else {
    return `Joueur équilibré capable de s'adapter à différents types de positions. Style universel sans points faibles majeurs.`;
  }
}

/**
 * Générer une description détaillée du style
 */
function generateStyleDescription(style: PlayingStyle): string {
  const parts: string[] = [];
  
  // Agressivité
  if (style.aggression >= 75) {
    parts.push('Ce profil montre une **forte tendance offensive**, avec une préférence marquée pour les attaques directes sur le roi adverse.');
  } else if (style.aggression <= 35) {
    parts.push('Ce profil adopte une approche **défensive et prudente**, évitant les complications inutiles.');
  }
  
  // Tactique vs Positionnel
  if (style.tactical >= 75 && style.positional < 65) {
    parts.push('Le jeu est principalement **tactique**, privilégiant les combinaisons concrètes aux considérations stratégiques.');
  } else if (style.positional >= 75 && style.tactical < 65) {
    parts.push('Le jeu est principalement **positionnel**, basé sur la compréhension stratégique plutôt que le calcul forcé.');
  } else if (style.tactical >= 70 && style.positional >= 70) {
    parts.push('Excellent équilibre entre **tactique et positionnel**, capable de naviguer aussi bien dans les positions calmes que les complications.');
  }
  
  // Finales
  if (style.endgame >= 85) {
    parts.push('**Point fort majeur en finale**, avec une technique impeccable pour convertir les positions gagnantes.');
  } else if (style.endgame <= 50) {
    parts.push('Les finales représentent un **axe d\'amélioration** - travailler la technique est recommandé.');
  }
  
  // Théorie
  if (style.openingTheory >= 85) {
    parts.push('**Excellente préparation théorique** en ouverture, avec un répertoire solide et à jour.');
  } else if (style.openingTheory <= 50) {
    parts.push('Le répertoire d\'ouvertures gagnerait à être **approfondi et structuré**.');
  }
  
  // Gestion du temps
  if (style.timeManagement >= 85) {
    parts.push('**Gestion du temps exemplaire**, sachant quand réfléchir et quand jouer rapidement.');
  } else if (style.timeManagement <= 50) {
    parts.push('La **gestion du temps** nécessite de l\'attention - risque de zeitnot.');
  }
  
  return parts.join(' ') || 'Style de jeu standard sans particularités marquées.';
}

/**
 * Générer des recommandations personnalisées
 */
function generateRecommendations(style: PlayingStyle): string[] {
  const recommendations: string[] = [];
  
  // Recommandations générales
  recommendations.push('📚 Étudier les **tactiques de base** (fourchettes, enfilades, clouages) avec des exercices quotidiens');
  
  // Basé sur les faiblesses du style
  if (style.endgame < 60) {
    recommendations.push('♔ Travailler les **finales fondamentales** (Roi+Pion, Tours, Fou contre Cavalier)');
  }
  
  if (style.openingTheory < 60) {
    recommendations.push('📖 Construire un **répertoire d\'ouvertures cohérent** et l\'approfondir progressivement');
  }
  
  if (style.positional < 60 && style.tactical >= 70) {
    recommendations.push('🎯 Améliorer la **compréhension positionnelle** : structure de pions, cases faibles, plans à long terme');
  }
  
  if (style.timeManagement < 60) {
    recommendations.push('⏱️ S\'entraîner en **cadence rapide** pour améliorer la gestion du temps');
  }
  
  // Recommandations générales
  if (style.aggression >= 80) {
    recommendations.push('⚖️ Apprendre à **jouer positionnel** dans les positions calmes pour devenir plus universel');
  }
  
  // S'assurer d'avoir au moins 3 recommandations
  if (recommendations.length < 3) {
    recommendations.push('🎮 Jouer régulièrement des **parties longues** pour consolider les acquis');
    recommendations.push('📊 **Analyser ses propres parties** avec un moteur pour identifier les erreurs récurrentes');
  }
  
  return recommendations.slice(0, 5);
}

/**
 * Identifier les axes d'amélioration
 */
function findImprovementAreas(style: PlayingStyle): string[] {
  const areas: string[] = [];
  
  const weakPoints = [
    { key: 'endgame' as keyof PlayingStyle, label: 'Finales', threshold: 60 },
    { key: 'openingTheory' as keyof PlayingStyle, label: 'Théorie d\'ouverture', threshold: 60 },
    { key: 'timeManagement' as keyof PlayingStyle, label: 'Gestion du temps', threshold: 60 },
    { key: 'positional' as keyof PlayingStyle, label: 'Jeu positionnel', threshold: 65 },
    { key: 'tactical' as keyof PlayingStyle, label: 'Vision tactique', threshold: 65 }
  ];
  
  weakPoints.forEach(point => {
    if (style[point.key] < point.threshold) {
      areas.push(point.label);
    }
  });
  
  return areas.slice(0, 4);
}

/**
 * Identifier les points forts
 */
function findStrengths(style: PlayingStyle): string[] {
  const strengths: string[] = [];
  
  const strongPoints = [
    { key: 'aggression' as keyof PlayingStyle, label: 'Jeu agressif et offensif', threshold: 80 },
    { key: 'tactical' as keyof PlayingStyle, label: 'Vision tactique aiguisée', threshold: 80 },
    { key: 'positional' as keyof PlayingStyle, label: 'Compréhension positionnelle', threshold: 80 },
    { key: 'endgame' as keyof PlayingStyle, label: 'Technique en finale', threshold: 80 },
    { key: 'openingTheory' as keyof PlayingStyle, label: 'Connaissance théorique', threshold: 80 },
    { key: 'timeManagement' as keyof PlayingStyle, label: 'Gestion du temps', threshold: 80 }
  ];
  
  strongPoints.forEach(point => {
    if (style[point.key] >= point.threshold) {
      strengths.push(point.label);
    }
  });
  
  return strengths.slice(0, 4);
}

/**
 * Calculer le niveau de confiance de l'analyse
 */
function calculateConfidence(gamesPlayed: number, hasStats: boolean): number {
  if (!hasStats) return 30;
  
  // Plus de parties = plus de confiance
  if (gamesPlayed >= 100) return 95;
  if (gamesPlayed >= 50) return 85;
  if (gamesPlayed >= 20) return 70;
  if (gamesPlayed >= 10) return 55;
  return 40;
}

// ========================================
// Fonction Principale d'Analyse
// ========================================

/**
 * Générer une analyse IA complète d'un profil
 */
export function generateAIAnalysis(
  style: PlayingStyle,
  stats?: PersonaStats,
  gamesPlayed: number = 0
): AIAnalysis {
  const hasGoodData = gamesPlayed >= 10;
  
  return {
    summary: generateSummary(style),
    styleDescription: generateStyleDescription(style),
    recommendations: generateRecommendations(style),
    improvementAreas: findImprovementAreas(style),
    strengths: findStrengths(style),
    famousComparisons: findFamousComparisons(style),
    confidence: calculateConfidence(gamesPlayed, hasGoodData),
    generatedAt: new Date().toISOString()
  };
}

/**
 * Mettre à jour l'analyse IA dans les métadonnées
 */
export function shouldUpdateAIAnalysis(metadata: ProfileMetadata | null): boolean {
  if (!metadata || !metadata.aiUpdatedAt) return true;
  
  // Mettre à jour si plus de 7 jours
  const lastUpdate = new Date(metadata.aiUpdatedAt);
  const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceUpdate >= 7;
}
