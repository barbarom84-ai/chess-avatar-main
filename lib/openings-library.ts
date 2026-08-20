/**
 * Bibliothèque complète d'ouvertures d'échecs
 * Avec métadonnées, caractéristiques et styles de jeu
 * (Lignes supplémentaires : `lib/data/openings/partitions/*.json` — voir openings-registry.)
 */

export interface Opening {
  id: string;
  name: string;
  nameEn?: string;
  eco: string; // Code ECO (A00-E99)
  moves: string; // Séquence de coups en notation standard
  uciMoves: string[]; // Séquence de coups en notation UCI
  fen?: string; // Position finale (optionnel)
  character: 'aggressive' | 'defensive' | 'balanced' | 'tactical' | 'positional' | 'hypermodern' | 'classical' | 'gambit';
  difficulty: 1 | 2 | 3 | 4 | 5; // 1 = débutant, 5 = expert
  popularity: 1 | 2 | 3 | 4 | 5; // Popularité générale
  color: 'white' | 'black' | 'both';
  description: string;
  descriptionEn?: string;
  famousPlayers?: string[]; // Joueurs célèbres associés
  tags: string[]; // Tags pour filtrage
}

// Helper: get localized opening name
export function getOpeningName(opening: Opening, lang: string): string {
  return lang === 'en' && opening.nameEn ? opening.nameEn : opening.name;
}

// Helper: get localized opening description
export function getOpeningDescription(opening: Opening, lang: string): string {
  return lang === 'en' && opening.descriptionEn ? opening.descriptionEn : opening.description;
}

export const OPENINGS_DATABASE: Opening[] = [
  // ========== OUVERTURES BLANCHES (e4) ==========
  {
    id: 'italian-game',
    name: 'Partie Italienne',
    nameEn: 'Italian Game',
    eco: 'C50',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
    uciMoves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'],
    character: 'classical',
    difficulty: 2,
    popularity: 5,
    color: 'white',
    description: 'Ouverture classique visant le contrôle du centre et le développement rapide',
    descriptionEn: 'Classical opening aiming for center control and rapid development',
    famousPlayers: ['Garry Kasparov', 'Magnus Carlsen'],
    tags: ['e4', 'classique', 'développement', 'attaque'],
  },
  {
    id: 'spanish-opening',
    name: 'Ruy Lopez (Espagnole)',
    nameEn: 'Ruy Lopez (Spanish)',
    eco: 'C60',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5',
    uciMoves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'],
    character: 'classical',
    difficulty: 3,
    popularity: 5,
    color: 'white',
    description: 'L\'ouverture la plus respectée, riche en théorie et en plans stratégiques',
    descriptionEn: 'The most respected opening, rich in theory and strategic plans',
    famousPlayers: ['Bobby Fischer', 'Anatoly Karpov'],
    tags: ['e4', 'classique', 'positionnel', 'théorie'],
  },
  {
    id: 'kings-gambit',
    name: 'Gambit du Roi',
    nameEn: 'King\'s Gambit',
    eco: 'C30',
    moves: '1. e4 e5 2. f4',
    uciMoves: ['e2e4', 'e7e5', 'f2f4'],
    character: 'gambit',
    difficulty: 4,
    popularity: 3,
    color: 'white',
    description: 'Gambit agressif sacrifiant un pion pour l\'initiative et l\'attaque',
    descriptionEn: 'Aggressive gambit sacrificing a pawn for initiative and attack',
    famousPlayers: ['Mikhail Tal', 'Boris Spassky'],
    tags: ['e4', 'gambit', 'agressif', 'sacrifice', 'attaque'],
  },
  {
    id: 'vienna-game',
    name: 'Partie Viennoise',
    nameEn: 'Vienna Game',
    eco: 'C25',
    moves: '1. e4 e5 2. Nc3',
    uciMoves: ['e2e4', 'e7e5', 'b1c3'],
    character: 'tactical',
    difficulty: 3,
    popularity: 3,
    color: 'white',
    description: 'Ouverture flexible préparant f4 ou d4 avec possibilités tactiques',
    descriptionEn: 'Flexible opening preparing f4 or d4 with tactical possibilities',
    famousPlayers: ['Stanley Rabinowitz'],
    tags: ['e4', 'flexible', 'tactique'],
  },
  {
    id: 'scotch-game',
    name: 'Partie Écossaise',
    nameEn: 'Scotch Game',
    eco: 'C44',
    moves: '1. e4 e5 2. Nf3 Nc6 3. d4',
    uciMoves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'd2d4'],
    character: 'aggressive',
    difficulty: 2,
    popularity: 4,
    color: 'white',
    description: 'Ouverture directe ouvrant rapidement le centre',
    descriptionEn: 'Direct opening quickly opening the center',
    famousPlayers: ['Garry Kasparov'],
    tags: ['e4', 'direct', 'ouvert', 'agressif'],
  },

  // ========== DÉFENSES NOIRES CONTRE e4 ==========
  {
    id: 'sicilian-defense',
    name: 'Défense Sicilienne',
    nameEn: 'Sicilian Defense',
    eco: 'B20',
    moves: '1. e4 c5',
    uciMoves: ['e2e4', 'c7c5'],
    character: 'aggressive',
    difficulty: 4,
    popularity: 5,
    color: 'black',
    description: 'La défense la plus populaire, combative et déséquilibrée',
    descriptionEn: 'The most popular defense, combative and unbalanced',
    famousPlayers: ['Bobby Fischer', 'Garry Kasparov', 'Magnus Carlsen'],
    tags: ['e4', 'agressif', 'déséquilibré', 'populaire'],
  },
  {
    id: 'french-defense',
    name: 'Défense Française',
    nameEn: 'French Defense',
    eco: 'C00',
    moves: '1. e4 e6',
    uciMoves: ['e2e4', 'e7e6'],
    character: 'positional',
    difficulty: 3,
    popularity: 4,
    color: 'black',
    description: 'Défense solide avec un jeu positionnel et des contre-attaques',
    descriptionEn: 'Solid defense with positional play and counterattacks',
    famousPlayers: ['Tigran Petrosian', 'Viktor Korchnoi'],
    tags: ['e4', 'solide', 'positionnel', 'contre-attaque'],
  },
  {
    id: 'caro-kann',
    name: 'Défense Caro-Kann',
    nameEn: 'Caro-Kann Defense',
    eco: 'B10',
    moves: '1. e4 c6',
    uciMoves: ['e2e4', 'c7c6'],
    character: 'defensive',
    difficulty: 2,
    popularity: 4,
    color: 'black',
    description: 'Défense solide et fiable, prisée pour sa stabilité',
    descriptionEn: 'Solid and reliable defense, prized for its stability',
    famousPlayers: ['Anatoly Karpov', 'Fabiano Caruana'],
    tags: ['e4', 'solide', 'défensif', 'stable'],
  },
  {
    id: 'pirc-defense',
    name: 'Défense Pirc',
    nameEn: 'Pirc Defense',
    eco: 'B07',
    moves: '1. e4 d6 2. d4 Nf6 3. Nc3 g6',
    uciMoves: ['e2e4', 'd7d6', 'd2d4', 'g8f6', 'b1c3', 'g7g6'],
    character: 'hypermodern',
    difficulty: 3,
    popularity: 3,
    color: 'black',
    description: 'Défense hypermoderne avec fianchetto et contre-attaque au centre',
    descriptionEn: 'Hypermodern defense with fianchetto and center counterattack',
    famousPlayers: ['Vasja Pirc', 'Tigran Petrosian'],
    tags: ['e4', 'hypermoderne', 'fianchetto', 'flexible'],
  },
  {
    id: 'alekhine-defense',
    name: 'Défense Alekhine',
    nameEn: 'Alekhine\'s Defense',
    eco: 'B02',
    moves: '1. e4 Nf6',
    uciMoves: ['e2e4', 'g8f6'],
    character: 'hypermodern',
    difficulty: 4,
    popularity: 2,
    color: 'black',
    description: 'Défense hypermoderne provoquant l\'avance des pions blancs',
    descriptionEn: 'Hypermodern defense provoking White\'s pawn advance',
    famousPlayers: ['Alexander Alekhine', 'Levon Aronian'],
    tags: ['e4', 'hypermoderne', 'provocateur', 'original'],
  },

  // ========== OUVERTURES FERMÉES (d4) ==========
  {
    id: 'queens-gambit',
    name: 'Gambit Dame',
    nameEn: 'Queen\'s Gambit',
    eco: 'D06',
    moves: '1. d4 d5 2. c4',
    uciMoves: ['d2d4', 'd7d5', 'c2c4'],
    character: 'positional',
    difficulty: 3,
    popularity: 5,
    color: 'white',
    description: 'Ouverture positionnelle classique, très populaire à tous niveaux',
    descriptionEn: 'Classical positional opening, very popular at all levels',
    famousPlayers: ['Mikhail Botvinnik', 'Anatoly Karpov', 'Magnus Carlsen'],
    tags: ['d4', 'classique', 'positionnel', 'populaire'],
  },
  {
    id: 'london-system',
    name: 'Système de Londres',
    nameEn: 'London System',
    eco: 'D02',
    moves: '1. d4 d5 2. Nf3 Nf6 3. Bf4',
    uciMoves: ['d2d4', 'd7d5', 'g1f3', 'g8f6', 'c1f4'],
    character: 'positional',
    difficulty: 2,
    popularity: 5,
    color: 'white',
    description: 'Système solide et flexible, très populaire chez les débutants',
    descriptionEn: 'Solid and flexible system, very popular with beginners',
    famousPlayers: ['Magnus Carlsen', 'Hikaru Nakamura'],
    tags: ['d4', 'système', 'solide', 'débutant', 'flexible'],
  },
  {
    id: 'kings-indian-attack',
    name: 'Attaque Indienne du Roi',
    nameEn: 'King\'s Indian Attack',
    eco: 'A07',
    moves: '1. Nf3 d5 2. g3 Nf6 3. Bg2',
    uciMoves: ['g1f3', 'd7d5', 'g2g3', 'g8f6', 'f1g2'],
    character: 'positional',
    difficulty: 2,
    popularity: 3,
    color: 'white',
    description: 'Setup flexible avec fianchetto, utilisable contre tout',
    descriptionEn: 'Flexible setup with fianchetto, usable against anything',
    famousPlayers: ['Bobby Fischer'],
    tags: ['système', 'fianchetto', 'flexible', 'universel'],
  },
  {
    id: 'catalan-opening',
    name: 'Catalane',
    nameEn: 'Catalan Opening',
    eco: 'E00',
    moves: '1. d4 Nf6 2. c4 e6 3. g3',
    uciMoves: ['d2d4', 'g8f6', 'c2c4', 'e7e6', 'g2g3'],
    character: 'positional',
    difficulty: 4,
    popularity: 4,
    color: 'white',
    description: 'Ouverture sophistiquée combinant le Gambit Dame et le fianchetto',
    descriptionEn: 'Sophisticated opening combining the Queen\'s Gambit and fianchetto',
    famousPlayers: ['Vladimir Kramnik', 'Magnus Carlsen'],
    tags: ['d4', 'positionnel', 'fianchetto', 'sophistiqué'],
  },

  // ========== DÉFENSES INDIENNES ==========
  {
    id: 'kings-indian-defense',
    name: 'Défense Indienne du Roi',
    nameEn: 'King\'s Indian Defense',
    eco: 'E60',
    moves: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7',
    uciMoves: ['d2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3', 'f8g7'],
    character: 'aggressive',
    difficulty: 4,
    popularity: 4,
    color: 'black',
    description: 'Défense dynamique avec fianchetto et attaque sur l\'aile roi',
    descriptionEn: 'Dynamic defense with fianchetto and kingside attack',
    famousPlayers: ['Bobby Fischer', 'Garry Kasparov', 'Hikaru Nakamura'],
    tags: ['d4', 'fianchetto', 'agressif', 'dynamique'],
  },
  {
    id: 'nimzo-indian-defense',
    name: 'Défense Nimzo-Indienne',
    nameEn: 'Nimzo-Indian Defense',
    eco: 'E20',
    moves: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4',
    uciMoves: ['d2d4', 'g8f6', 'c2c4', 'e7e6', 'b1c3', 'f8b4'],
    character: 'positional',
    difficulty: 4,
    popularity: 5,
    color: 'black',
    description: 'Défense hypermoderne contrôlant le centre à distance',
    descriptionEn: 'Hypermodern defense controlling the center from a distance',
    famousPlayers: ['Aron Nimzowitsch', 'Garry Kasparov', 'Viswanathan Anand'],
    tags: ['d4', 'hypermoderne', 'positionnel', 'contrôle'],
  },
  {
    id: 'grunfeld-defense',
    name: 'Défense Grünfeld',
    nameEn: 'Grünfeld Defense',
    eco: 'D70',
    moves: '1. d4 Nf6 2. c4 g6 3. Nc3 d5',
    uciMoves: ['d2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3', 'd7d5'],
    character: 'hypermodern',
    difficulty: 5,
    popularity: 4,
    color: 'black',
    description: 'Défense hypermoderne complexe permettant aux blancs d\'occuper le centre',
    descriptionEn: 'Complex hypermodern defense allowing White to occupy the center',
    famousPlayers: ['Ernst Grünfeld', 'Garry Kasparov', 'Bobby Fischer'],
    tags: ['d4', 'hypermoderne', 'complexe', 'théorique'],
  },

  // ========== OUVERTURES IRRÉGULIÈRES ==========
  {
    id: 'english-opening',
    name: 'Ouverture Anglaise',
    nameEn: 'English Opening',
    eco: 'A10',
    moves: '1. c4',
    uciMoves: ['c2c4'],
    character: 'positional',
    difficulty: 3,
    popularity: 4,
    color: 'white',
    description: 'Ouverture flexible et positionnelle, très riche en transpositions',
    descriptionEn: 'Flexible and positional opening, very rich in transpositions',
    famousPlayers: ['Mikhail Botvinnik', 'Garry Kasparov'],
    tags: ['flexible', 'positionnel', 'transpositions'],
  },
  {
    id: 'reti-opening',
    name: 'Ouverture Réti',
    nameEn: 'Réti Opening',
    eco: 'A04',
    moves: '1. Nf3 d5 2. c4',
    uciMoves: ['g1f3', 'd7d5', 'c2c4'],
    character: 'hypermodern',
    difficulty: 3,
    popularity: 3,
    color: 'white',
    description: 'Ouverture hypermoderne contrôlant le centre à distance',
    descriptionEn: 'Hypermodern opening controlling the center from a distance',
    famousPlayers: ['Richard Réti', 'Tigran Petrosian'],
    tags: ['hypermoderne', 'flexible', 'contrôle'],
  },
  {
    id: 'bird-opening',
    name: 'Ouverture Bird',
    nameEn: 'Bird\'s Opening',
    eco: 'A02',
    moves: '1. f4',
    uciMoves: ['f2f4'],
    character: 'aggressive',
    difficulty: 3,
    popularity: 2,
    color: 'white',
    description: 'Ouverture agressive contrôlant e5 et préparant l\'attaque',
    descriptionEn: 'Aggressive opening controlling e5 and preparing an attack',
    famousPlayers: ['Henry Bird', 'Bent Larsen'],
    tags: ['agressif', 'original', 'attaque'],
  },

  // ========== GAMBITS SPÉCIAUX ==========
  {
    id: 'evans-gambit',
    name: 'Gambit Evans',
    nameEn: 'Evans Gambit',
    eco: 'C51',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4',
    uciMoves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'b2b4'],
    character: 'gambit',
    difficulty: 4,
    popularity: 2,
    color: 'white',
    description: 'Gambit romantique sacrifiant un pion pour l\'initiative',
    descriptionEn: 'Romantic gambit sacrificing a pawn for the initiative',
    famousPlayers: ['Garry Kasparov', 'Nigel Short'],
    tags: ['e4', 'gambit', 'romantique', 'initiative'],
  },
  {
    id: 'budapest-gambit',
    name: 'Gambit de Budapest',
    nameEn: 'Budapest Gambit',
    eco: 'A51',
    moves: '1. d4 Nf6 2. c4 e5',
    uciMoves: ['d2d4', 'g8f6', 'c2c4', 'e7e5'],
    character: 'gambit',
    difficulty: 3,
    popularity: 2,
    color: 'black',
    description: 'Gambit agressif contre 1.d4, cherchant l\'initiative',
    descriptionEn: 'Aggressive gambit against 1.d4, seeking the initiative',
    famousPlayers: ['Rudolf Spielmann'],
    tags: ['d4', 'gambit', 'agressif', 'contre-jeu'],
  },
];

/**
 * Présets thématiques pour différents styles de bots
 */
export interface OpeningRepertoire {
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  style: string;
  whiteOpenings: { id: string; weight: number }[];
  blackOpenings: { id: string; weight: number }[];
}

// Helper: get localized preset name
export function getPresetName(preset: OpeningRepertoire, lang: string): string {
  return lang === 'en' && preset.nameEn ? preset.nameEn : preset.name;
}

// Helper: get localized preset description
export function getPresetDescription(preset: OpeningRepertoire, lang: string): string {
  return lang === 'en' && preset.descriptionEn ? preset.descriptionEn : preset.description;
}

export const REPERTOIRE_PRESETS: OpeningRepertoire[] = [
  {
    name: 'Assassin',
    nameEn: 'Assassin',
    description: 'Gambits agressifs et attaques violentes',
    descriptionEn: 'Aggressive gambits and violent attacks',
    style: 'aggressive',
    whiteOpenings: [
      { id: 'kings-gambit', weight: 40 },
      { id: 'evans-gambit', weight: 30 },
      { id: 'italian-game', weight: 20 },
      { id: 'bird-opening', weight: 10 },
    ],
    blackOpenings: [
      { id: 'sicilian-defense', weight: 50 },
      { id: 'budapest-gambit', weight: 30 },
      { id: 'alekhine-defense', weight: 20 },
    ],
  },
  {
    name: 'Forteresse',
    nameEn: 'Fortress',
    description: 'Positions solides et défense impénétrable',
    descriptionEn: 'Solid positions and impenetrable defense',
    style: 'defensive',
    whiteOpenings: [
      { id: 'london-system', weight: 60 },
      { id: 'queens-gambit', weight: 30 },
      { id: 'english-opening', weight: 10 },
    ],
    blackOpenings: [
      { id: 'caro-kann', weight: 50 },
      { id: 'french-defense', weight: 30 },
      { id: 'nimzo-indian-defense', weight: 20 },
    ],
  },
  {
    name: 'Hypermoderne',
    nameEn: 'Hypermodern',
    description: 'Contrôle à distance et contre-attaques',
    descriptionEn: 'Remote control and counterattacks',
    style: 'hypermodern',
    whiteOpenings: [
      { id: 'reti-opening', weight: 40 },
      { id: 'english-opening', weight: 30 },
      { id: 'catalan-opening', weight: 30 },
    ],
    blackOpenings: [
      { id: 'alekhine-defense', weight: 35 },
      { id: 'grunfeld-defense', weight: 35 },
      { id: 'pirc-defense', weight: 30 },
    ],
  },
  {
    name: 'Old School',
    nameEn: 'Old School',
    description: 'Classiques éprouvées et théorie profonde',
    descriptionEn: 'Proven classics and deep theory',
    style: 'classical',
    whiteOpenings: [
      { id: 'spanish-opening', weight: 50 },
      { id: 'italian-game', weight: 30 },
      { id: 'queens-gambit', weight: 20 },
    ],
    blackOpenings: [
      { id: 'french-defense', weight: 40 },
      { id: 'caro-kann', weight: 30 },
      { id: 'nimzo-indian-defense', weight: 30 },
    ],
  },
  {
    name: 'Équilibré',
    nameEn: 'Balanced',
    description: 'Mix de tout, adaptable à chaque situation',
    descriptionEn: 'Mix of everything, adaptable to any situation',
    style: 'balanced',
    whiteOpenings: [
      { id: 'italian-game', weight: 25 },
      { id: 'spanish-opening', weight: 25 },
      { id: 'queens-gambit', weight: 25 },
      { id: 'english-opening', weight: 25 },
    ],
    blackOpenings: [
      { id: 'sicilian-defense', weight: 30 },
      { id: 'french-defense', weight: 25 },
      { id: 'caro-kann', weight: 20 },
      { id: 'kings-indian-defense', weight: 25 },
    ],
  },
  {
    name: 'Grand Maître',
    nameEn: 'Grandmaster',
    description: 'Répertoire des meilleurs joueurs mondiaux',
    descriptionEn: 'Repertoire of the world\'s best players',
    style: 'grandmaster',
    whiteOpenings: [
      { id: 'spanish-opening', weight: 35 },
      { id: 'queens-gambit', weight: 30 },
      { id: 'catalan-opening', weight: 20 },
      { id: 'english-opening', weight: 15 },
    ],
    blackOpenings: [
      { id: 'sicilian-defense', weight: 40 },
      { id: 'nimzo-indian-defense', weight: 30 },
      { id: 'kings-indian-defense', weight: 20 },
      { id: 'grunfeld-defense', weight: 10 },
    ],
  },
];

/**
 * Utilitaires
 */

/** Noyau curated uniquement — pour le catalogue complet voir `getOpeningById` dans openings-registry. */
export function getOpeningByIdFromCore(id: string): Opening | undefined {
  return OPENINGS_DATABASE.find((o) => o.id === id);
}

/** Alias kept for callers that still import from openings-library. */
export function getOpeningById(id: string): Opening | undefined {
  return getOpeningByIdFromCore(id);
}

// Filtrer par couleur (noyau)
export function getOpeningsByColor(color: 'white' | 'black' | 'both'): Opening[] {
  return OPENINGS_DATABASE.filter((o) => o.color === color || o.color === 'both');
}

// Filtrer par caractère
export function getOpeningsByCharacter(character: Opening['character']): Opening[] {
  return OPENINGS_DATABASE.filter(o => o.character === character);
}

// Filtrer par difficulté
export function getOpeningsByDifficulty(maxDifficulty: number): Opening[] {
  return OPENINGS_DATABASE.filter(o => o.difficulty <= maxDifficulty);
}

// Obtenir un preset par nom
export function getPresetByName(name: string): OpeningRepertoire | undefined {
  return REPERTOIRE_PRESETS.find(p => p.name === name);
}

// Sélectionner une ouverture aléatoire selon les poids
export function selectRandomOpening(
  openings: { id: string; weight: number }[]
): string | null {
  if (openings.length === 0) return null;
  
  const totalWeight = openings.reduce((sum, o) => sum + o.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const opening of openings) {
    random -= opening.weight;
    if (random <= 0) {
      return opening.id;
    }
  }
  
  return openings[0].id;
}

export interface PrefixMatchResult {
  opening: Opening | null;
  /** Demi-coups initiaux qui coïncident avec la ligne en base (préfixe commun). */
  matchedPlies: number;
}

