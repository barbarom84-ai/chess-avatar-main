export type TraitLang = "fr" | "en";

export const STRENGTH_POOLS: Record<TraitLang, Record<string, string[]>> = {
  fr: {
    aggression: [
      "Initiative dès l'ouverture",
      "Pression constante sur le roi adverse",
      "Sacrifices calculés",
    ],
    tactical: [
      "Combinaisons nettes",
      "Calcul de variantes profond",
      "Défense tactique tenace",
    ],
    positional: [
      "Structure pion supérieure",
      "Plans stratégiques patientes",
      "Domination des cases faibles",
    ],
    endgame: [
      "Technique de finale solide",
      "Conversion précise",
      "Patience en finale gagnante",
    ],
    openingTheory: [
      "Répertoire théorique rodé",
      "Préparation d'ouverture pointue",
      "Surprises en début de partie",
    ],
    timeManagement: [
      "Horloge bien gérée",
      "Décisions rapides en zeitnot",
      "Rythme soutenu sans panique",
    ],
    stats: [
      "Bilan positif sur l'échantillon",
      "Résultats stables en tournoi",
      "Style cohérent avec les stats plateforme",
      "Polyvalence ouverture / milieu",
    ],
    elo: [
      "Niveau élite (3000+)",
      "Force blitz de haut niveau",
      "Référence classement mondial",
    ],
  },
  en: {
    aggression: [
      "Opening initiative",
      "Constant pressure on the enemy king",
      "Calculated sacrifices",
    ],
    tactical: [
      "Clean combinations",
      "Deep variation calculation",
      "Tenacious tactical defense",
    ],
    positional: [
      "Superior pawn structure",
      "Patient strategic plans",
      "Weak-square domination",
    ],
    endgame: [
      "Solid endgame technique",
      "Precise conversion",
      "Patience in winning endgames",
    ],
    openingTheory: [
      "Well-drilled opening repertoire",
      "Sharp opening preparation",
      "Early-game surprises",
    ],
    timeManagement: [
      "Well-managed clock",
      "Fast decisions in time trouble",
      "Steady pace without panic",
    ],
    stats: [
      "Positive record in the sample",
      "Stable tournament results",
      "Style aligned with platform stats",
      "Opening / middlegame versatility",
    ],
    elo: [
      "Elite level (3000+)",
      "High-level blitz strength",
      "World-ranking reference",
    ],
  },
};

export const WEAKNESS_POOLS: Record<TraitLang, Record<string, string[]>> = {
  fr: {
    endgame: [
      "Finales techniques à consolider",
      "Conversion en finale",
      "Tours passives en finale",
    ],
    openingTheory: [
      "Répertoire d'ouverture à structurer",
      "Mémorisation des lignes critiques",
      "Surprises en début de partie",
    ],
    timeManagement: [
      "Zeitnot en fin de partie",
      "Décisions trop lentes au milieu",
      "Cadence rapide sous pression",
    ],
    positional: [
      "Plans longs à affiner",
      "Structure pion fragile",
      "Cases faibles mal exploitées",
    ],
    tactical: [
      "Calcul de variantes court",
      "Combinaisons manquées",
      "Défense tactique à renforcer",
    ],
    stats: [
      "Efficacité en parties serrées",
      "Trop de nuls passives",
      "Résultats en retrait sur l'échantillon",
      "Manque de mordant en milieu de jeu",
    ],
  },
  en: {
    endgame: [
      "Endgame technique to sharpen",
      "Endgame conversion",
      "Passive rooks in endgames",
    ],
    openingTheory: [
      "Opening repertoire to structure",
      "Memorizing critical lines",
      "Early-game surprises against them",
    ],
    timeManagement: [
      "Time trouble in the endgame",
      "Slow middlegame decisions",
      "Fast time control under pressure",
    ],
    positional: [
      "Long-term plans to refine",
      "Fragile pawn structure",
      "Weak squares underused",
    ],
    tactical: [
      "Short tactical calculation",
      "Missed combinations",
      "Tactical defense to strengthen",
    ],
    stats: [
      "Efficiency in close games",
      "Too many passive draws",
      "Results below the sample trend",
      "Lack of bite in the middlegame",
    ],
  },
};

export function traitOpeningMastery(lang: TraitLang, opening: string): string {
  return lang === "en" ? `Mastery of ${opening}` : `Maîtrise de ${opening}`;
}

export function traitAlternativeLines(lang: TraitLang, opening: string): string {
  return lang === "en"
    ? `Alternative lines against ${opening}`
    : `Lignes alternatives à ${opening}`;
}

export function traitOffensiveIdentity(lang: TraitLang): string {
  return lang === "en" ? "Confirmed offensive identity" : "Identité offensive confirmée";
}

export function traitStructuralSolidity(lang: TraitLang): string {
  return lang === "en" ? "Structural solidity" : "Solidité structurelle";
}

export function traitUnpredictablePlay(lang: TraitLang): string {
  return lang === "en" ? "Unpredictable, sharp play" : "Jeu imprévisible et tranchant";
}

export function traitLongGameEndurance(lang: TraitLang): string {
  return lang === "en" ? "Endurance in long games" : "Endurance en parties longues";
}

export function traitFastDecisions(lang: TraitLang): string {
  return lang === "en" ? "Fast decisions, short games" : "Décisions rapides, parties courtes";
}
