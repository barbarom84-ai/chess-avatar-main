import { OPENINGS_DATABASE, getOpeningName } from "@/lib/openings-library";
import { getAllLessons } from "@/lib/opening-lessons";

export type CatalogLocalized = { fr: string; en: string };

export type OpeningCatalogEntry = {
  id: string;
  name: CatalogLocalized;
  eco: string;
  color: string;
  difficulty: string;
  character: string;
  tags: string[];
  guided: boolean;
  hook: CatalogLocalized;
  overview: CatalogLocalized;
  mainIdeas: CatalogLocalized[];
  modelLine: { uci: string; comment: CatalogLocalized }[];
  historicalGames: {
    id: string;
    openingId: string;
    white: string;
    black: string;
    result: string;
    date: string;
    event: CatalogLocalized;
    anecdote: CatalogLocalized;
    movesSan: string;
    movesUci: string[];
  }[];
};

function difficultyLabel(d: number): string {
  if (d <= 2) return "beginner";
  if (d === 3) return "intermediate";
  if (d === 4) return "advanced";
  return "expert";
}

/** Catalogue compact (noyau) au format consommé par ChessAvatar Android. */
export function buildOpeningCatalog(): OpeningCatalogEntry[] {
  const lessons = new Map(getAllLessons().map((l) => [l.openingId, l]));
  return OPENINGS_DATABASE.map((opening) => {
    const lesson = lessons.get(opening.id);
    return {
      id: opening.id,
      name: {
        fr: opening.name,
        en: getOpeningName(opening, "en"),
      },
      eco: opening.eco,
      color: opening.color,
      difficulty: difficultyLabel(opening.difficulty),
      character: opening.character,
      tags: opening.tags,
      guided: Boolean(lesson),
      hook: lesson?.hook ?? {
        fr: opening.description,
        en: opening.descriptionEn ?? opening.description,
      },
      overview: lesson?.overview ?? {
        fr: opening.description,
        en: opening.descriptionEn ?? opening.description,
      },
      mainIdeas: lesson?.mainIdeas ?? [],
      modelLine:
        lesson?.modelLine ??
        opening.uciMoves.map((uci) => ({
          uci,
          comment: { fr: "", en: "" },
        })),
      historicalGames: (lesson?.historicalGames ?? []).map((g) => ({
        id: g.id,
        openingId: opening.id,
        white: g.white,
        black: g.black,
        result: g.result,
        date: g.date,
        event: g.event,
        anecdote: g.anecdote ?? { fr: "", en: "" },
        movesSan: "",
        movesUci: g.uciMoves,
      })),
    };
  });
}
