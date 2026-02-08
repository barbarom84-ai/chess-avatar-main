/**
 * Système d'export UCI amélioré avec options complètes
 */

import type { EngineConfig } from './analysis';
import type { PlayingStyle } from '@/types/chess';

// ========================================
// Types et Interfaces
// ========================================

export interface UCIOptions {
  // Identité
  name: string;
  author?: string;
  
  // Options principales (existantes)
  threads: number;
  hash: number;
  depth?: number;
  moveTime?: number;
  
  // Options avancées Stockfish
  contempt?: number;              // -100 to 100
  skillLevel?: number;            // 0 to 20
  limitStrength?: boolean;
  uciElo?: number;                // 1320 to 3190
  
  // Gestion du temps
  moveOverhead?: number;          // ms
  slowMover?: number;             // 1 to 1000
  
  // Analyse
  multiPV?: number;               // 1 to 500
  syzygyPath?: string;
  syzygyProbeDepth?: number;      // 1 to 100
  syzygyProbeLimit?: number;      // 0 to 7
  
  // Autres
  ponder?: boolean;
  ownBook?: boolean;
  uciAnalyseMode?: boolean;
  
  // Métadonnées
  description?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';
  tags?: string[];
}

export interface UCIPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  options: Partial<UCIOptions>;
}

// ========================================
// Presets Prédéfinis
// ========================================

export const UCI_PRESETS: UCIPreset[] = [
  {
    id: 'beginner',
    name: 'Débutant',
    description: 'Niveau très accessible pour les joueurs débutants',
    icon: '🌱',
    options: {
      skillLevel: 5,
      limitStrength: true,
      uciElo: 1200,
      depth: 8,
      threads: 2,
      hash: 64,
      contempt: 0,
      moveOverhead: 100,
      ponder: false,
      difficulty: 'beginner'
    }
  },
  {
    id: 'intermediate',
    name: 'Intermédiaire',
    description: 'Bon équilibre pour joueurs de niveau moyen',
    icon: '📚',
    options: {
      skillLevel: 10,
      limitStrength: true,
      uciElo: 1600,
      depth: 12,
      threads: 3,
      hash: 128,
      contempt: 10,
      moveOverhead: 50,
      ponder: false,
      difficulty: 'intermediate'
    }
  },
  {
    id: 'advanced',
    name: 'Avancé',
    description: 'Challenge sérieux pour joueurs expérimentés',
    icon: '🎯',
    options: {
      skillLevel: 15,
      limitStrength: true,
      uciElo: 2000,
      depth: 16,
      threads: 4,
      hash: 256,
      contempt: 15,
      moveOverhead: 30,
      ponder: true,
      multiPV: 1,
      difficulty: 'advanced'
    }
  },
  {
    id: 'expert',
    name: 'Expert',
    description: 'Très fort, pour joueurs de club confirmés',
    icon: '⚡',
    options: {
      skillLevel: 18,
      limitStrength: true,
      uciElo: 2400,
      depth: 20,
      threads: 6,
      hash: 512,
      contempt: 20,
      moveOverhead: 20,
      ponder: true,
      multiPV: 2,
      difficulty: 'expert'
    }
  },
  {
    id: 'master',
    name: 'Maître',
    description: 'Force maximale, proche du niveau GM',
    icon: '👑',
    options: {
      skillLevel: 20,
      limitStrength: false,
      depth: 24,
      threads: 8,
      hash: 1024,
      contempt: 24,
      moveOverhead: 10,
      ponder: true,
      multiPV: 3,
      slowMover: 50,
      difficulty: 'master'
    }
  },
  {
    id: 'analysis',
    name: 'Analyse',
    description: 'Configuration optimale pour analyser des parties',
    icon: '🔍',
    options: {
      skillLevel: 20,
      limitStrength: false,
      depth: 30,
      threads: 8,
      hash: 2048,
      contempt: 0,
      multiPV: 5,
      uciAnalyseMode: true,
      ponder: false,
      difficulty: 'master'
    }
  },
  {
    id: 'aggressive',
    name: 'Agressif',
    description: 'Style agressif qui cherche les complications',
    icon: '🔥',
    options: {
      skillLevel: 15,
      depth: 16,
      threads: 4,
      hash: 256,
      contempt: 50,
      moveOverhead: 40,
      ponder: true,
      difficulty: 'advanced'
    }
  },
  {
    id: 'positional',
    name: 'Positionnel',
    description: 'Style positionnel et patient',
    icon: '🛡️',
    options: {
      skillLevel: 15,
      depth: 18,
      threads: 4,
      hash: 256,
      contempt: -20,
      slowMover: 150,
      ponder: true,
      difficulty: 'advanced'
    }
  }
];

// ========================================
// Conversion depuis PlayingStyle
// ========================================

/**
 * Convertir un PlayingStyle en options UCI
 */
export function playingStyleToUCI(
  style: PlayingStyle,
  name: string,
  baseConfig?: Partial<EngineConfig>
): UCIOptions {
  // Calculer le niveau moyen
  const avgStyle = (
    style.aggression + style.tactical + style.positional +
    style.endgame + style.openingTheory + style.timeManagement
  ) / 6;
  
  // Déterminer le skill level (0-20)
  const skillLevel = Math.round((avgStyle / 100) * 20);
  
  // Déterminer l'ELO estimé
  const uciElo = Math.round(1320 + (avgStyle / 100) * 1870); // 1320-3190
  
  // Threads basé sur tactique et temps
  const threads = style.tactical >= 80 || style.timeManagement >= 80 ? 6 :
                  style.tactical >= 60 ? 4 : 2;
  
  // Depth basé sur tactique
  const depth = style.tactical >= 80 ? 20 :
                style.tactical >= 70 ? 18 :
                style.tactical >= 60 ? 16 :
                style.tactical >= 50 ? 14 : 12;
  
  // Hash basé sur niveau
  const hash = avgStyle >= 80 ? 512 :
               avgStyle >= 70 ? 256 :
               avgStyle >= 60 ? 128 : 64;
  
  // Contempt basé sur agressivité
  const contempt = style.aggression >= 75 ? 30 :
                   style.aggression >= 60 ? 15 :
                   style.aggression >= 45 ? 0 :
                   style.aggression >= 30 ? -15 : -30;
  
  // Move overhead basé sur gestion du temps
  const moveOverhead = style.timeManagement >= 80 ? 20 :
                       style.timeManagement >= 60 ? 30 :
                       style.timeManagement >= 40 ? 50 : 100;
  
  // Slow mover basé sur positionnel
  const slowMover = style.positional >= 75 ? 150 :
                    style.positional >= 60 ? 100 : 50;
  
  // Déterminer la difficulté
  let difficulty: UCIOptions['difficulty'] = 'intermediate';
  if (avgStyle >= 85) difficulty = 'master';
  else if (avgStyle >= 70) difficulty = 'expert';
  else if (avgStyle >= 60) difficulty = 'advanced';
  else if (avgStyle >= 40) difficulty = 'intermediate';
  else difficulty = 'beginner';
  
  return {
    name,
    threads,
    hash,
    depth,
    skillLevel,
    limitStrength: skillLevel < 20,
    uciElo,
    contempt,
    moveOverhead,
    slowMover,
    ponder: avgStyle >= 60,
    multiPV: avgStyle >= 75 ? 2 : 1,
    difficulty,
    description: `Configuration générée depuis le style de jeu (avg: ${Math.round(avgStyle)}/100)`
  };
}

// ========================================
// Génération du fichier UCI
// ========================================

/**
 * Générer le contenu UCI au format texte
 */
export function generateUCIFile(options: UCIOptions): string {
  const lines: string[] = [];
  
  // Header
  lines.push('# UCI Configuration File');
  lines.push(`# Generated by Chess Avatar - ${new Date().toISOString()}`);
  lines.push(`# Engine: ${options.name}`);
  if (options.author) {
    lines.push(`# Author: ${options.author}`);
  }
  if (options.description) {
    lines.push(`# Description: ${options.description}`);
  }
  if (options.difficulty) {
    lines.push(`# Difficulty: ${options.difficulty}`);
  }
  if (options.tags && options.tags.length > 0) {
    lines.push(`# Tags: ${options.tags.join(', ')}`);
  }
  lines.push('');
  
  // Instructions
  lines.push('# Usage:');
  lines.push('# 1. Load this file in your UCI-compatible chess interface');
  lines.push('# 2. Or copy these options to your engine configuration');
  lines.push('# 3. Supported interfaces: Arena, Fritz, ChessBase, Scid, etc.');
  lines.push('');
  
  // Options UCI
  lines.push('# UCI Options');
  lines.push('');
  
  // Options principales
  if (options.threads !== undefined) {
    lines.push(`setoption name Threads value ${options.threads}`);
  }
  
  if (options.hash !== undefined) {
    lines.push(`setoption name Hash value ${options.hash}`);
  }
  
  if (options.ponder !== undefined) {
    lines.push(`setoption name Ponder value ${options.ponder ? 'true' : 'false'}`);
  }
  
  if (options.multiPV !== undefined) {
    lines.push(`setoption name MultiPV value ${options.multiPV}`);
  }
  
  // Skill Level & ELO
  if (options.skillLevel !== undefined) {
    lines.push(`setoption name Skill Level value ${options.skillLevel}`);
  }
  
  if (options.limitStrength !== undefined) {
    lines.push(`setoption name UCI_LimitStrength value ${options.limitStrength ? 'true' : 'false'}`);
  }
  
  if (options.uciElo !== undefined && options.limitStrength) {
    lines.push(`setoption name UCI_Elo value ${options.uciElo}`);
  }
  
  // Contempt
  if (options.contempt !== undefined) {
    lines.push(`setoption name Contempt value ${options.contempt}`);
  }
  
  // Gestion du temps
  if (options.moveOverhead !== undefined) {
    lines.push(`setoption name Move Overhead value ${options.moveOverhead}`);
  }
  
  if (options.slowMover !== undefined) {
    lines.push(`setoption name Slow Mover value ${options.slowMover}`);
  }
  
  // Syzygy (Tablebases)
  if (options.syzygyPath) {
    lines.push(`setoption name SyzygyPath value ${options.syzygyPath}`);
  }
  
  if (options.syzygyProbeDepth !== undefined) {
    lines.push(`setoption name SyzygyProbeDepth value ${options.syzygyProbeDepth}`);
  }
  
  if (options.syzygyProbeLimit !== undefined) {
    lines.push(`setoption name SyzygyProbeLimit value ${options.syzygyProbeLimit}`);
  }
  
  // Autres options
  if (options.ownBook !== undefined) {
    lines.push(`setoption name OwnBook value ${options.ownBook ? 'true' : 'false'}`);
  }
  
  if (options.uciAnalyseMode !== undefined) {
    lines.push(`setoption name UCI_AnalyseMode value ${options.uciAnalyseMode ? 'true' : 'false'}`);
  }
  
  lines.push('');
  
  // Commandes de base
  lines.push('# Search settings');
  if (options.depth !== undefined) {
    lines.push(`# Depth limit: ${options.depth}`);
    lines.push(`go depth ${options.depth}`);
  } else if (options.moveTime !== undefined) {
    lines.push(`# Move time: ${options.moveTime}ms`);
    lines.push(`go movetime ${options.moveTime}`);
  }
  
  lines.push('');
  
  // Footer
  lines.push('# End of UCI Configuration');
  lines.push(`# Estimated strength: ${options.uciElo || 'N/A'} ELO`);
  lines.push(`# Difficulty level: ${options.difficulty || 'custom'}`);
  
  return lines.join('\n');
}

/**
 * Télécharger le fichier UCI
 */
export function downloadUCIFile(options: UCIOptions): void {
  const content = generateUCIFile(options);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${options.name.replace(/\s+/g, '_')}_UCI_Config.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// ========================================
// Validation
// ========================================

/**
 * Valider les options UCI
 */
export function validateUCIOptions(options: Partial<UCIOptions>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!options.name || options.name.trim().length === 0) {
    errors.push('Le nom est requis');
  }
  
  if (options.threads !== undefined && (options.threads < 1 || options.threads > 512)) {
    errors.push('Threads doit être entre 1 et 512');
  }
  
  if (options.hash !== undefined && (options.hash < 1 || options.hash > 32768)) {
    errors.push('Hash doit être entre 1 et 32768 MB');
  }
  
  if (options.skillLevel !== undefined && (options.skillLevel < 0 || options.skillLevel > 20)) {
    errors.push('Skill Level doit être entre 0 et 20');
  }
  
  if (options.uciElo !== undefined && (options.uciElo < 1320 || options.uciElo > 3190)) {
    errors.push('UCI_Elo doit être entre 1320 et 3190');
  }
  
  if (options.contempt !== undefined && (options.contempt < -100 || options.contempt > 100)) {
    errors.push('Contempt doit être entre -100 et 100');
  }
  
  if (options.depth !== undefined && (options.depth < 1 || options.depth > 100)) {
    errors.push('Depth doit être entre 1 et 100');
  }
  
  if (options.multiPV !== undefined && (options.multiPV < 1 || options.multiPV > 500)) {
    errors.push('MultiPV doit être entre 1 et 500');
  }
  
  if (options.moveOverhead !== undefined && (options.moveOverhead < 0 || options.moveOverhead > 5000)) {
    errors.push('Move Overhead doit être entre 0 et 5000 ms');
  }
  
  if (options.slowMover !== undefined && (options.slowMover < 10 || options.slowMover > 1000)) {
    errors.push('Slow Mover doit être entre 10 et 1000');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Obtenir les limites pour chaque option
 */
export const UCI_OPTION_LIMITS = {
  threads: { min: 1, max: 512, default: 4 },
  hash: { min: 1, max: 32768, default: 128 },
  skillLevel: { min: 0, max: 20, default: 20 },
  uciElo: { min: 1320, max: 3190, default: 2000 },
  contempt: { min: -100, max: 100, default: 0 },
  depth: { min: 1, max: 100, default: 16 },
  moveTime: { min: 1, max: 60000, default: 1000 },
  multiPV: { min: 1, max: 500, default: 1 },
  moveOverhead: { min: 0, max: 5000, default: 30 },
  slowMover: { min: 10, max: 1000, default: 100 },
  syzygyProbeDepth: { min: 1, max: 100, default: 1 },
  syzygyProbeLimit: { min: 0, max: 7, default: 6 }
};
