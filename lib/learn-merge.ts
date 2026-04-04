import type { Opening } from "@/lib/openings-library";
import { OPENINGS_DATABASE } from "@/lib/openings-library";
import type { LocalizedString, OpeningLesson } from "@/lib/opening-lessons";
import { OPENING_LESSONS } from "@/lib/opening-lessons";

export interface LearnEntryRow {
  opening_id: string;
  opening_json: Opening;
  lesson_json: OpeningLesson;
}

const OPENING_CHARACTERS = new Set<Opening["character"]>([
  "aggressive",
  "defensive",
  "balanced",
  "tactical",
  "positional",
  "hypermodern",
  "classical",
  "gambit",
]);

function isLocalizedString(x: unknown): x is LocalizedString {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.fr === "string" && typeof o.en === "string";
}

function isModelMove(x: unknown): boolean {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.uci === "string" && isLocalizedString(o.comment);
}

function isAnnotation(x: unknown): boolean {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.afterMoveIndex === "number" && isLocalizedString(o.text);
}

function isMoveChallenge(x: unknown): boolean {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.afterMoveCount !== "number") return false;
  if (typeof o.correctUci !== "string" || !isLocalizedString(o.prompt)) return false;
  if (!isLocalizedString(o.insight)) return false;
  if (!Array.isArray(o.wrongChoices) || !o.wrongChoices.every((u) => typeof u === "string")) return false;
  if (!Array.isArray(o.hints) || !o.hints.every(isLocalizedString)) return false;
  return true;
}

function isHistoricalGame(x: unknown): boolean {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.white !== "string" || typeof o.black !== "string") return false;
  if (typeof o.result !== "string" || typeof o.date !== "string") return false;
  if (!isLocalizedString(o.event)) return false;
  if (!Array.isArray(o.uciMoves) || !o.uciMoves.every((m) => typeof m === "string")) return false;
  if (!Array.isArray(o.annotations) || !o.annotations.every(isAnnotation)) return false;
  if (o.anecdote !== undefined && !isLocalizedString(o.anecdote)) return false;
  if (o.challenges !== undefined) {
    if (!Array.isArray(o.challenges) || !o.challenges.every(isMoveChallenge)) return false;
  }
  return true;
}

function isOpeningVariant(x: unknown): boolean {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== "string" || !isLocalizedString(o.title)) return false;
  if (o.description !== undefined && !isLocalizedString(o.description)) return false;
  if (!Array.isArray(o.line) || !o.line.every(isModelMove)) return false;
  return true;
}

export function validateOpeningJson(x: unknown): x is Opening {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== "string" || !/^[a-z0-9-]+$/.test(o.id)) return false;
  if (typeof o.name !== "string" || typeof o.eco !== "string") return false;
  if (typeof o.moves !== "string") return false;
  if (!Array.isArray(o.uciMoves) || !o.uciMoves.every((m) => typeof m === "string")) return false;
  if (typeof o.character !== "string" || !OPENING_CHARACTERS.has(o.character as Opening["character"])) return false;
  if (typeof o.difficulty !== "number" || o.difficulty < 1 || o.difficulty > 5) return false;
  if (typeof o.popularity !== "number" || o.popularity < 1 || o.popularity > 5) return false;
  if (o.color !== "white" && o.color !== "black" && o.color !== "both") return false;
  if (typeof o.description !== "string") return false;
  if (o.nameEn !== undefined && typeof o.nameEn !== "string") return false;
  if (o.descriptionEn !== undefined && typeof o.descriptionEn !== "string") return false;
  if (o.fen !== undefined && typeof o.fen !== "string") return false;
  if (o.famousPlayers !== undefined) {
    if (!Array.isArray(o.famousPlayers) || !o.famousPlayers.every((p) => typeof p === "string")) return false;
  }
  if (!Array.isArray(o.tags) || !o.tags.every((t) => typeof t === "string")) return false;
  return true;
}

export function validateOpeningLessonJson(x: unknown): x is OpeningLesson {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.openingId !== "string" || !/^[a-z0-9-]+$/.test(o.openingId)) return false;
  if (!isLocalizedString(o.hook)) return false;
  if (!isLocalizedString(o.recommendedFor)) return false;
  if (!isLocalizedString(o.overview)) return false;
  if (!Array.isArray(o.mainIdeas) || !o.mainIdeas.every(isLocalizedString)) return false;
  if (!Array.isArray(o.typicalPlans) || !o.typicalPlans.every(isLocalizedString)) return false;
  if (!Array.isArray(o.traps) || !o.traps.every(isLocalizedString)) return false;
  if (!Array.isArray(o.whatToRemember) || !o.whatToRemember.every(isLocalizedString)) return false;
  if (!Array.isArray(o.modelLine) || o.modelLine.length === 0 || !o.modelLine.every(isModelMove)) return false;
  if (o.variants !== undefined) {
    if (!Array.isArray(o.variants) || !o.variants.every(isOpeningVariant)) return false;
  }
  if (!Array.isArray(o.historicalGames) || !o.historicalGames.every(isHistoricalGame)) return false;
  return true;
}

export function validateLearnPair(
  openingIdKey: string,
  opening: Opening,
  lesson: OpeningLesson
): string | null {
  if (opening.id !== openingIdKey) {
    return "L’objet opening.id doit correspondre à l’identifiant de la fiche.";
  }
  if (lesson.openingId !== openingIdKey) {
    return "lesson.openingId doit correspondre à l’identifiant de la fiche.";
  }
  if (!validateOpeningJson(opening)) return "JSON ouverture invalide (champs ou types incorrects).";
  if (!validateOpeningLessonJson(lesson)) return "JSON leçon invalide (champs ou types incorrects).";
  return null;
}

function lessonHasAnyChallenges(lesson: OpeningLesson): boolean {
  return lesson.historicalGames.some((g) => (g.challenges?.length ?? 0) > 0);
}

/**
 * Lorsqu’une leçon Supabase remplace la fiche statique :
 * - `historicalGames` vide → on reprend ceux du dépôt (Histoire + défis).
 * - parties cloud sans aucun défi alors que le dépôt en définit → on reprend ceux du dépôt
 *   (JSON cloud souvent enregistré avant l’ajout des défis).
 */
export function mergeCloudLessonWithStatic(cloud: OpeningLesson, staticLesson: OpeningLesson): OpeningLesson {
  if (cloud.openingId !== staticLesson.openingId) return cloud;
  let historicalGames = staticLesson.historicalGames;
  if (cloud.historicalGames.length > 0) {
    const cloudCh = lessonHasAnyChallenges(cloud);
    const staticCh = lessonHasAnyChallenges(staticLesson);
    historicalGames = !cloudCh && staticCh ? staticLesson.historicalGames : cloud.historicalGames;
  }
  return { ...cloud, historicalGames };
}

export interface MergedLearnCatalog {
  lessons: OpeningLesson[];
  openingById: Map<string, Opening>;
  /** opening_id présents dans Supabase (override ou fiche 100 % cloud) */
  cloudOpeningIds: Set<string>;
}

export function buildMergedCatalog(rows: LearnEntryRow[]): MergedLearnCatalog {
  const cloudOpeningIds = new Set<string>();
  const overrideMap = new Map<string, { opening: Opening; lesson: OpeningLesson }>();

  for (const row of rows) {
    if (!row?.opening_id || !row.opening_json || !row.lesson_json) continue;
    cloudOpeningIds.add(row.opening_id);
    overrideMap.set(row.opening_id, {
      opening: row.opening_json as Opening,
      lesson: row.lesson_json as OpeningLesson,
    });
  }

  const openingById = new Map<string, Opening>();
  for (const o of OPENINGS_DATABASE) {
    openingById.set(o.id, overrideMap.get(o.id)?.opening ?? o);
  }
  for (const [id, { opening }] of overrideMap) {
    if (!openingById.has(id)) {
      openingById.set(id, opening);
    }
  }

  const lessons: OpeningLesson[] = [];
  const seenStatic = new Set<string>();
  for (const l of OPENING_LESSONS) {
    const cloud = overrideMap.get(l.openingId)?.lesson;
    lessons.push(cloud ? mergeCloudLessonWithStatic(cloud, l) : l);
    seenStatic.add(l.openingId);
  }
  for (const [id, { lesson }] of overrideMap) {
    if (!seenStatic.has(id)) {
      lessons.push(lesson);
    }
  }

  return { lessons, openingById, cloudOpeningIds };
}

export function lessonWithMergedOpening(
  lesson: OpeningLesson,
  openingById: Map<string, Opening>,
  lang: "fr" | "en"
): {
  lesson: OpeningLesson;
  opening: Opening | undefined;
  title: string;
} {
  const opening = openingById.get(lesson.openingId);
  const title = opening
    ? lang === "en" && opening.nameEn
      ? opening.nameEn
      : opening.name
    : lesson.openingId;
  return { lesson, opening, title };
}

export function minimalOpening(id: string): Opening {
  return {
    id,
    name: "Nouvelle ouverture",
    nameEn: "New opening",
    eco: "A00",
    moves: "1. e4",
    uciMoves: ["e2e4"],
    character: "balanced",
    difficulty: 2,
    popularity: 3,
    color: "white",
    description: "",
    descriptionEn: "",
    tags: [],
  };
}

export function minimalLesson(openingId: string): OpeningLesson {
  return {
    openingId,
    hook: { fr: "", en: "" },
    recommendedFor: { fr: "", en: "" },
    overview: { fr: "", en: "" },
    mainIdeas: [{ fr: "Idée principale", en: "Main idea" }],
    typicalPlans: [{ fr: "Plan typique", en: "Typical plan" }],
    traps: [{ fr: "Piège à connaître", en: "Trap to know" }],
    whatToRemember: [{ fr: "À retenir", en: "Takeaway" }],
    modelLine: [
      { uci: "e2e4", comment: { fr: "1.e4", en: "1.e4" } },
      { uci: "e7e5", comment: { fr: "1…e5", en: "1…e5" } },
    ],
    historicalGames: [],
  };
}
