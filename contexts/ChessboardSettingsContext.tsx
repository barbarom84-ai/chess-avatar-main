"use client";

import {
  createContext,
  useContext,
  useState,
  useLayoutEffect,
  ReactNode,
} from "react";

const STORAGE_KEY = 'chessboard-settings';

// Types pour les thèmes d'échiquier
export interface BoardTheme {
  id: string;
  name: string;
  nameEn?: string;
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
  nameEn?: string;
  path: string; // Chemin du dossier des pièces
  ext: string;  // Extension des fichiers ('png' ou 'svg')
  description?: string; // Description courte pour l'UI
  descriptionEn?: string;
  premium?: boolean; // Requires premium to use
}

export interface ChessboardSettings {
  boardTheme: BoardTheme;
  pieceSet: PieceSet;
  showCoordinates: boolean;
  showLegalMoves: boolean;
  highlightLastMove: boolean;
  /** Opacité de la flèche « dernier coup » (10–100 %). */
  lastMoveArrowOpacityPercent: number;
  animationSpeed: 'none' | 'fast' | 'normal' | 'slow';
  soundEnabled: boolean;
}

// Thèmes d'échiquier prédéfinis
export interface BoardThemeWithPremium extends BoardTheme {
  premium?: boolean;
}

export const BOARD_THEMES: BoardThemeWithPremium[] = [
  {
    id: 'neon-cyan',
    name: 'Néon Cyan',
    nameEn: 'Neon Cyan',
    premium: true,
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
    nameEn: 'Ocean Blue',
    premium: false,
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
    nameEn: 'Purple Haze',
    premium: true,
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
    nameEn: 'Emerald Forest',
    premium: true,
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
    nameEn: 'Sunset',
    premium: true,
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
    nameEn: 'Classic Green',
    premium: true,
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
    nameEn: 'Dark Mode',
    premium: true,
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
    nameEn: 'Retro Brown',
    premium: true,
    lightSquare: '#f5deb3',
    darkSquare: '#8b4513',
    selectedSquare: '#cd853f',
    lastMoveLight: '#deb887',
    lastMoveDark: '#a0522d',
    legalMoveEmpty: 'rgb(217 119 6)',
    legalMoveCapture: 'rgb(220 38 38)',
  },
  {
    id: 'wood',
    name: 'Bois',
    nameEn: 'Wood',
    premium: false,
    lightSquare: '#f0d9b5',
    darkSquare: '#b58863',
    selectedSquare: '#06b6d4',
    lastMoveLight: '#fbbf24',
    lastMoveDark: '#d97706',
    legalMoveEmpty: 'rgb(6 182 212)',
    legalMoveCapture: 'rgb(239 68 68)',
  },
  {
    id: 'midnight',
    name: 'Minuit',
    nameEn: 'Midnight',
    premium: false,
    lightSquare: '#b6c2cf',
    darkSquare: '#2b3a4b',
    selectedSquare: '#22d3ee',
    lastMoveLight: '#4ade80',
    lastMoveDark: '#166534',
    legalMoveEmpty: 'rgb(34 211 238)',
    legalMoveCapture: 'rgb(244 63 94)',
  },
];

// Sets de pièces disponibles
export const PIECE_SETS: PieceSet[] = [
  {
    id: 'neon-cyan',
    name: 'Néon Cyan',
    nameEn: 'Neon Cyan',
    path: '/pieces',
    ext: 'png',
    description: 'Style néon avec circuits tech',
    descriptionEn: 'Neon style with tech circuits',
    premium: false,
  },
  {
    id: 'classic',
    name: 'Classique',
    nameEn: 'Classic',
    path: '/pieces/classic',
    ext: 'svg',
    description: 'Pièces Staunton traditionnelles',
    descriptionEn: 'Traditional Staunton pieces',
    premium: false,
  },
  {
    id: 'fireice',
    name: 'Fire & Ice',
    nameEn: 'Fire & Ice',
    path: '/pieces/fireice',
    ext: 'svg',
    description: 'Pièces feu et glace contrastées',
    descriptionEn: 'Contrasting fire and ice pieces',
    premium: true,
  },
  {
    id: 'earth-stone',
    name: 'Earth & Stone',
    nameEn: 'Earth & Stone',
    path: '/pieces/earth-stone',
    ext: 'svg',
    description: 'Design élégant et raffiné',
    descriptionEn: 'Elegant and refined design',
    premium: true,
  },
  {
    id: 'cburnett',
    name: 'CBurnett',
    nameEn: 'CBurnett',
    path: '/pieces/cburnett',
    ext: 'svg',
    description: 'Moderne et clair',
    descriptionEn: 'Modern and clean',
    premium: false,
  },
  {
    id: 'merida',
    name: 'Merida',
    nameEn: 'Merida',
    path: '/pieces/merida',
    ext: 'svg',
    description: 'Classique traditionnel',
    descriptionEn: 'Traditional classic',
    premium: false,
  },
  {
    id: 'alpha',
    name: 'Alpha',
    nameEn: 'Alpha',
    path: '/pieces/alpha',
    ext: 'svg',
    description: 'Minimaliste',
    descriptionEn: 'Minimalist',
    premium: false,
  },
  {
    id: 'pirouetti',
    name: 'Pirouetti',
    nameEn: 'Pirouetti',
    path: '/pieces/pirouetti',
    ext: 'svg',
    description: 'Artistique',
    descriptionEn: 'Artistic',
    premium: false,
  },
];

// Helper pour construire le chemin d'une image de pièce
export function getPieceImagePath(pieceSet: PieceSet, color: string, type: string): string {
  return `${pieceSet.path}/${color}${type}.${pieceSet.ext}`;
}

const defaultSettings: ChessboardSettings = {
  boardTheme: BOARD_THEMES[1], // Océan Bleu par défaut (gratuit)
  pieceSet: PIECE_SETS[0],
  showCoordinates: true,
  showLegalMoves: true,
  highlightLastMove: true,
  lastMoveArrowOpacityPercent: 45,
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

  // useLayoutEffect : charge le localStorage avant le premier paint client, évite d'écraser
  // un changement utilisateur et garantit que persist dans updateSettings est cohérent.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedTheme =
          BOARD_THEMES.find((t) => t.id === parsed.boardTheme?.id) ??
          defaultSettings.boardTheme;
        const savedPieceSet =
          PIECE_SETS.find((p) => p.id === parsed.pieceSet?.id) ??
          defaultSettings.pieceSet;
        const rawOp = parsed.lastMoveArrowOpacityPercent;
        const clampedOp =
          typeof rawOp === "number" && !Number.isNaN(rawOp)
            ? Math.min(100, Math.max(10, Math.round(rawOp)))
            : defaultSettings.lastMoveArrowOpacityPercent;
        setSettings({
          ...defaultSettings,
          ...parsed,
          boardTheme: savedTheme,
          pieceSet: savedPieceSet,
          lastMoveArrowOpacityPercent: clampedOp,
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres échiquier:", error);
    }
  }, []);

  const updateSettings = (newSettings: Partial<ChessboardSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...newSettings };
      if (typeof window !== "undefined") persistToStorage(next);
      return next;
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    if (typeof window !== "undefined") persistToStorage(defaultSettings);
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
