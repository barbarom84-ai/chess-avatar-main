import type { PersonaStats } from './analysis';
import type { PlayingStyle, ProfileMetadata } from '@/types/chess';
import {
  type TraitLang,
  traitAlternativeLines,
  WEAKNESS_POOLS,
  STRENGTH_POOLS,
  traitFastDecisions,
  traitLongGameEndurance,
  traitOffensiveIdentity,
  traitOpeningMastery,
  traitStructuralSolidity,
  traitUnpredictablePlay,
} from '@/lib/avatar-trait-pools';

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
  /** Contexte chiffré (parties, bilans, ouverture fréquente) — seulement si PersonaStats fourni */
  statsInsight?: string;
}

export interface FamousPlayerComparison {
  player: string;               // Nom du joueur
  similarity: number;           // Similarité 0-100
  reason: string;               // Raison de la comparaison
}

// Joueurs célèbres avec leurs styles caractéristiques
const FAMOUS_PLAYERS = {
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
} as const;

// ========================================
// Hachage déterministe pour variantes (sans appel API)
// ========================================

export function seedFromContext(style: PlayingStyle, stats?: PersonaStats): number {
  let s = 0;
  s += (stats?.username?.codePointAt(0) ?? 0) * 7;
  s += Math.floor(style.aggression + style.tactical + style.positional);
  s += stats?.gameCount ?? 0;
  s += (stats?.winRate ?? 0) * 3;
  return s >>> 0;
}

function pickIndex(seed: number, n: number): number {
  if (n <= 0) return 0;
  return seed % n;
}

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

  keys.forEach((key) => {
    dotProduct += style1[key] * style2[key];
    magnitude1 += style1[key] * style1[key];
    magnitude2 += style2[key] * style2[key];
  });

  const sim = dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
  if (!Number.isFinite(sim)) return 0;
  return Math.round(sim * 100);
}

/**
 * Joueurs célèbres proches, avec repli si aucun ne dépasse 70
 */
function findFamousComparisons(style: PlayingStyle): FamousPlayerComparison[] {
  const ranked = (Object.keys(FAMOUS_PLAYERS) as (keyof typeof FAMOUS_PLAYERS)[])
    .map((k) => {
      const fam = FAMOUS_PLAYERS[k];
      return { ...fam, similarity: calculateStyleSimilarity(style, fam.style) };
    })
    .sort((a, b) => b.similarity - a.similarity);

  const out: FamousPlayerComparison[] = [];
  for (const f of ranked) {
    if (f.similarity >= 70) {
      out.push({
        player: f.name,
        similarity: f.similarity,
        reason: `Affinité marquée : même élan « ${f.traits[0]} ».`
      });
    } else if (f.similarity >= 55) {
      out.push({
        player: f.name,
        similarity: f.similarity,
        reason: `Parenté légère avec ${f.traits[1] ?? f.traits[0]}.`
      });
    }
    if (out.length >= 2) break;
  }

  if (out.length > 0) return out;

  const first = ranked[0];
  if (first && first.similarity >= 40) {
    return [
      {
        player: first.name,
        similarity: first.similarity,
        reason: `Profil de référence le moins éloigné (${first.traits[0]}).`
      }
    ];
  }
  return [];
}

/**
 * Déterminer le style dominant (axes tactiques/positionnel/agressif)
 */
function getDominantStyle(style: PlayingStyle): { name: string; value: number } {
  const styles = [
    { name: 'agressif', value: style.aggression },
    { name: 'tactique', value: style.tactical },
    { name: 'positionnel', value: style.positional }
  ];
  return styles.reduce((max, current) => (current.value > max.value ? current : max));
}

function buildStatsInsight(stats: PersonaStats | undefined): string | undefined {
  if (!stats || (stats.gameCount ?? 0) < 1) return undefined;
  const parts: string[] = [];
  const n = Math.max(1, stats.gameCount);
  parts.push(
    `Données : **${n}** partie(s) prises en compte, bilan **${Math.round(stats.winRate)}%** victoires / ` +
    `**${Math.round(stats.drawRate)}%** nuls / **${Math.round(stats.lossRate)}%** défaites.`
  );
  if (stats.style) {
    parts.push(`L’étiquette de style côté plateforme : **${stats.style}**.`);
  }
  const top = stats.topOpenings?.[0];
  if (top?.name) {
    parts.push(`Ouverture la plus fréquente : **${top.name}**${top.count > 0 ? ` (${top.count} fois)` : ''}.`);
  }
  if (stats.avgMoves > 0) {
    if (stats.avgMoves >= 42) {
      parts.push(`Parties longues en moyenne (**~${Math.round(stats.avgMoves)}** coups), exigeance en fin de partie.`);
    } else if (stats.avgMoves <= 32) {
      parts.push(
        `Parties assez courtes (**~${Math.round(stats.avgMoves)}** coups) : tension souvent tôt, ou rythme rapide.`
      );
    } else {
      parts.push(`Durée moyenne d’environ **${Math.round(stats.avgMoves)}** coups par partie.`);
    }
  }
  if (stats.platform) {
    parts.push(`Source : **${stats.platform}**.`);
  }
  return parts.join(' ');
}

/**
 * Cohérence (facultative) entre l’étiq. plateforme et le profil de curseurs
 */
function platformStyleAlignment(playing: PlayingStyle, label?: PersonaStats['style']): string | null {
  if (!label) return null;
  const a = (playing.aggression + playing.tactical) / 2;
  const p = (playing.positional + playing.endgame) / 2;
  if (label === 'Agressif' && a < 50 && p > 55) {
    return ' La courbe d’entraînement suggère plutôt du positionnel, malgré le label agressif — vérifier la période analysée.';
  }
  if (label === 'Solide' && a > 65) {
    return ' Les curseurs sont pourtant assez offensifs, au-delà du stéréotype « solide ».';
  }
  if (label === 'Chaotique' && a < 50) {
    return ' Moins d’aléa dans les scores qu’un « chaotique » ne le laisserait supposer, ou période plus stable.';
  }
  if (label === 'Équilibré' && (a > 75 || p > 75)) {
    return ' La signature numérique est moins moyenne que l’intitulé : un profil a souvent un pic marqué.';
  }
  return null;
}

function generateSummary(
  style: PlayingStyle,
  seed: number,
  stats?: PersonaStats
): string {
  const dominant = getDominantStyle(style);
  const align = platformStyleAlignment(style, stats?.style) ?? '';
  const wr = stats?.winRate;
  const winNote =
    wr == null
      ? ''
      : wr >= 58
        ? ' Bilan légèrement positif sur l’échantillon.'
        : wr <= 42
          ? ' Résultats serrés ou en retrait — l’entraînement ciblera le réalisme, pas l’impressionnisme.'
          : '';

  const v = pickIndex(seed, 2);

  if (dominant.name === 'agressif' && dominant.value >= 80) {
    const t = v === 0
      ? `Profil d’**attitude offensive** : initiative et complications souvent recherchées, quitte à prendre du risque pour dynamiser.`
      : `Joueur offensif qui aime forcer l’ouverture et tenir l’adversaire sous la pression tactique.`;
    return t + winNote + align;
  }
  if (dominant.name === 'tactique' && dominant.value >= 80) {
    const t = v === 0
      ? `Calculateur averti, à l’aise dès qu’il y a de la matière dans les **combinaisons**.`
      : `Forte appétence tactique : le concret, les variantes et les coups gagnants priment.`;
    return t + winNote + align;
  }
  if (dominant.name === 'positionnel' && dominant.value >= 80) {
    const t = v === 0
      ? `Ancrage **stratégique** : plans, cases faibles et petits avantages cumulés.`
      : `En milieu de jeu, l’**habitude** d’orchestrer plutôt que d’enchaîner les idées hâtives.`;
    return t + winNote + align;
  }
  if (style.endgame >= 85) {
    return `Technicien de **finale** : conversion et patience pour mener les gains au bout.${winNote}${align}`;
  }
  const t = v === 0
    ? `Jeu plutôt **universel**, avec la capacité d’emprunter plusieurs approches selon l’ouverture et l’adversaire.`
    : `Style composite : pas de pôle unique qui écrase les autres, ce qui rend le rôle déjà polyvalent.`;
  return t + winNote + align;
}

/**
 * Générer une description détaillée — curseurs + stats optionnelles
 */
function generateStyleDescription(style: PlayingStyle, seed: number, stats?: PersonaStats): string {
  const parts: string[] = [];
  const extra = platformStyleAlignment(style, stats?.style);
  if (stats?.topOpenings?.[0]?.name) {
    const top = stats.topOpenings[0];
    parts.push(
      `Côté **répertoire** réel, l’ouverture « ${top.name} » ressort souvent${top.count > 0 ? ` (${top.count} fois)` : ''} — c’est un point d’appui fiable pour décrire les habitudes.`
    );
  }
  if (style.aggression >= 75) {
    parts.push(
      pickIndex(seed, 2) === 0
        ? 'Les curseurs indiquent une **forte tendance offensive** et l’espace d’innovation côté attaque.'
        : 'Profil **tourné vers l’attaque** : moins d’hésitation pour accepter le matériel ou pions d’influence s’il y a l’assaut.'
    );
  } else if (style.aggression <= 35) {
    parts.push('Profil plutôt **prudent** : privilégier la cohérence de position plutôt que l’invention d’office.');
  } else {
    parts.push("Neutre côté **agressivité** : l’intention oscille prudemment entre risque et retenue.");
  }

  if (style.tactical >= 75 && style.positional < 65) {
    parts.push('Biais **tactique** net : calcul et variantes avant la construction puriste en ouverture.');
  } else if (style.positional >= 75 && style.tactical < 65) {
    parts.push('Biais **positionnel** : améliorer la position, puis seulement chercher l’invention marquante.');
  } else if (style.tactical >= 70 && style.positional >= 70) {
    parts.push("Bon mélange **tactique / positionnel** : s’adapter aux positions calmes comme tranchantes.");
  }

  if (style.endgame >= 85) {
    parts.push("**Avantage clair en finales** : conversion, patience et concret plutôt que fuite en avant.");
  } else if (style.endgame <= 50) {
    parts.push('Marge de progression **en finale** (technique, pions, tours actives, etc.).');
  }
  if (style.openingTheory >= 85) {
    parts.push("**Forte mémorisation d’ouverture** : répertoire plus standardisé, moins d’improvisation au premier coup d’essai.");
  } else if (style.openingTheory <= 50) {
    parts.push('La **théorie d’ouverture** gagne à être un répertoire clair, nommé, mémorisé par étapes.');
  }
  if (style.timeManagement >= 85) {
    parts.push('Bonne **gestion de l’horloge** en général.');
  } else if (style.timeManagement <= 50) {
    parts.push('La **contrainte de temps** mérite d’être travaillée (cadence, décisions, zeitnot).');
  }
  if (stats && stats.drawRate >= 38) {
    parts.push(
      `Avec beaucoup de **nuls** (${Math.round(stats.drawRate)} %), la question se pose : solidité, ou manque d’ardeur pour bousculer l’adversaire ?`
    );
  }
  if (extra) parts.push(extra.trim());
  return parts.join(' ').trim() || 'Style de jeu standard sans particularités marquées dans les scores.';
}

/**
 * Générer des recommandations
 */
function generateRecommendations(
  style: PlayingStyle,
  seed: number,
  stats?: PersonaStats
): string[] {
  const recommendations: string[] = [];
  const head = [
    "📐 Feuille de **route 10 minutes** chaque matin : tactiques, puzzle du jour, ou finale du jour, au choix, mais régulier.",
    "🧩 Varier l’entraînement (tac / pos / blitz) pour ne pas cristalliser le même type d'erreur.",
  ];
  recommendations.push(head[pickIndex(seed, head.length)]);

  if (style.endgame < 60) {
    recommendations.push("♔ Fin de partie : thèmes de **R+P**, tours actives, finale de **fou vs cavalier**.");
  }
  if (style.openingTheory < 60) {
    recommendations.push("📋 Construire un **répertoire d’environ 6 à 8 défenses** côté négatif, 6 à 8 côté positif, retenu par cœur.");
  }
  if (style.positional < 60 && style.tactical >= 70) {
    recommendations.push("🧭 Ajouter de la **structure pion** : pions pendants, cavités, plans sur longues coulisses blanches / noires.");
  }
  if (style.timeManagement < 60) {
    recommendations.push("⏲️ Blitz 3+0 ou 5+0 ciblés, avec **arrêt froid** une fois l’heure déclenchée.");
  }
  if (style.aggression >= 80) {
    recommendations.push("⚔️ S’entraîner en **lignes fermées** et demi-ouvertes pour ne pas n’en dépendre qu’en positions ouvertes.");
  }

  if (stats?.topOpenings?.[0]) {
    const t = stats.topOpenings[0].name;
    if (t) {
      recommendations.push(
        `♟️ S’appuyer sur **${t}** (votre ligne la plus jouée) : mémoriser les réponses critiques et les bons échanges.`
      );
    }
  }
  if (stats && stats.winRate < 40 && stats.gameCount >= 15) {
    recommendations.push(
      "🎯 Avec beaucoup de nuls (ou défaites serrées), cibler la **victoire pratique** (activité, initiative, moins d’eau) en milieu de jeu."
    );
  }
  if (recommendations.length < 3) {
    recommendations.push("♟ Parties lentes 30' ou + pour cadrer les erreurs, puis les comparer moteur.");
  }
  if (recommendations.length < 4) {
    recommendations.push("📱 Retour sur **2 ou 3** parties d’un même tournoi, pour lire l’histoire et pas seulement le coup fautif.");
  }
  return recommendations.slice(0, 5);
}



export function findImprovementAreas(
  style: PlayingStyle,
  stats?: PersonaStats,
  seed = 0,
  lang: TraitLang = "fr"
): string[] {
  const WEAKNESS_POOL = WEAKNESS_POOLS[lang];
  const areas: string[] = [];
  const weakPoints: { key: keyof PlayingStyle; poolKey: string; threshold: number }[] = [
    { key: "endgame", poolKey: "endgame", threshold: 62 },
    { key: "openingTheory", poolKey: "openingTheory", threshold: 62 },
    { key: "timeManagement", poolKey: "timeManagement", threshold: 62 },
    { key: "positional", poolKey: "positional", threshold: 68 },
    { key: "tactical", poolKey: "tactical", threshold: 68 },
  ];
  let idx = 0;
  for (const p of weakPoints) {
    if (style[p.key] >= p.threshold) continue;
    const pool = WEAKNESS_POOL[p.poolKey] ?? [];
    if (pool.length) {
      areas.push(pool[pickIndex(seed + idx++, pool.length)]);
    }
  }
  if (stats) {
    if (stats.winRate < 42 && stats.gameCount >= 8) {
      areas.push(
        WEAKNESS_POOL.stats[pickIndex(seed + 20, WEAKNESS_POOL.stats.length)]
      );
    } else if (stats.drawRate > 48 && stats.winRate < 40) {
      areas.push(WEAKNESS_POOL.stats[1]);
    }
    const top = stats.topOpenings?.[0];
    if (top?.name && style.openingTheory < 70) {
      areas.push(traitAlternativeLines(lang, top.name));
    }
  }
  if (areas.length < 2) {
    areas.push(
      WEAKNESS_POOL.positional[pickIndex(seed + 40, WEAKNESS_POOL.positional.length)]
    );
  }
  return [...new Set(areas)].slice(0, 3);
}



export function findStrengths(
  style: PlayingStyle,
  seed: number,
  stats?: PersonaStats,
  lang: TraitLang = "fr"
): string[] {
  const STRENGTH_POOL = STRENGTH_POOLS[lang];
  const strengths: string[] = [];
  const strongPoints: { key: keyof PlayingStyle; poolKey: string; threshold: number }[] = [
    { key: "aggression", poolKey: "aggression", threshold: 72 },
    { key: "tactical", poolKey: "tactical", threshold: 72 },
    { key: "positional", poolKey: "positional", threshold: 72 },
    { key: "endgame", poolKey: "endgame", threshold: 72 },
    { key: "openingTheory", poolKey: "openingTheory", threshold: 72 },
    { key: "timeManagement", poolKey: "timeManagement", threshold: 72 },
  ];
  let idx = 0;
  for (const p of strongPoints) {
    if (style[p.key] < p.threshold) continue;
    const pool = STRENGTH_POOL[p.poolKey] ?? [];
    if (pool.length) {
      strengths.push(pool[pickIndex(seed + idx++ * 3, pool.length)]);
    }
  }
  if (stats) {
    const top = stats.topOpenings?.[0];
    if (top?.name && top.count >= 2) {
      strengths.push(traitOpeningMastery(lang, top.name));
    }
    if (stats.winRate >= 54 && stats.gameCount >= 8) {
      strengths.push(
        STRENGTH_POOL.stats[pickIndex(seed + 11, STRENGTH_POOL.stats.length)]
      );
    }
    if (stats.style === "Agressif" && style.aggression >= 58) {
      strengths.push(traitOffensiveIdentity(lang));
    } else if (stats.style === "Solide" && style.positional >= 65) {
      strengths.push(traitStructuralSolidity(lang));
    } else if (stats.style === "Chaotique" && style.tactical >= 65) {
      strengths.push(traitUnpredictablePlay(lang));
    }
    if (stats.avgMoves >= 42) {
      strengths.push(traitLongGameEndurance(lang));
    } else if (stats.avgMoves > 0 && stats.avgMoves <= 32) {
      strengths.push(traitFastDecisions(lang));
    }
  }
  if (strengths.length < 2) {
    const fallbackPools = ["tactical", "positional", "endgame"] as const;
    const k = fallbackPools[pickIndex(seed + 50, fallbackPools.length)];
    const pool = STRENGTH_POOL[k];
    strengths.push(pool[pickIndex(seed + 51, pool.length)]);
  }
  return [...new Set(strengths)].slice(0, 3);
}

/**
 * Niveau de confiance
 */
function calculateConfidence(
  gamesPlayed: number,
  hasStats: boolean,
  stats?: PersonaStats
): number {
  const n = Math.max(gamesPlayed, stats?.gameCount ?? 0, 0);
  if (!hasStats && n < 3) return 28;
  if (n >= 200) return 95;
  if (n >= 100) return 90;
  if (n >= 50) return 80;
  if (n >= 20) return 70;
  if (n >= 10) return 55;
  if (n >= 3) return 45;
  return 38;
}

// ========================================
// Fonction Principale d'Analyse
// ========================================

/**
 * Générer une analyse complète d'un profil (hors LLM : heuristique locale + stats)
 */
export function generateAIAnalysis(
  style: PlayingStyle,
  stats?: PersonaStats,
  gamesPlayed: number = 0,
  lang: TraitLang = "fr"
): AIAnalysis {
  const seed = seedFromContext(style, stats);
  const nGames = Math.max(gamesPlayed, stats?.gameCount ?? 0, 0);
  const hasGoodData = nGames >= 3 || (stats != null && stats.gameCount > 0);

  const statInsight = buildStatsInsight(stats);
  return {
    summary: generateSummary(style, seed, stats),
    styleDescription: generateStyleDescription(style, seed, stats),
    recommendations: generateRecommendations(style, seed, stats),
    improvementAreas: findImprovementAreas(style, stats, seed, lang),
    strengths: findStrengths(style, seed, stats, lang),
    famousComparisons: findFamousComparisons(style),
    confidence: calculateConfidence(nGames, hasGoodData, stats),
    generatedAt: new Date().toISOString(),
    statsInsight: statInsight
  };
}

/**
 * Mettre à jour l'analyse dans les métadonnées
 */
export function shouldUpdateAIAnalysis(metadata: ProfileMetadata | null): boolean {
  if (!metadata || !metadata.aiUpdatedAt) return true;
  const lastUpdate = new Date(metadata.aiUpdatedAt);
  const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceUpdate >= 7;
}
