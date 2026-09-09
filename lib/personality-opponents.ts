import type { EngineConfig } from "@/lib/analysis";
import type { PlayingStyle } from "@/types/chess";

export type PersonalityKind = "legend" | "archetype";

export type LocalizedText = { fr: string; en: string };

/** 0–100 style axes shown on the radar + risk (slider / humanizer). */
export type PersonalityStyleDimensions = PlayingStyle & {
  /** Chance of speculative / imprecise moves (maps to humanBlunderInterval). */
  risk: number;
};

export type PersonalityOpeningRef = { id: string; weight: number };

export type PersonalityAccent =
  | "amber"
  | "rose"
  | "cyan"
  | "violet"
  | "emerald"
  | "orange"
  | "sky"
  | "fuchsia"
  | "lime";

/**
 * Fritz-style personality opponent: a seeded persona (openings + style dims)
 * that compiles to the existing EngineConfig / Stockfish humanizer path.
 */
export interface PersonalityOpponent {
  id: string;
  kind: PersonalityKind;
  name: LocalizedText;
  bio: LocalizedText;
  era: LocalizedText;
  archetype: LocalizedText;
  years?: string;
  portraitInitials: string;
  accent: PersonalityAccent;
  style: PersonalityStyleDimensions;
  playStyle: EngineConfig["playStyle"];
  elo: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  favoriteOpeningId: string;
  whiteOpenings: PersonalityOpeningRef[];
  blackOpenings: PersonalityOpeningRef[];
  depth: number;
  timeControl: number;
  threads: number;
}

export const PERSONALITY_OPPONENTS: PersonalityOpponent[] = [
  {
    id: "morphy",
    kind: "legend",
    name: { fr: "Paul Morphy", en: "Paul Morphy" },
    bio: {
      fr: "Génie romantique de la Nouvelle-Orléans : développement rapide, ouvertures ouvertes et attaques sur le roi.",
      en: "Romantic genius from New Orleans: rapid development, open games, and king hunts.",
    },
    era: { fr: "Ère romantique", en: "Romantic era" },
    archetype: { fr: "Romantique", en: "Romantic" },
    years: "1837–1884",
    portraitInitials: "PM",
    accent: "amber",
    style: {
      aggression: 88,
      tactical: 90,
      positional: 28,
      endgame: 42,
      openingTheory: 45,
      timeManagement: 55,
      risk: 82,
    },
    playStyle: "agressif",
    elo: 2700,
    difficulty: 4,
    favoriteOpeningId: "evans-gambit",
    whiteOpenings: [
      { id: "evans-gambit", weight: 45 },
      { id: "italian-game", weight: 35 },
      { id: "kings-gambit", weight: 20 },
    ],
    blackOpenings: [
      { id: "italian-game", weight: 55 },
      { id: "evans-gambit", weight: 45 },
    ],
    depth: 14,
    timeControl: 700,
    threads: 2,
  },
  {
    id: "lasker",
    kind: "legend",
    name: { fr: "Emanuel Lasker", en: "Emanuel Lasker" },
    bio: {
      fr: "Champion du monde pragmatique : psychologie, prises d’échange et positions légèrement inférieures mais jouables.",
      en: "Pragmatic world champion: psychology, exchange-minded play, and slightly worse but playable positions.",
    },
    era: { fr: "École classique", en: "Classical school" },
    archetype: { fr: "Pragmatique", en: "Pragmatic" },
    years: "1868–1941",
    portraitInitials: "EL",
    accent: "violet",
    style: {
      aggression: 55,
      tactical: 62,
      positional: 68,
      endgame: 78,
      openingTheory: 58,
      timeManagement: 80,
      risk: 64,
    },
    playStyle: "équilibré",
    elo: 2720,
    difficulty: 4,
    favoriteOpeningId: "spanish-opening",
    whiteOpenings: [
      { id: "spanish-opening", weight: 55 },
      { id: "queens-gambit", weight: 30 },
      { id: "london-system", weight: 15 },
    ],
    blackOpenings: [
      { id: "french-defense", weight: 45 },
      { id: "sicilian-defense", weight: 30 },
      { id: "italian-game", weight: 25 },
    ],
    depth: 15,
    timeControl: 750,
    threads: 2,
  },
  {
    id: "capablanca",
    kind: "legend",
    name: { fr: "José Raúl Capablanca", en: "José Raúl Capablanca" },
    bio: {
      fr: "La machine à simplifier : clarté positionnelle, finales impeccables et peu de risques inutiles.",
      en: "The simplifying machine: positional clarity, impeccable endgames, and few unnecessary risks.",
    },
    era: { fr: "École cubaine", en: "Cuban school" },
    archetype: { fr: "Positionnel", en: "Positional" },
    years: "1888–1942",
    portraitInitials: "JC",
    accent: "cyan",
    style: {
      aggression: 32,
      tactical: 40,
      positional: 92,
      endgame: 95,
      openingTheory: 60,
      timeManagement: 88,
      risk: 18,
    },
    playStyle: "positionnel",
    elo: 2780,
    difficulty: 5,
    favoriteOpeningId: "queens-gambit",
    whiteOpenings: [
      { id: "queens-gambit", weight: 50 },
      { id: "spanish-opening", weight: 30 },
      { id: "english-opening", weight: 20 },
    ],
    blackOpenings: [
      { id: "nimzo-indian-defense", weight: 40 },
      { id: "caro-kann", weight: 35 },
      { id: "french-defense", weight: 25 },
    ],
    depth: 16,
    timeControl: 900,
    threads: 4,
  },
  {
    id: "tal",
    kind: "legend",
    name: { fr: "Mikhail Tal", en: "Mikhail Tal" },
    bio: {
      fr: "Le magicien de Riga : sacrifices, initiative permanente et chaos calculé.",
      en: "The magician from Riga: sacrifices, constant initiative, and calculated chaos.",
    },
    era: { fr: "École soviétique", en: "Soviet school" },
    archetype: { fr: "Tactique", en: "Tactical" },
    years: "1936–1992",
    portraitInitials: "MT",
    accent: "rose",
    style: {
      aggression: 96,
      tactical: 98,
      positional: 22,
      endgame: 48,
      openingTheory: 62,
      timeManagement: 50,
      risk: 92,
    },
    playStyle: "tactique",
    elo: 2750,
    difficulty: 4,
    favoriteOpeningId: "sicilian-defense",
    whiteOpenings: [
      { id: "italian-game", weight: 30 },
      { id: "spanish-opening", weight: 25 },
      { id: "scotch-game", weight: 25 },
      { id: "kings-gambit", weight: 20 },
    ],
    blackOpenings: [
      { id: "sicilian-defense", weight: 70 },
      { id: "kings-indian-defense", weight: 30 },
    ],
    depth: 14,
    timeControl: 650,
    threads: 2,
  },
  {
    id: "fischer",
    kind: "legend",
    name: { fr: "Bobby Fischer", en: "Bobby Fischer" },
    bio: {
      fr: "Théorie chirurgicale : Espagnole et Najdorf, pression constante, peu de compromis.",
      en: "Surgical theory: Ruy Lopez and Najdorf, constant pressure, few compromises.",
    },
    era: { fr: "Guerre froide", en: "Cold War" },
    archetype: { fr: "Théoricien", en: "Theoretician" },
    years: "1943–2008",
    portraitInitials: "BF",
    accent: "orange",
    style: {
      aggression: 78,
      tactical: 80,
      positional: 70,
      endgame: 82,
      openingTheory: 96,
      timeManagement: 85,
      risk: 48,
    },
    playStyle: "agressif",
    elo: 2880,
    difficulty: 5,
    favoriteOpeningId: "spanish-opening",
    whiteOpenings: [
      { id: "spanish-opening", weight: 60 },
      { id: "kings-indian-attack", weight: 25 },
      { id: "italian-game", weight: 15 },
    ],
    blackOpenings: [
      { id: "sicilian-defense", weight: 75 },
      { id: "kings-indian-defense", weight: 25 },
    ],
    depth: 18,
    timeControl: 1000,
    threads: 4,
  },
  {
    id: "karpov",
    kind: "legend",
    name: { fr: "Anatoly Karpov", en: "Anatoly Karpov" },
    bio: {
      fr: "Le boa constrictor : étau positionnel, Caro-Kann, échanges favorables et patience.",
      en: "The boa constrictor: positional squeeze, Caro-Kann, favourable exchanges, and patience.",
    },
    era: { fr: "École soviétique", en: "Soviet school" },
    archetype: { fr: "Solide", en: "Solid" },
    years: "1951–",
    portraitInitials: "AK",
    accent: "emerald",
    style: {
      aggression: 28,
      tactical: 45,
      positional: 94,
      endgame: 90,
      openingTheory: 82,
      timeManagement: 92,
      risk: 16,
    },
    playStyle: "solide",
    elo: 2780,
    difficulty: 5,
    favoriteOpeningId: "spanish-opening",
    whiteOpenings: [
      { id: "spanish-opening", weight: 45 },
      { id: "queens-gambit", weight: 35 },
      { id: "english-opening", weight: 20 },
    ],
    blackOpenings: [
      { id: "caro-kann", weight: 50 },
      { id: "nimzo-indian-defense", weight: 35 },
      { id: "french-defense", weight: 15 },
    ],
    depth: 17,
    timeControl: 950,
    threads: 4,
  },
  {
    id: "hypermodern",
    kind: "archetype",
    name: { fr: "Hypermoderne", en: "Hypermodern" },
    bio: {
      fr: "Contrôle le centre à distance : Réti, Anglaise, Alekhine et Grünfeld.",
      en: "Control the centre from afar: Réti, English, Alekhine, and Grünfeld.",
    },
    era: { fr: "Années 1920", en: "1920s" },
    archetype: { fr: "Hypermoderne", en: "Hypermodern" },
    portraitInitials: "HY",
    accent: "sky",
    style: {
      aggression: 48,
      tactical: 55,
      positional: 78,
      endgame: 62,
      openingTheory: 74,
      timeManagement: 66,
      risk: 52,
    },
    playStyle: "positionnel",
    elo: 2100,
    difficulty: 3,
    favoriteOpeningId: "reti-opening",
    whiteOpenings: [
      { id: "reti-opening", weight: 40 },
      { id: "english-opening", weight: 35 },
      { id: "catalan-opening", weight: 25 },
    ],
    blackOpenings: [
      { id: "alekhine-defense", weight: 35 },
      { id: "grunfeld-defense", weight: 35 },
      { id: "pirc-defense", weight: 30 },
    ],
    depth: 12,
    timeControl: 600,
    threads: 2,
  },
  {
    id: "romantic",
    kind: "archetype",
    name: { fr: "Romantique", en: "Romantic" },
    bio: {
      fr: "Gambits et initiative : Gambit du Roi, Evans, attaques ouvertes à tout prix.",
      en: "Gambits and initiative: King's Gambit, Evans, open attacks at all costs.",
    },
    era: { fr: "XIXe siècle", en: "19th century" },
    archetype: { fr: "Romantique", en: "Romantic" },
    portraitInitials: "RO",
    accent: "fuchsia",
    style: {
      aggression: 92,
      tactical: 88,
      positional: 24,
      endgame: 35,
      openingTheory: 38,
      timeManagement: 42,
      risk: 88,
    },
    playStyle: "agressif",
    elo: 1950,
    difficulty: 3,
    favoriteOpeningId: "kings-gambit",
    whiteOpenings: [
      { id: "kings-gambit", weight: 40 },
      { id: "evans-gambit", weight: 35 },
      { id: "italian-game", weight: 25 },
    ],
    blackOpenings: [
      { id: "sicilian-defense", weight: 40 },
      { id: "budapest-gambit", weight: 35 },
      { id: "alekhine-defense", weight: 25 },
    ],
    depth: 11,
    timeControl: 550,
    threads: 2,
  },
  {
    id: "solid-positional",
    kind: "archetype",
    name: { fr: "Solide positionnel", en: "Solid Positional" },
    bio: {
      fr: "Structures saines : Londres, Dame, Caro-Kann — peu de cibles, beaucoup de patience.",
      en: "Sound structures: London, Queen's Gambit, Caro-Kann — few targets, plenty of patience.",
    },
    era: { fr: "Moderne", en: "Modern" },
    archetype: { fr: "Solide", en: "Solid" },
    portraitInitials: "SP",
    accent: "lime",
    style: {
      aggression: 22,
      tactical: 35,
      positional: 88,
      endgame: 80,
      openingTheory: 58,
      timeManagement: 78,
      risk: 14,
    },
    playStyle: "solide",
    elo: 2050,
    difficulty: 3,
    favoriteOpeningId: "london-system",
    whiteOpenings: [
      { id: "london-system", weight: 50 },
      { id: "queens-gambit", weight: 30 },
      { id: "english-opening", weight: 20 },
    ],
    blackOpenings: [
      { id: "caro-kann", weight: 50 },
      { id: "french-defense", weight: 30 },
      { id: "nimzo-indian-defense", weight: 20 },
    ],
    depth: 12,
    timeControl: 650,
    threads: 2,
  },
];

const BY_ID = new Map(PERSONALITY_OPPONENTS.map((p) => [p.id, p]));

export function getPersonalityOpponent(id: string): PersonalityOpponent | undefined {
  return BY_ID.get(id);
}

export function listPersonalityOpponents(kind?: PersonalityKind): PersonalityOpponent[] {
  if (!kind) return PERSONALITY_OPPONENTS;
  return PERSONALITY_OPPONENTS.filter((p) => p.kind === kind);
}

export function personalityDisplayName(
  opponent: PersonalityOpponent,
  lang: string
): string {
  return lang === "fr" ? opponent.name.fr : opponent.name.en;
}

export function personalityBio(opponent: PersonalityOpponent, lang: string): string {
  return lang === "fr" ? opponent.bio.fr : opponent.bio.en;
}

export function personalityEra(opponent: PersonalityOpponent, lang: string): string {
  return lang === "fr" ? opponent.era.fr : opponent.era.en;
}

export function personalityArchetype(
  opponent: PersonalityOpponent,
  lang: string
): string {
  return lang === "fr" ? opponent.archetype.fr : opponent.archetype.en;
}
