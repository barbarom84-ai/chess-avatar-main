/**
 * Bibliothèque complète d'ouvertures d'échecs
 * Avec métadonnées, caractéristiques et styles de jeu
 */

export interface Opening {
  id: string;
  name: string;
  eco: string; // Code ECO (A00-E99)
  moves: string; // Séquence de coups en notation standard
  uciMoves: string[]; // Séquence de coups en notation UCI
  fen?: string; // Position finale (optionnel)
  character: 'aggressive' | 'defensive' | 'balanced' | 'tactical' | 'positional' | 'hypermodern' | 'classical' | 'gambit';
  difficulty: 1 | 2 | 3 | 4 | 5; // 1 = débutant, 5 = expert
  popularity: 1 | 2 | 3 | 4 | 5; // Popularité générale
  color: 'white' | 'black' | 'both';
  description: string;
  famousPlayers?: string[]; // Joueurs célèbres associés
  tags: string[]; // Tags pour filtrage
}

export const OPENINGS_DATABASE: Opening[] = [
  // ========== OUVERTURES BLANCHES (e4) ==========
  {
    id: 'italian-game',
    name: 'Partie Italienne',
    eco: 'C50',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
    uciMoves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'],
    character: 'classical',
    difficulty: 2,
    popularity: 5,
    color: 'white',
    description: 'Ouverture classique visant le contrôle du centre et le développement rapide',
    famousPlayers: ['Garry Kasparov', 'Magnus Carlsen'],
    tags: ['e4', 'classique', 'développement', 'attaque'],
  },
  {
    id: 'spanish-opening',
    name: 'Ruy Lopez (Espagnole)',
    eco: 'C60',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5',
    uciMoves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'],
    character: 'classical',
    difficulty: 3,
    popularity: 5,
    color: 'white',
    description: 'L\'ouverture la plus respectée, riche en théorie et en plans stratégiques',
    famousPlayers: ['Bobby Fischer', 'Anatoly Karpov'],
    tags: ['e4', 'classique', 'positionnel', 'théorie'],
  },
  {
    id: 'kings-gambit',
    name: 'Gambit du Roi',
    eco: 'C30',
    moves: '1. e4 e5 2. f4',
    uciMoves: ['e2e4', 'e7e5', 'f2f4'],
    character: 'gambit',
    difficulty: 4,
    popularity: 3,
    color: 'white',
    description: 'Gambit agressif sacrifiant un pion pour l\'initiative et l\'attaque',
    famousPlayers: ['Mikhail Tal', 'Boris Spassky'],
    tags: ['e4', 'gambit', 'agressif', 'sacrifice', 'attaque'],
  },
  {
    id: 'vienna-game',
    name: 'Partie Viennoise',
    eco: 'C25',
    moves: '1. e4 e5 2. Nc3',
    uciMoves: ['e2e4', 'e7e5', 'b1c3'],
    character: 'tactical',
    difficulty: 3,
    popularity: 3,
    color: 'white',
    description: 'Ouverture flexible préparant f4 ou d4 avec possibilités tactiques',
    famousPlayers: ['Stanley Rabinowitz'],
    tags: ['e4', 'flexible', 'tactique'],
  },
  {
    id: 'scotch-game',
    name: 'Partie Écossaise',
    eco: 'C44',
    moves: '1. e4 e5 2. Nf3 Nc6 3. d4',
    uciMoves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'd2d4'],
    character: 'aggressive',
    difficulty: 2,
    popularity: 4,
    color: 'white',
    description: 'Ouverture directe ouvrant rapidement le centre',
    famousPlayers: ['Garry Kasparov'],
    tags: ['e4', 'direct', 'ouvert', 'agressif'],
  },

  // ========== DÉFENSES NOIRES CONTRE e4 ==========
  {
    id: 'sicilian-defense',
    name: 'Défense Sicilienne',
    eco: 'B20',
    moves: '1. e4 c5',
    uciMoves: ['e2e4', 'c7c5'],
    character: 'aggressive',
    difficulty: 4,
    popularity: 5,
    color: 'black',
    description: 'La défense la plus populaire, combative et déséquilibrée',
    famousPlayers: ['Bobby Fischer', 'Garry Kasparov', 'Magnus Carlsen'],
    tags: ['e4', 'agressif', 'déséquilibré', 'populaire'],
  },
  {
    id: 'french-defense',
    name: 'Défense Française',
    eco: 'C00',
    moves: '1. e4 e6',
    uciMoves: ['e2e4', 'e7e6'],
    character: 'positional',
    difficulty: 3,
    popularity: 4,
    color: 'black',
    description: 'Défense solide avec un jeu positionnel et des contre-attaques',
    famousPlayers: ['Tigran Petrosian', 'Viktor Korchnoi'],
    tags: ['e4', 'solide', 'positionnel', 'contre-attaque'],
  },
  {
    id: 'caro-kann',
    name: 'Défense Caro-Kann',
    eco: 'B10',
    moves: '1. e4 c6',
    uciMoves: ['e2e4', 'c7c6'],
    character: 'defensive',
    difficulty: 2,
    popularity: 4,
    color: 'black',
    description: 'Défense solide et fiable, prisée pour sa stabilité',
    famousPlayers: ['Anatoly Karpov', 'Fabiano Caruana'],
    tags: ['e4', 'solide', 'défensif', 'stable'],
  },
  {
    id: 'pirc-defense',
    name: 'Défense Pirc',
    eco: 'B07',
    moves: '1. e4 d6 2. d4 Nf6 3. Nc3 g6',
    uciMoves: ['e2e4', 'd7d6', 'd2d4', 'g8f6', 'b1c3', 'g7g6'],
    character: 'hypermodern',
    difficulty: 3,
    popularity: 3,
    color: 'black',
    description: 'Défense hypermoderne avec fianchetto et contre-attaque au centre',
    famousPlayers: ['Vasja Pirc', 'Tigran Petrosian'],
    tags: ['e4', 'hypermoderne', 'fianchetto', 'flexible'],
  },
  {
    id: 'alekhine-defense',
    name: 'Défense Alekhine',
    eco: 'B02',
    moves: '1. e4 Nf6',
    uciMoves: ['e2e4', 'g8f6'],
    character: 'hypermodern',
    difficulty: 4,
    popularity: 2,
    color: 'black',
    description: 'Défense hypermoderne provoquant l\'avance des pions blancs',
    famousPlayers: ['Alexander Alekhine', 'Levon Aronian'],
    tags: ['e4', 'hypermoderne', 'provocateur', 'original'],
  },

  // ========== OUVERTURES FERMÉES (d4) ==========
  {
    id: 'queens-gambit',
    name: 'Gambit Dame',
    eco: 'D06',
    moves: '1. d4 d5 2. c4',
    uciMoves: ['d2d4', 'd7d5', 'c2c4'],
    character: 'positional',
    difficulty: 3,
    popularity: 5,
    color: 'white',
    description: 'Ouverture positionnelle classique, très populaire à tous niveaux',
    famousPlayers: ['Mikhail Botvinnik', 'Anatoly Karpov', 'Magnus Carlsen'],
    tags: ['d4', 'classique', 'positionnel', 'populaire'],
  },
  {
    id: 'london-system',
    name: 'Système de Londres',
    eco: 'D02',
    moves: '1. d4 d5 2. Nf3 Nf6 3. Bf4',
    uciMoves: ['d2d4', 'd7d5', 'g1f3', 'g8f6', 'c1f4'],
    character: 'positional',
    difficulty: 2,
    popularity: 5,
    color: 'white',
    description: 'Système solide et flexible, très populaire chez les débutants',
    famousPlayers: ['Magnus Carlsen', 'Hikaru Nakamura'],
    tags: ['d4', 'système', 'solide', 'débutant', 'flexible'],
  },
  {
    id: 'kings-indian-attack',
    name: 'Attaque Indienne du Roi',
    eco: 'A07',
    moves: '1. Nf3 d5 2. g3 Nf6 3. Bg2',
    uciMoves: ['g1f3', 'd7d5', 'g2g3', 'g8f6', 'f1g2'],
    character: 'positional',
    difficulty: 2,
    popularity: 3,
    color: 'white',
    description: 'Setup flexible avec fianchetto, utilisable contre tout',
    famousPlayers: ['Bobby Fischer'],
    tags: ['système', 'fianchetto', 'flexible', 'universel'],
  },
  {
    id: 'catalan-opening',
    name: 'Catalane',
    eco: 'E00',
    moves: '1. d4 Nf6 2. c4 e6 3. g3',
    uciMoves: ['d2d4', 'g8f6', 'c2c4', 'e7e6', 'g2g3'],
    character: 'positional',
    difficulty: 4,
    popularity: 4,
    color: 'white',
    description: 'Ouverture sophistiquée combinant le Gambit Dame et le fianchetto',
    famousPlayers: ['Vladimir Kramnik', 'Magnus Carlsen'],
    tags: ['d4', 'positionnel', 'fianchetto', 'sophistiqué'],
  },

  // ========== DÉFENSES INDIENNES ==========
  {
    id: 'kings-indian-defense',
    name: 'Défense Indienne du Roi',
    eco: 'E60',
    moves: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7',
    uciMoves: ['d2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3', 'f8g7'],
    character: 'aggressive',
    difficulty: 4,
    popularity: 4,
    color: 'black',
    description: 'Défense dynamique avec fianchetto et attaque sur l\'aile roi',
    famousPlayers: ['Bobby Fischer', 'Garry Kasparov', 'Hikaru Nakamura'],
    tags: ['d4', 'fianchetto', 'agressif', 'dynamique'],
  },
  {
    id: 'nimzo-indian-defense',
    name: 'Défense Nimzo-Indienne',
    eco: 'E20',
    moves: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4',
    uciMoves: ['d2d4', 'g8f6', 'c2c4', 'e7e6', 'b1c3', 'f8b4'],
    character: 'positional',
    difficulty: 4,
    popularity: 5,
    color: 'black',
    description: 'Défense hypermoderne contrôlant le centre à distance',
    famousPlayers: ['Aron Nimzowitsch', 'Garry Kasparov', 'Viswanathan Anand'],
    tags: ['d4', 'hypermoderne', 'positionnel', 'contrôle'],
  },
  {
    id: 'grunfeld-defense',
    name: 'Défense Grünfeld',
    eco: 'D70',
    moves: '1. d4 Nf6 2. c4 g6 3. Nc3 d5',
    uciMoves: ['d2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3', 'd7d5'],
    character: 'hypermodern',
    difficulty: 5,
    popularity: 4,
    color: 'black',
    description: 'Défense hypermoderne complexe permettant aux blancs d\'occuper le centre',
    famousPlayers: ['Ernst Grünfeld', 'Garry Kasparov', 'Bobby Fischer'],
    tags: ['d4', 'hypermoderne', 'complexe', 'théorique'],
  },

  // ========== OUVERTURES IRRÉGULIÈRES ==========
  {
    id: 'english-opening',
    name: 'Ouverture Anglaise',
    eco: 'A10',
    moves: '1. c4',
    uciMoves: ['c2c4'],
    character: 'positional',
    difficulty: 3,
    popularity: 4,
    color: 'white',
    description: 'Ouverture flexible et positionnelle, très riche en transpositions',
    famousPlayers: ['Mikhail Botvinnik', 'Garry Kasparov'],
    tags: ['flexible', 'positionnel', 'transpositions'],
  },
  {
    id: 'reti-opening',
    name: 'Ouverture Réti',
    eco: 'A04',
    moves: '1. Nf3 d5 2. c4',
    uciMoves: ['g1f3', 'd7d5', 'c2c4'],
    character: 'hypermodern',
    difficulty: 3,
    popularity: 3,
    color: 'white',
    description: 'Ouverture hypermoderne contrôlant le centre à distance',
    famousPlayers: ['Richard Réti', 'Tigran Petrosian'],
    tags: ['hypermoderne', 'flexible', 'contrôle'],
  },
  {
    id: 'bird-opening',
    name: 'Ouverture Bird',
    eco: 'A02',
    moves: '1. f4',
    uciMoves: ['f2f4'],
    character: 'aggressive',
    difficulty: 3,
    popularity: 2,
    color: 'white',
    description: 'Ouverture agressive contrôlant e5 et préparant l\'attaque',
    famousPlayers: ['Henry Bird', 'Bent Larsen'],
    tags: ['agressif', 'original', 'attaque'],
  },

  // ========== GAMBITS SPÉCIAUX ==========
  {
    id: 'evans-gambit',
    name: 'Gambit Evans',
    eco: 'C51',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4',
    uciMoves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'b2b4'],
    character: 'gambit',
    difficulty: 4,
    popularity: 2,
    color: 'white',
    description: 'Gambit romantique sacrifiant un pion pour l\'initiative',
    famousPlayers: ['Garry Kasparov', 'Nigel Short'],
    tags: ['e4', 'gambit', 'romantique', 'initiative'],
  },
  {
    id: 'budapest-gambit',
    name: 'Gambit de Budapest',
    eco: 'A51',
    moves: '1. d4 Nf6 2. c4 e5',
    uciMoves: ['d2d4', 'g8f6', 'c2c4', 'e7e5'],
    character: 'gambit',
    difficulty: 3,
    popularity: 2,
    color: 'black',
    description: 'Gambit agressif contre 1.d4, cherchant l\'initiative',
    famousPlayers: ['Rudolf Spielmann'],
    tags: ['d4', 'gambit', 'agressif', 'contre-jeu'],
  },
];

/**
 * Présets thématiques pour différents styles de bots
 */
export interface OpeningRepertoire {
  name: string;
  description: string;
  style: string;
  whiteOpenings: { id: string; weight: number }[];
  blackOpenings: { id: string; weight: number }[];
}

export const REPERTOIRE_PRESETS: OpeningRepertoire[] = [
  {
    name: 'Assassin',
    description: 'Gambits agressifs et attaques violentes',
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
    description: 'Positions solides et défense impénétrable',
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
    description: 'Contrôle à distance et contre-attaques',
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
    description: 'Classiques éprouvées et théorie profonde',
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
    description: 'Mix de tout, adaptable à chaque situation',
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
    description: 'Répertoire des meilleurs joueurs mondiaux',
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

// Trouver une ouverture par ID
export function getOpeningById(id: string): Opening | undefined {
  return OPENINGS_DATABASE.find(o => o.id === id);
}

// Filtrer par couleur
export function getOpeningsByColor(color: 'white' | 'black' | 'both'): Opening[] {
  return OPENINGS_DATABASE.filter(o => o.color === color || o.color === 'both');
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

// Détecter l'ouverture à partir des coups UCI
export function detectOpening(uciMoves: string[]): Opening | null {
  if (uciMoves.length === 0) return null;
  
  // Chercher la correspondance la plus longue
  let bestMatch: Opening | null = null;
  let bestMatchLength = 0;
  
  for (const opening of OPENINGS_DATABASE) {
    const matchLength = Math.min(opening.uciMoves.length, uciMoves.length);
    let matches = 0;
    
    for (let i = 0; i < matchLength; i++) {
      if (opening.uciMoves[i] === uciMoves[i]) {
        matches++;
      } else {
        break;
      }
    }
    
    // Si tous les coups de l'ouverture correspondent et c'est la meilleure correspondance
    if (matches === opening.uciMoves.length && matches > bestMatchLength) {
      bestMatch = opening;
      bestMatchLength = matches;
    }
  }
  
  return bestMatch;
}
