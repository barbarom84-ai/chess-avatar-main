"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

const STORAGE_KEY = 'chessboard-settings';

// Types pour les thèmes d'échiquier
export interface BoardTheme {
  id: string;
  name: string;
  lightSquare: string;
  darkSquare: string;
  selectedSquare: string;
  lastMoveLight: string;
  lastMoveDark: string;
  legalMoveEmpty: string;
  legalMoveCapture: string;
}

export interface PieceSet {
  id: string;
  name: string;
  path: string; // Chemin du dossier des pièces
  ext: string;  // Extension des fichiers ('png' ou 'svg')
  description?: string; // Description courte pour l'UI
}

export interface ChessboardSettings {
  boardTheme: BoardTheme;
  pieceSet: PieceSet;
  showCoordinates: boolean;
  showLegalMoves: boolean;
  highlightLastMove: boolean;
  animationSpeed: 'none' | 'fast' | 'normal' | 'slow';
  soundEnabled: boolean;
}

// Thèmes d'échiquier prédéfinis
export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'neon-cyan',
    name: 'Néon Cyan',
    lightSquare: '#e9edcc',
    darkSquare: '#779954',
    selectedSquare: '#bbca2b',
    lastMoveLight: '#cdd26a',
    lastMoveDark: '#aaa23a',
    legalMoveEmpty: 'rgb(34 197 94)',
    legalMoveCapture: 'rgb(239 68 68)',
  },
  {
    id: 'blue-ocean',
    name: 'Océan Bleu',
    lightSquare: '#b4e1f5',
    darkSquare: '#3a7ca5',
    selectedSquare: '#1ea7e8',
    lastMoveLight: '#7ec8e3',
    lastMoveDark: '#2980b9',
    legalMoveEmpty: 'rgb(52 211 153)',
    legalMoveCapture: 'rgb(251 146 60)',
  },
  {
    id: 'purple-haze',
    name: 'Brume Violette',
    lightSquare: '#e0c3fc',
    darkSquare: '#8965c4',
    selectedSquare: '#b794f6',
    lastMoveLight: '#c5a9ec',
    lastMoveDark: '#7952b3',
    legalMoveEmpty: 'rgb(167 139 250)',
    legalMoveCapture: 'rgb(244 114 182)',
  },
  {
    id: 'emerald-forest',
    name: 'Forêt Émeraude',
    lightSquare: '#d5f4e6',
    darkSquare: '#2d6a4f',
    selectedSquare: '#52b788',
    lastMoveLight: '#95d5b2',
    lastMoveDark: '#1b4332',
    legalMoveEmpty: 'rgb(74 222 128)',
    legalMoveCapture: 'rgb(248 113 113)',
  },
  {
    id: 'sunset-orange',
    name: 'Coucher de Soleil',
    lightSquare: '#ffd6a5',
    darkSquare: '#d97706',
    selectedSquare: '#fb923c',
    lastMoveLight: '#fdba74',
    lastMoveDark: '#c2410c',
    legalMoveEmpty: 'rgb(250 204 21)',
    legalMoveCapture: 'rgb(239 68 68)',
  },
  {
    id: 'classic-green',
    name: 'Classique Vert',
    lightSquare: '#eeeed2',
    darkSquare: '#769656',
    selectedSquare: '#bbcc44',
    lastMoveLight: '#cdd26a',
    lastMoveDark: '#aaa23a',
    legalMoveEmpty: 'rgb(132 204 22)',
    legalMoveCapture: 'rgb(239 68 68)',
  },
  {
    id: 'dark-mode',
    name: 'Mode Sombre',
    lightSquare: '#4b5563',
    darkSquare: '#1f2937',
    selectedSquare: '#60a5fa',
    lastMoveLight: '#6b7280',
    lastMoveDark: '#374151',
    legalMoveEmpty: 'rgb(59 130 246)',
    legalMoveCapture: 'rgb(239 68 68)',
  },
  {
    id: 'retro-brown',
    name: 'Rétro Marron',
    lightSquare: '#f5deb3',
    darkSquare: '#8b4513',
    selectedSquare: '#cd853f',
    lastMoveLight: '#deb887',
    lastMoveDark: '#a0522d',
    legalMoveEmpty: 'rgb(217 119 6)',
    legalMoveCapture: 'rgb(220 38 38)',
  },
];

// Sets de pièces disponibles
export const PIECE_SETS: PieceSet[] = [
  {
    id: 'neon-cyan',
    name: 'Néon Cyan',
    path: '/pieces',
    ext: 'png',
    description: 'Style néon avec circuits tech',
  },
  {
    id: 'classic',
    name: 'Classique',
    path: '/pieces/classic',
    ext: 'svg',
    description: 'Pièces Staunton traditionnelles',
  },
  {
    id: 'fireice',
    name: 'Fire & Ice',
    path: '/pieces/fireice',
    ext: 'svg',
    description: 'Pièces feu et glace contrastées',
  },
  {
    id: 'earth-stone',
    name: 'Earth & Stone',
    path: '/pieces/earth-stone',
    ext: 'svg',
    description: 'Design élégant et raffiné',
  },
];

// Helper pour construire le chemin d'une image de pièce
export function getPieceImagePath(pieceSet: PieceSet, color: string, type: string): string {
  return `${pieceSet.path}/${color}${type}.${pieceSet.ext}`;
}

const defaultSettings: ChessboardSettings = {
  boardTheme: BOARD_THEMES[0], // Néon Cyan par défaut
  pieceSet: PIECE_SETS[0],
  showCoordinates: true,
  showLegalMoves: true,
  highlightLastMove: true,
  animationSpeed: 'normal',
  soundEnabled: false,
};

function persistToStorage(data: ChessboardSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Erreur sauvegarde paramètres échiquier:', e);
  }
}

interface ChessboardSettingsContextType {
  settings: ChessboardSettings;
  updateSettings: (newSettings: Partial<ChessboardSettings>) => void;
  resetSettings: () => void;
}

const ChessboardSettingsContext = createContext<ChessboardSettingsContextType | undefined>(undefined);

export function ChessboardSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ChessboardSettings>(defaultSettings);
  const hasLoadedRef = useRef(false);

  // Charger les paramètres depuis le localStorage au montage (client uniquement)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedTheme = BOARD_THEMES.find(t => t.id === parsed.boardTheme?.id) || BOARD_THEMES[0];
        const savedPieceSet = PIECE_SETS.find(p => p.id === parsed.pieceSet?.id) || PIECE_SETS[0];
        setSettings({
          ...defaultSettings,
          ...parsed,
          boardTheme: savedTheme,
          pieceSet: savedPieceSet,
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres échiquier:', error);
    }
    hasLoadedRef.current = true;
  }, []);

  const updateSettings = (newSettings: Partial<ChessboardSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...newSettings };
      if (hasLoadedRef.current) persistToStorage(next);
      return next;
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    if (hasLoadedRef.current) persistToStorage(defaultSettings);
  };

  return (
    <ChessboardSettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </ChessboardSettingsContext.Provider>
  );
}

export function useChessboardSettings() {
  const context = useContext(ChessboardSettingsContext);
  if (!context) {
    throw new Error('useChessboardSettings must be used within ChessboardSettingsProvider');
  }
  return context;
}
