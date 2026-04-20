import { parsePgnBlock } from "./pgn-to-uci";
import type {
  HistoricalGame,
  LocalizedString,
  MoveChallenge,
  OpeningLesson,
} from "./opening-lessons";

/**
 * Companion metadata file colocated with each `*.pgn` under `data/historical-games/`.
 * The loader auto-discovers every `*.meta.ts` and turns it into a `HistoricalGame`,
 * extracting white/black/date/result/event from PGN headers and seeding `annotations`
 * from inline `{ ... }` PGN comments when no override is supplied.
 */
export interface HistoricalGameMeta {
  /** Lesson `openingId` this game belongs to (must match an entry in `OPENING_LESSONS`). */
  openingId: string;
  /** Raw PGN string (typically `import pgn from "./name.pgn"`). */
  pgn: string;
  /** Optional id override; defaults to the filename slug (e.g. `bird-anderssen-1851-london`). */
  id?: string;
  white?: string;
  black?: string;
  date?: string;
  result?: string;
  event?: LocalizedString;
  anecdote?: LocalizedString;
  /**
   * Bilingual annotations override. When omitted, PGN move comments are used and
   * mirrored into both languages until you translate them.
   */
  annotations?: { afterMoveIndex: number; text: LocalizedString }[];
  challenges?: MoveChallenge[];
}

function mirror(s: string): LocalizedString {
  return { fr: s, en: s };
}

function metaToGame(meta: HistoricalGameMeta, fallbackId: string): HistoricalGame | null {
  const parsed = parsePgnBlock(meta.pgn);
  if (!parsed) return null;
  const headers = parsed.headers;
  const event: LocalizedString = meta.event ?? mirror(headers.Event ?? fallbackId);
  const annotations =
    meta.annotations ??
    parsed.moveComments.map((c) => ({
      afterMoveIndex: c.afterMoveIndex,
      text: mirror(c.text),
    }));
  return {
    id: meta.id ?? fallbackId,
    white: meta.white ?? headers.White ?? "?",
    black: meta.black ?? headers.Black ?? "?",
    result: meta.result ?? parsed.result,
    date: meta.date ?? headers.Date ?? "—",
    event,
    uciMoves: parsed.uciMoves,
    annotations,
    anecdote: meta.anecdote,
    challenges: meta.challenges,
  };
}

interface WebpackContext {
  keys(): string[];
  (id: string): unknown;
}

interface RequireWithContext {
  context(directory: string, useSubdirectories: boolean, regExp: RegExp): WebpackContext;
}

/**
 * Loads all `*.meta.ts` files in `data/historical-games/` at build time (via Webpack
 * `require.context`). Each meta yields one `HistoricalGame`. Failures (bad PGN, missing
 * openingId) are skipped silently with a `console.warn` so the rest of the catalog still
 * builds.
 */
function loadAllMetas(): { meta: HistoricalGameMeta; fallbackId: string }[] {
  const out: { meta: HistoricalGameMeta; fallbackId: string }[] = [];
  try {
    const ctx = (require as unknown as RequireWithContext).context(
      "../data/historical-games",
      false,
      /\.meta\.(ts|tsx|js|mjs)$/,
    );
    for (const key of ctx.keys()) {
      try {
        const mod = ctx(key) as { default?: unknown };
        const meta = mod?.default;
        if (!meta || typeof meta !== "object") continue;
        const m = meta as HistoricalGameMeta;
        if (!m.openingId || typeof m.openingId !== "string") continue;
        if (typeof m.pgn !== "string") continue;
        const fallbackId = key
          .replace(/^\.\//, "")
          .replace(/\.meta\.(ts|tsx|js|mjs)$/, "")
          .toLowerCase();
        out.push({ meta: m, fallbackId });
      } catch (err) {
        console.warn(`[historical-games-loader] failed to load ${key}`, err);
      }
    }
  } catch {
    // require.context unavailable (e.g. running under a non-Webpack runtime).
    // Static games will still come from inline lesson definitions.
  }
  return out;
}

/**
 * Build a `Map<openingId, HistoricalGame[]>` from every auto-discovered meta file.
 * The order reflects discovery order (deterministic per Webpack build).
 */
export function loadHistoricalGames(): Map<string, HistoricalGame[]> {
  const map = new Map<string, HistoricalGame[]>();
  for (const { meta, fallbackId } of loadAllMetas()) {
    const game = metaToGame(meta, fallbackId);
    if (!game) {
      console.warn(`[historical-games-loader] invalid PGN in ${fallbackId}.pgn`);
      continue;
    }
    const arr = map.get(meta.openingId) ?? [];
    arr.push(game);
    map.set(meta.openingId, arr);
  }
  return map;
}

/**
 * Returns the input lessons array with each lesson's `historicalGames` augmented by the
 * auto-discovered games for its `openingId`. Existing inline games are preserved; an
 * auto-discovered game with the same `id` overrides the inline one (lets you migrate
 * inline games to PGN files one at a time).
 */
export function attachStaticGames(
  lessons: OpeningLesson[],
  extraByOpeningId: Map<string, HistoricalGame[]>,
): OpeningLesson[] {
  if (extraByOpeningId.size === 0) return lessons;
  return lessons.map((lesson) => {
    const extra = extraByOpeningId.get(lesson.openingId);
    if (!extra || extra.length === 0) return lesson;
    const byId = new Map<string, HistoricalGame>();
    for (const g of lesson.historicalGames) byId.set(g.id, g);
    for (const g of extra) byId.set(g.id, g);
    return { ...lesson, historicalGames: Array.from(byId.values()) };
  });
}
