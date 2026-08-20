import type { Opening } from "@/lib/openings-library";
import { getOpeningName } from "@/lib/openings-library";
import { getAggregatedOpenings } from "@/lib/openings-registry";
import { attachStaticGames, loadHistoricalGames } from "@/lib/historical-games-loader";
import type { HistoricalGame, LocalizedString, OpeningLesson } from "@/lib/opening-lessons";
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
 * Ordre et liste des `id` viennent du dépôt ; le cloud peut surcharger une partie par `id`.
 * Les parties présentes seulement dans le dépôt (nouveaux PGN) restent visibles même si le JSON
 * cloud a été enregistré avant leur ajout.
 */
function mergeHistoricalGamesFromStaticAndCloud(
  staticGames: HistoricalGame[],
  cloudGames: HistoricalGame[],
): HistoricalGame[] {
  const cloudById = new Map(cloudGames.map((g) => [g.id, g]));
  const staticIds = new Set(staticGames.map((g) => g.id));
  const merged: HistoricalGame[] = [];
  for (const g of staticGames) {
    merged.push(cloudById.get(g.id) ?? g);
  }
  for (const g of cloudGames) {
    if (!staticIds.has(g.id)) {
      merged.push(g);
    }
  }
  return merged;
}

/**
 * Lorsqu’une leçon Supabase remplace la fiche statique :
 * - `historicalGames` vide → on reprend ceux du dépôt (Histoire + défis).
 * - parties cloud sans aucun défi alors que le dépôt en définit → on reprend ceux du dépôt
 *   (JSON cloud souvent enregistré avant l’ajout des défis).
 * - sinon → fusion par `id` : dépôt comme base, surcharge cloud pour les mêmes `id`.
 */
export function mergeCloudLessonWithStatic(cloud: OpeningLesson, staticLesson: OpeningLesson): OpeningLesson {
  if (cloud.openingId !== staticLesson.openingId) return cloud;
  let historicalGames = staticLesson.historicalGames;
  if (cloud.historicalGames.length > 0) {
    const cloudCh = lessonHasAnyChallenges(cloud);
    const staticCh = lessonHasAnyChallenges(staticLesson);
    if (!cloudCh && staticCh) {
      historicalGames = staticLesson.historicalGames;
    } else {
      historicalGames = mergeHistoricalGamesFromStaticAndCloud(
        staticLesson.historicalGames,
        cloud.historicalGames,
      );
    }
  }
  return { ...cloud, historicalGames };
}

export interface MergedLearnCatalog {
  lessons: OpeningLesson[];
  openingById: Map<string, Opening>;
  /** opening_id présents dans Supabase (override ou fiche 100 % cloud) */
  cloudOpeningIds: Set<string>;
  /** Leçons générées depuis les fiches répertoire (pas les BASE_LESSONS détaillées) */
  syntheticOpeningIds: Set<string>;
  /** Identifiants ayant une leçon « guidée » dans le dépôt (BASE_LESSONS + jeux attachés) */
  coreLessonIds: Set<string>;
}

/**
 * Leçon minimale dérivée d'une fiche [`Opening`](./openings-library.ts) pour couvrir tout le catalogue agrégé.
 * Les parties / défis depuis `data/historical-games/*.meta.ts` sont fusionnées ensuite via `attachStaticGames`.
 */
export function syntheticLessonFromOpening(o: Opening): OpeningLesson {
  const uciMoves = Array.isArray(o.uciMoves) ? o.uciMoves : [];
  const modelLine =
    uciMoves.length > 0
      ? uciMoves.map((uci, idx) => ({
          uci,
          comment: {
            fr:
              idx === 0
                ? `Ligne principale : ${o.moves}`
                : `Suite de la ligne (${idx + 1}/${uciMoves.length}).`,
            en:
              idx === 0
                ? `Main line: ${o.moves}`
                : `Continuation (${idx + 1}/${uciMoves.length}).`,
          },
        }))
      : [
          {
            uci: "e2e4",
            comment: { fr: "1.e4 — placeholder (aucune ligne UCI sur la fiche).", en: "1.e4 — placeholder (no UCI line on card)." },
          },
        ];

  const name = o.name || o.nameEn || o.id;
  const eco = o.eco || "A00";
  const descFr =
    (o.description ?? "").trim() ||
    `Ouverture « ${name} » (${eco}) — fiche du répertoire agrégé.`;
  const descEn =
    (o.descriptionEn ?? o.description ?? "").trim() ||
    `Opening "${o.nameEn ?? name}" (${eco}) — aggregated repertoire card.`;

  return {
    openingId: o.id,
    hook: { fr: descFr, en: descEn },
    recommendedFor: {
      fr: "Tous niveaux — contenu de base issu de la fiche répertoire ; les parties du dossier `historical-games` et les défis s’affichent ici lorsqu’ils existent.",
      en: "All levels — baseline content from the repertoire card; historic games and challenges from `historical-games` appear here when present.",
    },
    overview: { fr: descFr, en: descEn },
    mainIdeas: [
      {
        fr: `Code ECO ${eco}, style ${o.character ?? "balanced"}. Caractéristique : ${o.moves ?? ""}`,
        en: `ECO ${eco}, ${o.character ?? "balanced"} style. Characteristic: ${o.moves ?? ""}`,
      },
    ],
    typicalPlans: [
      {
        fr: "Affinez votre compréhension avec la ligne modèle ci-dessous et les parties en bas de page.",
        en: "Build understanding using the model line below and the games at the bottom.",
      },
    ],
    traps: [
      {
        fr: "Les erreurs typiques varient selon la branche — parcourez la ligne et les parties historiques.",
        en: "Typical mistakes depend on the branch — review the line and historic games.",
      },
    ],
    whatToRemember: [
      {
        fr: `${eco} — ${name}`,
        en: `${eco} — ${o.nameEn ?? name}`,
      },
    ],
    modelLine,
    historicalGames: [],
  };
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
  const seenAgg = new Set<string>();
  for (const o of getAggregatedOpenings()) {
    if (seenAgg.has(o.id)) continue;
    seenAgg.add(o.id);
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

  const coveredIds = new Set(lessons.map((l) => l.openingId));
  const coreLessonIds = new Set(OPENING_LESSONS.map((l) => l.openingId));
  const syntheticOpeningIds = new Set<string>();

  const syntheticCandidates: Opening[] = [];
  for (const o of openingById.values()) {
    if (!coveredIds.has(o.id)) {
      syntheticCandidates.push(o);
    }
  }
  syntheticCandidates.sort((a, b) => {
    const eco = (a.eco ?? "").localeCompare(b.eco ?? "");
    if (eco !== 0) return eco;
    return getOpeningName(a, "fr").localeCompare(getOpeningName(b, "fr"), "fr");
  });

  const extraHistorical = loadHistoricalGames();
  const syntheticLessons = attachStaticGames(
    syntheticCandidates.map((o) => syntheticLessonFromOpening(o)),
    extraHistorical,
  );
  for (const l of syntheticLessons) {
    lessons.push(l);
    syntheticOpeningIds.add(l.openingId);
  }

  return {
    lessons,
    openingById,
    cloudOpeningIds,
    syntheticOpeningIds,
    coreLessonIds,
  };
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
