/**
 * Utilitaires pour la persistence locale des configurations
 */

import type { EngineConfig } from './analysis';
import { normalizeEnginePlatform } from './normalize-engine-platform';

const STORAGE_KEY = 'chess_persona_configs';
const RECENT_KEY = 'chess_persona_recent';

/** Identité stable pour ne pas écraser Lichess avec Chess.com (même Bot_<pseudo>). */
function engineConfigIdentity(config: EngineConfig): string {
  const name = (config.name || '').trim().toLowerCase();
  return `${name}|${normalizeEnginePlatform(config)}`;
}

export interface SavedConfig {
  id: string;
  config: EngineConfig;
  savedAt: number;
  customName?: string;
}

/**
 * Sauvegarder une configuration
 */
export function saveConfig(config: EngineConfig, customName?: string): string {
  if (typeof window === 'undefined') return '';
  
  try {
    const configs = getSavedConfigs();
    const id = `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const savedConfig: SavedConfig = {
      id,
      config,
      savedAt: Date.now(),
      customName: customName || config.name,
    };
    
    configs.push(savedConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    
    return id;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    return '';
  }
}

/**
 * Récupérer toutes les configurations sauvegardées
 */
export function getSavedConfigs(): SavedConfig[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const configs: SavedConfig[] = JSON.parse(stored);
    // Trier par date (plus récent en premier)
    return configs.sort((a, b) => b.savedAt - a.savedAt);
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    return [];
  }
}

/**
 * Récupérer une configuration par son ID
 */
export function getConfigById(id: string): SavedConfig | null {
  const configs = getSavedConfigs();
  return configs.find(c => c.id === id) || null;
}

/**
 * Supprimer une configuration
 */
export function deleteConfig(id: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const configs = getSavedConfigs();
    const filtered = configs.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    return false;
  }
}

/**
 * Sauvegarder une configuration récente (utilisée automatiquement)
 */
export function saveRecentConfig(config: EngineConfig): void {
  if (typeof window === 'undefined') return;
  
  try {
    const recent = getRecentConfigs();
    const id = engineConfigIdentity(config);

    // Doublons par nom+plateforme seulement (Lichess vs Chess.com : même Bot_<pseudo>)
    const filtered = recent.filter((c) => engineConfigIdentity(c.config) !== id);
    filtered.unshift({
      id: `recent_${Date.now()}`,
      config,
      savedAt: Date.now(),
    });

    const limited = filtered.slice(0, 10);
    localStorage.setItem(RECENT_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde récente:', error);
  }
}

/**
 * Récupérer les configurations récentes
 */
export function getRecentConfigs(): SavedConfig[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    if (!stored) return [];
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Erreur lors de la récupération récente:', error);
    return [];
  }
}

/**
 * Exporter toutes les configurations en JSON
 */
export function exportAllConfigs(): string {
  const configs = getSavedConfigs();
  return JSON.stringify(configs, null, 2);
}

/**
 * Importer des configurations depuis JSON
 */
export function importConfigs(jsonString: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const imported: SavedConfig[] = JSON.parse(jsonString);
    const existing = getSavedConfigs();
    
    // Fusionner sans doublons
    const merged = [...existing];
    imported.forEach(imp => {
      if (!existing.find(e => e.id === imp.id)) {
        merged.push(imp);
      }
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'importation:', error);
    return false;
  }
}

/**
 * Nettoyer les anciennes configurations (> 30 jours)
 */
export function cleanOldConfigs(): number {
  if (typeof window === 'undefined') return 0;
  
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const configs = getSavedConfigs();
  const filtered = configs.filter(c => c.savedAt > thirtyDaysAgo);
  
  const removed = configs.length - filtered.length;
  
  if (removed > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
  
  return removed;
}
