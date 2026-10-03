/**
 * Regenerates the web ↔ Android parity contract under `parity/`.
 *
 *   npm run parity:export
 *
 * Outputs (all deterministic, committed, checked in CI with `git diff --exit-code parity/`):
 * - parity/data/personalities.json      personality opponents + precompiled EngineConfig
 * - parity/data/openings/*.json         openings catalog, guided lessons, historical games
 * - parity/vectors/*.json               input → expected output cases computed with the web code
 * - parity/api-fixtures/responses.json  sample API success responses (types: lib/api-contract.ts)
 * - parity/manifest.json                sha256 of every file + where Android installs it
 *
 * Sync to ChessAvatarAndroid is manual: once parity/ is committed on main, the Android
 * developer runs `.\scripts\sync-parity.ps1` (or `-Ref <commit>`) there. Android replays
 * the vectors in JUnit, so any behavioural drift between the two apps fails a test.
 *
 * Android depends on the manifest fields (path, android, sha256, contractVersion,
 * divergences), the file names under parity/vectors/ and parity/api-fixtures/, and the
 * keys of parity/constants.json: changing any of them must be coordinated with Android.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Chess } from "chess.js";

import { PARITY } from "../lib/parity-contract";
import { buildApiFixtures } from "./parity-api-fixtures";
import { PERSONALITY_OPPONENTS } from "../lib/personality-opponents";
import {
  humanBlunderIntervalFromRisk,
  personalityToEngineConfig,
  playStyleFromPositional,
} from "../lib/personality-to-engine";
import { getAllLessons, type HistoricalGame, type OpeningLesson } from "../lib/opening-lessons";
import { attachStaticGames, metaToGame, type HistoricalGameMeta } from "../lib/historical-games-loader";
import { buildOpeningCatalog, difficultyLabel } from "../lib/openings-catalog-export";
import { getOpeningByIdFromCore, getOpeningName } from "../lib/openings-library";
import { analyzePersona, type EngineConfig, type PersonaGameInput } from "../lib/analysis";
import {
  arenaUciEloFromConfig,
  clampProfileElo,
  engineOptionsForArena,
  engineOptionsForConfig,
  multiPvCountForArena,
  multiPvCountForDifficulty,
  multiPvCountForPlay,
  pickPersonaBiasedMove,
  prepareArenaEngineConfig,
  skillLevelFromDifficulty,
  uciEloFromProfileElo,
} from "../lib/persona-engine-params";
import { shouldPlayHumanBlunderMove } from "../lib/bot-move-count";
import {
  forcedLinePrefixMatchesBotMovesOnly,
  getEffectiveForcedLinesByColor,
  nextForcedMoveForBot,
} from "../lib/forced-line-utils";
import { estimatedEloFromAccuracy, estimatedGameElos, type GameWinner } from "../lib/game-result-elo";
import { classifyMove, computeGameAccuracy, winProbability, type MoveEvalInput } from "../lib/analysis-engine";
import { getAnalysisProfile } from "../lib/analysis-profiles";
import { isObviousCapture, sacrificedMaterial } from "../lib/game-review";
import { REVIEW_ARROW_COLORS, threatArrowsFromFen } from "../lib/review-board-arrows";
import { FantasyChessEngine } from "../lib/ascension/fantasy-chess/engine";
import type { FantasyRuleSet } from "../lib/ascension/fantasy-chess/types";

const ROOT = resolve(__dirname, "..");
const OUT = join(ROOT, "parity");

type ManifestEntry = { path: string; android: string; sha256: string };
const manifestFiles: ManifestEntry[] = [];

function sha256(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

function writeJson(relPath: string, android: string, value: unknown): void {
  const abs = join(OUT, relPath);
  mkdirSync(join(abs, ".."), { recursive: true });
  const text = JSON.stringify(value, null, 2) + "\n";
  writeFileSync(abs, text, "utf8");
  manifestFiles.push({ path: `parity/${relPath}`, android, sha256: sha256(text) });
}

/** Hand-edited JSON may pick up CRLF on Windows; git stores parity/** as LF, so the hash must be of LF bytes. */
function registerExisting(repoRelPath: string, android: string): void {
  const abs = join(ROOT, repoRelPath);
  let buf = readFileSync(abs);
  if (repoRelPath.endsWith(".json")) {
    const raw = buf.toString("utf8");
    const text = raw.replace(/\r\n/g, "\n");
    if (text !== raw) {
      writeFileSync(abs, text, "utf8");
      buf = Buffer.from(text, "utf8");
    }
  }
  manifestFiles.push({ path: repoRelPath.replace(/\\/g, "/"), android, sha256: sha256(buf) });
}

/** Deterministic PRNG (mulberry32) so vectors are stable across runs. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number, digits = 3) => Math.round(n * 10 ** digits) / 10 ** digits;

// ---------------------------------------------------------------------------
// Data: personalities
// ---------------------------------------------------------------------------

function exportPersonalities(): void {
  const portraits: string[] = [];
  const opponents = PERSONALITY_OPPONENTS.map((o) => {
    const config = personalityToEngineConfig(o, {}, "en");
    let portraitFile: string | null = null;
    if (o.portraitUrl) {
      const rel = join("public", o.portraitUrl.replace(/^\//, ""));
      if (existsSync(join(ROOT, rel))) {
        portraitFile = basename(rel);
        portraits.push(rel);
      }
    }
    return {
      id: o.id,
      kind: o.kind,
      name: o.name,
      bio: o.bio,
      era: o.era,
      archetype: o.archetype,
      years: o.years ?? null,
      portraitInitials: o.portraitInitials,
      portraitFile,
      accent: o.accent,
      style: o.style,
      playStyle: o.playStyle,
      elo: o.elo,
      difficulty: o.difficulty,
      favoriteOpeningId: o.favoriteOpeningId,
      config: { ...config, avatarUrl: null, personalityId: undefined },
    };
  });
  writeJson("data/personalities.json", "app/src/main/assets/personalities/personalities.json", {
    version: 1,
    opponents,
  });
  for (const rel of portraits) {
    registerExisting(rel, `app/src/main/assets/personalities/${basename(rel)}`);
  }
}

// ---------------------------------------------------------------------------
// Data: openings (catalog, guided lessons, historical games)
// ---------------------------------------------------------------------------

/**
 * `historical-games-loader` discovers `data/historical-games/*.meta.ts` through Webpack's
 * `require.context`, which does not exist under tsx. Load them here by inlining the PGN.
 */
async function loadPgnHistoricalGames(): Promise<Map<string, HistoricalGame[]>> {
  const dir = join(ROOT, "data", "historical-games");
  const tmp = mkdtempSync(join(tmpdir(), "parity-meta-"));
  const map = new Map<string, HistoricalGame[]>();
  try {
    const metas = readdirSync(dir).filter((f) => f.endsWith(".meta.ts")).sort();
    for (const file of metas) {
      const src = readFileSync(join(dir, file), "utf8");
      const inlined = src.replace(
        /import\s+(\w+)\s+from\s+["']\.\/([^"']+\.pgn)["'];?/,
        (_m, name: string, pgnFile: string) =>
          `const ${name} = ${JSON.stringify(readFileSync(join(dir, pgnFile), "utf8"))};`
      );
      const tmpFile = join(tmp, file);
      writeFileSync(tmpFile, inlined, "utf8");
      const mod = (await import(pathToFileURL(tmpFile).href)) as { default?: HistoricalGameMeta };
      const meta = mod.default;
      if (!meta?.openingId) throw new Error(`Invalid historical game meta: ${file}`);
      const game = metaToGame(meta, file.replace(/\.meta\.ts$/, "").toLowerCase());
      if (!game) throw new Error(`Invalid PGN for ${file}`);
      map.set(meta.openingId, [...(map.get(meta.openingId) ?? []), game]);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return map;
}

function historicalGameDto(g: HistoricalGame, openingId: string) {
  return {
    id: g.id,
    openingId,
    white: g.white,
    black: g.black,
    result: g.result,
    date: g.date,
    event: g.event,
    anecdote: g.anecdote ?? { fr: "", en: "" },
    movesSan: "",
    movesUci: g.uciMoves,
  };
}

function lessonDto(lesson: OpeningLesson) {
  const opening = getOpeningByIdFromCore(lesson.openingId);
  return {
    id: lesson.openingId,
    name: opening
      ? { fr: opening.name, en: getOpeningName(opening, "en") }
      : { fr: lesson.openingId, en: lesson.openingId },
    eco: opening?.eco ?? "",
    color: opening?.color ?? "white",
    difficulty: opening ? difficultyLabel(opening.difficulty) : "beginner",
    character: opening?.character ?? "",
    tags: opening?.tags ?? [],
    guided: true,
    hook: lesson.hook,
    overview: lesson.overview,
    mainIdeas: lesson.mainIdeas,
    modelLine: lesson.modelLine,
    historicalGames: [],
  };
}

async function exportOpenings(): Promise<OpeningLesson[]> {
  const lessons = attachStaticGames(getAllLessons(), await loadPgnHistoricalGames());
  writeJson(
    "data/openings/catalog.json",
    "app/src/main/assets/openings/catalog.json",
    buildOpeningCatalog(lessons).map((entry) => ({ ...entry, guided: false }))
  );
  writeJson("data/openings/lessons.json", "app/src/main/assets/openings/lessons.json", lessons.map(lessonDto));
  writeJson(
    "data/openings/historical-games.json",
    "app/src/main/assets/openings/historical-games.json",
    lessons.flatMap((l) => l.historicalGames.map((g) => historicalGameDto(g, l.openingId)))
  );
  return lessons;
}

// ---------------------------------------------------------------------------
// Positions used by board-level vectors (taken from the historical games)
// ---------------------------------------------------------------------------

type PlyPosition = { fenBefore: string; uci: string; previousUci: string | null; fenAfter: string };

function plyPositions(lessons: OpeningLesson[], maxPerGame = 40): PlyPosition[] {
  const out: PlyPosition[] = [];
  for (const lesson of lessons) {
    for (const game of lesson.historicalGames) {
      const chess = new Chess();
      let previous: string | null = null;
      for (const uci of game.uciMoves.slice(0, maxPerGame)) {
        const fenBefore = chess.fen();
        try {
          chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
        } catch {
          break;
        }
        out.push({ fenBefore, uci, previousUci: previous, fenAfter: chess.fen() });
        previous = uci;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Vectors
// ---------------------------------------------------------------------------

const VECTORS_ANDROID_DIR = "app/src/test/resources/parity/vectors";

function writeVectors(name: string, value: object): void {
  writeJson(`vectors/${name}.json`, `${VECTORS_ANDROID_DIR}/${name}.json`, {
    contractVersion: PARITY.contractVersion,
    ...value,
  });
}

function baseConfig(overrides: Partial<EngineConfig>): EngineConfig {
  return {
    name: "Bot",
    elo: 1500,
    difficulty: 3,
    aggressiveness: 50,
    threads: 2,
    depth: 14,
    timeControl: 450,
    favoriteOpening: "Italienne",
    playStyle: "équilibré",
    openings: {},
    humanBlunderInterval: 10,
    ...overrides,
  };
}

function vectorsElo(): void {
  writeVectors("elo", {
    clampProfileElo: [-5.5, 0, 120.4, 399.9, 400, 400.6, 1234.7, 1999.5, 3499.99, 3500, 3500.4, 9999].map(
      (input) => ({ input, expected: clampProfileElo(input) })
    ),
    uciEloFromProfileElo: [0, 1000, 1319, 1320, 1321, 2500, 3189, 3190, 3191, 3500].map((input) => ({
      input,
      expected: uciEloFromProfileElo(input),
    })),
  });
}

function vectorsEngineParams(): void {
  const names = ["Bot_alice", "Mikhail Tal", "José Raúl Capablanca", "", "Bot_ü"];
  const configs: EngineConfig[] = [];
  for (const name of names) {
    for (const elo of [800, 2200, 2800, 3000, 3500]) {
      for (const difficulty of [1, 3, 5] as const) {
        for (const aggressiveness of [0, 55, 74, 100]) {
          configs.push(baseConfig({ name, elo, difficulty, aggressiveness }));
        }
      }
    }
  }
  const playConfigs: EngineConfig[] = [];
  for (const personalityId of [undefined, "tal"]) {
    for (const elo of [1500, 2599, 2600]) {
      for (const difficulty of [1, 2, 3, 4, 5] as const) {
        for (const aggressiveness of [20, 60, 90]) {
          for (const [depth, timeControl] of [
            [2, 50],
            [25, 9000],
          ]) {
            playConfigs.push(
              baseConfig({ name: "P", elo, difficulty, aggressiveness, depth, timeControl, personalityId })
            );
          }
        }
      }
    }
  }
  const pick = (c: EngineConfig) => ({
    name: c.name,
    elo: c.elo,
    difficulty: c.difficulty,
    aggressiveness: c.aggressiveness,
    depth: c.depth,
    timeControl: c.timeControl,
    playStyle: c.playStyle,
    personalityId: c.personalityId ?? null,
  });

  const lines = new Map<number, string>([
    [1, "e2e4"],
    [2, "d2d4"],
    [3, "c2c4"],
    [4, "g1f3"],
  ]);
  const biased: object[] = [];
  for (const difficulty of [1, 2, 3, 4, 5] as const) {
    for (const aggressiveness of [0, 50, 100]) {
      for (const playStyle of ["tactique", "positionnel", "équilibré"] as const) {
        for (const arenaStyle of [false, true]) {
          for (const r of [0.01, 0.07, 0.12, 0.2, 0.3, 0.45, 0.6, 0.9]) {
            const config = baseConfig({ difficulty, aggressiveness, playStyle });
            biased.push({
              config: pick(config),
              arenaStyle,
              r,
              expected: pickPersonaBiasedMove("e2e4", lines, config, () => r, arenaStyle),
            });
          }
        }
      }
    }
  }

  const prepared = playConfigs.slice(0, 40).map((c) => {
    const p = prepareArenaEngineConfig({ ...c, humanBlunderInterval: c.elo > 2000 ? undefined : 6 });
    return {
      config: { ...pick(c), humanBlunderInterval: c.elo > 2000 ? null : 6 },
      expected: { depth: p.depth, timeControl: p.timeControl, humanBlunderInterval: p.humanBlunderInterval },
    };
  });

  writeVectors("engine-params", {
    skillLevelFromDifficulty: [0, 1, 2, 3, 4, 5, 6].map((input) => ({
      input,
      expected: skillLevelFromDifficulty(input),
    })),
    multiPvCountForDifficulty: [0, 1, 2, 3, 4, 5, 6].map((input) => ({
      input,
      expected: multiPvCountForDifficulty(input),
    })),
    arenaUciEloFromConfig: configs.map((c) => ({ config: pick(c), expected: arenaUciEloFromConfig(c) })),
    multiPvCountForArena: configs
      .filter((c) => c.name === "Bot_alice")
      .map((c) => ({ config: pick(c), expected: multiPvCountForArena(c) })),
    multiPvCountForPlay: playConfigs.map((c) => ({ config: pick(c), expected: multiPvCountForPlay(c) })),
    engineOptionsForConfig: playConfigs.map((c) => ({ config: pick(c), expected: engineOptionsForConfig(c) })),
    engineOptionsForArena: playConfigs.map((c) => ({ config: pick(c), expected: engineOptionsForArena(c) })),
    pickPersonaBiasedMove: { lines: Object.fromEntries(lines), best: "e2e4", cases: biased },
    prepareArenaEngineConfig: prepared,
    humanBlunderIntervalFromRisk: Array.from({ length: 41 }, (_, i) => i * 3 - 10).map((input) => ({
      input,
      expected: humanBlunderIntervalFromRisk(input),
    })),
    playStyleFromPositional: [-5, 0, 34, 35, 50, 65, 66, 100, 120].map((input) => ({
      input,
      fallback: "équilibré",
      expected: playStyleFromPositional(input, "équilibré"),
    })),
  });
}

function vectorsForcedLines(): void {
  const histories = [
    [],
    ["e2e4"],
    ["e2e4", "e7e5"],
    ["e2e4", "c7c5", "g1f3"],
    ["d2d4", "e7e5", "g1f3", "b8c6"],
    ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6"],
  ];
  const configs: Partial<EngineConfig>[] = [
    { forcedLineWhite: ["e2e4", "g1f3", "f1c4"], forcedLineBlack: ["e7e5", "b8c6"] },
    { forcedLineWhite: ["E2E4", " g1f3 "], forcedLineBlack: [] },
    { forcedLine: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"] },
    { forcedLine: ["e2e4", "c7c5"], forcedLineWhite: [], forcedLineBlack: [] },
    {},
  ];
  const cases: object[] = [];
  for (const partial of configs) {
    const config = baseConfig(partial);
    const { white, black } = getEffectiveForcedLinesByColor(config);
    for (const history of histories) {
      for (const botPlaysWhite of [true, false]) {
        cases.push({
          config: {
            forcedLine: config.forcedLine ?? null,
            forcedLineWhite: config.forcedLineWhite ?? null,
            forcedLineBlack: config.forcedLineBlack ?? null,
          },
          history,
          botPlaysWhite,
          expected: {
            white,
            black,
            prefixMatches: forcedLinePrefixMatchesBotMovesOnly(white, black, history, botPlaysWhite),
            nextMove: nextForcedMoveForBot(white, black, history.length, botPlaysWhite) ?? null,
          },
        });
      }
    }
  }
  const blunder: object[] = [];
  for (const length of [0, 1, 5, 8, 9, 18, 19, 20]) {
    const history = Array.from({ length }, () => "e2e4");
    for (const botPlaysWhite of [true, false]) {
      for (const interval of [0, 1, 5, 10]) {
        blunder.push({
          plies: length,
          botPlaysWhite,
          interval,
          expected: shouldPlayHumanBlunderMove(history, botPlaysWhite, interval),
        });
      }
    }
  }
  writeVectors("forced-lines", { cases, shouldPlayHumanBlunderMove: blunder });
}

function vectorsGameElo(): void {
  const accuracies = [0, 10, 39.9, 40, 41, 45.5, 50, 55, 62.5, 70, 72.3, 75, 80, 84.9, 90, 93, 95, 97, 98, 99.4, 100];
  const winners: GameWinner[] = ["white", "black", "draw"];
  const games: object[] = [];
  for (const winner of winners) {
    for (const [accuracyWhite, accuracyBlack] of [
      [72.3, 64.1],
      [98, 40],
      [40, 99.4],
      [100, 100],
      [0, 0],
      [55, null],
      [null, 88],
    ] as const) {
      games.push({
        accuracyWhite,
        accuracyBlack,
        winner,
        expected: estimatedGameElos({ accuracyWhite, accuracyBlack, winner }),
      });
    }
  }
  writeVectors("game-elo", {
    fromAccuracy: accuracies.map((input) => ({ input, expected: estimatedEloFromAccuracy(input) })),
    forGame: games,
  });
}

function vectorsReview(positions: PlyPosition[]): void {
  const rand = prng(20261003);
  const profile = getAnalysisProfile("standard");

  const win: { whiteCp: number | null; mateIn: number | null; forWhite: boolean; expected: number }[] = [];
  for (const cp of [-1500, -400, -120, -35, 0, 1, 29, 57, 150, 333, 980]) {
    for (const forWhite of [true, false]) {
      win.push({ whiteCp: cp, mateIn: null, forWhite, expected: winProbability(cp / 100, undefined, forWhite) });
    }
  }
  for (const mateIn of [-3, -1, 1, 4]) {
    for (const forWhite of [true, false]) {
      win.push({ whiteCp: null, mateIn, forWhite, expected: winProbability(0, mateIn, forWhite) });
    }
  }

  const classify: object[] = [];
  for (let i = 0; i < 400; i++) {
    const bestWin = round(rand());
    const lossBias = rand() < 0.5 ? rand() * 0.08 : rand() * 0.6;
    const playerWin = round(Math.max(0, bestWin - lossBias));
    const hasLines = rand() < 0.6;
    const topLineWin = hasLines ? round(Math.max(bestWin, rand())) : undefined;
    const secondLineWin = hasLines ? round((topLineWin ?? 0) * rand()) : undefined;
    const input: MoveEvalInput = {
      bestEvalPawns: 0,
      playerEvalPawns: 0,
      sideToMove: rand() < 0.5 ? "white" : "black",
      bestWin,
      playerWin,
      topLineWin,
      secondLineWin,
      alternativeWin: rand() < 0.5 ? round(rand()) : undefined,
      playedIsBest: rand() < 0.15,
      opponentPrevLoss: rand() < 0.4 ? round(rand() * 0.4) : 0,
      sacrificedMaterial: rand() < 0.3 ? Math.floor(rand() * 6) : 0,
      isObviousCapture: rand() < 0.2,
    };
    classify.push({
      input: {
        bestWin: input.bestWin,
        playerWin: input.playerWin,
        topLineWin: input.topLineWin ?? null,
        secondLineWin: input.secondLineWin ?? null,
        alternativeWin: input.alternativeWin ?? null,
        playedIsBest: input.playedIsBest,
        opponentPrevLoss: input.opponentPrevLoss,
        sacrificedMaterial: input.sacrificedMaterial,
        isObviousCapture: input.isObviousCapture,
      },
      expected: classifyMove(input, profile),
    });
  }

  const accuracy: object[] = [];
  for (let g = 0; g < 40; g++) {
    const moves = Array.from({ length: 5 + Math.floor(rand() * 35) }, (_, i) => {
      const sideToMove: "white" | "black" = i % 2 === 0 ? "white" : "black";
      const best = round((rand() - 0.5) * 6, 2);
      const loss = rand() < 0.7 ? rand() * 0.4 : rand() * 5;
      const player = round(sideToMove === "white" ? best - loss : best + loss, 2);
      return {
        bestEvalPawns: best,
        playerEvalPawns: player,
        sideToMove,
        evalBeforePawns: rand() < 0.85 ? round((rand() - 0.5) * 8, 2) : undefined,
      };
    });
    accuracy.push({
      moves: moves.map((m) => ({ ...m, evalBeforePawns: m.evalBeforePawns ?? null })),
      expected: computeGameAccuracy(moves, "standard").accuracy,
    });
  }

  const material = positions.map((p) => ({
    fenBefore: p.fenBefore,
    uci: p.uci,
    previousUci: p.previousUci,
    expected: {
      sacrificedMaterial: sacrificedMaterial(p.fenBefore, p.uci),
      isObviousCapture: isObviousCapture(p.fenBefore, p.uci, p.previousUci ?? undefined),
    },
  }));

  writeVectors("review", {
    winProbability: win,
    classify,
    accuracy,
    material,
  });
}

function vectorsThreatArrows(positions: PlyPosition[]): void {
  const kindOf = (color?: string) =>
    color === REVIEW_ARROW_COLORS.opponentThreat ? "opponent" : color === REVIEW_ARROW_COLORS.ourThreat ? "ours" : "?";
  const cases = positions
    .map((p) => ({
      fen: p.fenAfter,
      expected: threatArrowsFromFen(p.fenAfter).map((a) => ({ from: a.from, to: a.to, kind: kindOf(a.color) })),
    }))
    // MAX_THREAT_ARROWS truncation depends on move-generation order, which differs between libraries.
    .filter((c) => c.expected.length < 8);
  writeVectors("threat-arrows", {
    note: "Compare as unordered sets: arrow order depends on each chess library's move generation.",
    cases,
  });
}

function vectorsPersona(lessons: OpeningLesson[]): void {
  const games = lessons.flatMap((l) => l.historicalGames).filter((g) => g.uciMoves.length > 10);
  const pgnFor = (g: HistoricalGame, extraHeaders: Record<string, string>): string => {
    const chess = new Chess();
    for (const uci of g.uciMoves) {
      try {
        chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      } catch {
        break;
      }
    }
    chess.setHeader("White", g.white);
    chess.setHeader("Black", g.black);
    for (const [k, v] of Object.entries(extraHeaders)) chess.setHeader(k, v);
    return chess.pgn();
  };
  const winnerOf = (result: string): string | null =>
    result === "1-0" ? "white" : result === "0-1" ? "black" : result === "1/2-1/2" ? "draw" : null;

  const inputsFor = (variant: number): PersonaGameInput[] =>
    games.map((g, i) => {
      const headers: Record<string, string> = {};
      if (variant !== 1) {
        headers.WhiteElo = String(1500 + ((i * 137) % 900));
        headers.BlackElo = String(1400 + ((i * 251) % 1000));
      }
      if (i % 3 === 0) headers.Opening = "Sicilian Defense";
      else if (i % 3 === 1) headers.ECOUrl = "https://www.chess.com/openings/Italian-Game";
      else headers.ECO = "C50";
      return {
        id: g.id,
        pgn: pgnFor(g, headers),
        winner: variant === 2 && i % 2 === 0 ? null : winnerOf(g.result),
        opening: variant === 3 && i % 4 === 0 ? { name: "Ouverture inconnue" } : undefined,
        players: {
          white: i % 2 === 0 ? { user: { name: g.white } } : { username: g.white },
          black: { username: g.black },
        },
      };
    });

  const variants: object[] = [];
  for (const variant of [0, 1, 2, 3]) {
    const inputs = inputsFor(variant);
    const usernames = [...new Set(games.map((g) => g.white))].slice(0, 3);
    const cases: object[] = [];
    for (const username of usernames) {
      for (const platformRating of [null, 2150]) {
        const { stats, config } = analyzePersona(inputs, username, undefined, "lichess", platformRating);
        cases.push({
          username,
          platformRating,
          expected: {
            stats: {
              gameCount: stats.gameCount,
              winRate: stats.winRate,
              drawRate: stats.drawRate,
              lossRate: stats.lossRate,
              style: stats.style,
              topOpenings: stats.topOpenings,
              avgMoves: stats.avgMoves,
            },
            config: {
              name: config.name,
              elo: config.elo,
              difficulty: config.difficulty,
              aggressiveness: config.aggressiveness,
              threads: config.threads,
              depth: config.depth,
              timeControl: config.timeControl,
              favoriteOpening: config.favoriteOpening,
              playStyle: config.playStyle,
              openings: config.openings,
              humanBlunderInterval: config.humanBlunderInterval,
            },
          },
        });
      }
    }
    variants.push({ games: inputs, cases });
  }
  writeVectors("persona", { variants });
}

type FantasyScenario = {
  name: string;
  fen: string;
  rules: FantasyRuleSet;
  legalFrom?: string;
  moves: string[];
};

const FANTASY_SCENARIOS: FantasyScenario[] = [
  { name: "standard mate", fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4", rules: { enabledAbilities: [] }, legalFrom: "h5", moves: ["h5f7"] },
  { name: "bishop orthogonal", fen: "8/8/8/8/4B3/8/8/2K2k2 w - - 0 1", rules: { enabledAbilities: ["bishop_orthogonal"], objective: "reach_square", objectiveSquare: "e8" }, legalFrom: "e4", moves: ["e4e8"] },
  { name: "crazy horse", fen: "8/8/8/8/4N3/8/8/2K2k2 w - - 0 1", rules: { enabledAbilities: ["knight_phantom"], objective: "reach_square", objectiveSquare: "e6" }, legalFrom: "e4", moves: ["e4e6"] },
  { name: "greedy pawn chain", fen: "8/8/3p4/2p5/1P6/8/8/2K2k2 w - - 0 1", rules: { enabledAbilities: ["pawn_greedy"], objective: "reach_square", objectiveSquare: "d6" }, legalFrom: "b4", moves: ["b4c5", "c5d6"] },
  { name: "greedy pawn promotion", fen: "8/ppp5/3p4/3rp3/4kp2/2Pp2P1/PP1K3P/8 w - - 0 45", rules: { enabledAbilities: ["pawn_greedy"], objective: "reach_square", objectiveSquare: "c8" }, legalFrom: "g3", moves: ["g3f4", "f4e5", "e5d6", "d6c7", "c7c8q"] },
  { name: "rook tunnel", fen: "2k4r/ppp2Q2/1bp2Np1/4P2p/6b1/2P3P1/PP3PK1/R1Br4 b - - 3 22", rules: { enabledAbilities: ["rook_tunnel"], objective: "checkmate" }, legalFrom: "h8", moves: ["h8h1"] },
  { name: "rook tunnel replay", fen: "8/8/8/8/4R3/3P4/8/2K2k2 w - - 0 1", rules: { enabledAbilities: ["rook_tunnel"], objective: "reach_square", objectiveSquare: "e8" }, legalFrom: "e4", moves: ["e4e8"] },
  { name: "pawn charge", fen: "8/8/8/8/8/4p3/4P3/2K2k2 w - - 0 1", rules: { enabledAbilities: ["pawn_charge"] }, legalFrom: "e2", moves: [] },
  { name: "explosive square", fen: "6k1/8/8/3p4/R7/4K3/8/8 w - - 0 1", rules: { enabledAbilities: [], objective: "checkmate", specialSquares: [{ square: "e4", type: "explosive" }] }, legalFrom: "a4", moves: ["a4e4"] },
  { name: "trap square", fen: "6k1/8/8/3p1p2/R7/8/8/6K1 w - - 0 1", rules: { enabledAbilities: [], objective: "checkmate", specialSquares: [{ square: "e4", type: "trap" }] }, moves: ["a4e4"] },
  { name: "tunnel capture", fen: "6k1/8/4p3/8/R7/8/8/6K1 w - - 0 1", rules: { enabledAbilities: [], objective: "reach_square", objectiveSquare: "e6", specialSquares: [{ square: "e4", type: "tunnel", linkTo: "e6" }] }, moves: ["a4e4"] },
  { name: "tunnel into explosive", fen: "6k1/8/3p4/8/R7/4K3/8/8 w - - 0 1", rules: { enabledAbilities: [], objective: "checkmate", specialSquares: [{ square: "e4", type: "tunnel", linkTo: "e6" }, { square: "e6", type: "explosive" }] }, moves: ["a4e4"] },
  { name: "tunnel blocked by ally", fen: "6k1/8/4P3/8/R7/8/8/6K1 w - - 0 1", rules: { enabledAbilities: [], objective: "checkmate", specialSquares: [{ square: "e4", type: "tunnel", linkTo: "e6" }] }, legalFrom: "a4", moves: ["a4e4"] },
  { name: "queen split chain", fen: "8/8/8/8/4Q3/8/8/2K2k2 w - - 0 1", rules: { enabledAbilities: ["queen_split"], objective: "reach_square", objectiveSquare: "e8", fantasySide: "w" }, moves: ["e4e6", "e6e8"] },
  { name: "queen split ends on check", fen: "8/6k1/8/8/4Q3/8/8/2K5 w - - 0 1", rules: { enabledAbilities: ["queen_split"], fantasySide: "w" }, moves: ["e4e7", "g7g6"] },
  { name: "queen split second move after check rejected", fen: "8/6k1/8/8/4Q3/8/8/2K5 w - - 0 1", rules: { enabledAbilities: ["queen_split"], fantasySide: "w" }, moves: ["e4e7", "e7e8"] },
  { name: "opponent queen no split", fen: "6k1/8/8/3q4/8/8/8/3QK3 b - - 0 1", rules: { enabledAbilities: ["queen_split"], fantasySide: "w" }, moves: ["d5d1"] },
  { name: "opponent rook no tunnel", fen: "2k4r/ppp2Q2/1bp2Np1/4P2p/6b1/2P3P1/PP3PK1/R1Br4 b - - 3 22", rules: { enabledAbilities: ["rook_tunnel"], fantasySide: "w" }, moves: ["h8h1"] },
  { name: "king anchor", fen: "6k1/8/8/8/8/4K3/8/8 w - - 0 1", rules: { enabledAbilities: ["king_anchor"], objective: "checkmate", specialSquares: [{ square: "e4", type: "trap" }] }, moves: ["e3e4"] },
  { name: "blast dodge", fen: "6k1/8/8/3p4/R7/8/8/6K1 w - - 0 1", rules: { enabledAbilities: [], passiveSkills: ["blast_dodge"], objective: "checkmate", specialSquares: [{ square: "e4", type: "explosive" }] }, moves: ["a4e4"] },
];

function vectorsFantasy(): void {
  const placement = (fen: string) => fen.split(" ").slice(0, 2).join(" ");
  const cases = FANTASY_SCENARIOS.map((s) => {
    const engine = new FantasyChessEngine(s.fen, s.rules);
    const legal = s.legalFrom
      ? engine
          .getLegalMoves(s.legalFrom as never)
          .map((m) => `${m.uci}|${m.isFantasy}|${m.abilityId ?? ""}`)
          .sort()
      : null;
    const steps = s.moves.map((uci) => {
      const ok = engine.applyMove(uci);
      return {
        uci,
        ok,
        position: placement(engine.fen),
        greedyChain: engine.isGreedyChainActive(),
        queenSplitChain: engine.isQueenSplitChainActive(),
        triggeredSquares: [...engine.getTriggeredSquares()].sort(),
      };
    });
    return { name: s.name, fen: s.fen, rules: s.rules, legalFrom: s.legalFrom ?? null, expected: { legal, steps } };
  });
  writeVectors("fantasy", {
    note: "Positions compare the first two FEN fields (placement + side to move).",
    cases,
  });
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  rmSync(join(OUT, "data"), { recursive: true, force: true });
  rmSync(join(OUT, "vectors"), { recursive: true, force: true });
  rmSync(join(OUT, "api-fixtures"), { recursive: true, force: true });

  registerExisting("parity/constants.json", "parity/constants.json");
  exportPersonalities();
  const lessons = await exportOpenings();
  const positions = plyPositions(lessons);

  vectorsElo();
  vectorsEngineParams();
  vectorsForcedLines();
  vectorsGameElo();
  vectorsReview(positions);
  vectorsThreatArrows(positions);
  vectorsPersona(lessons);
  vectorsFantasy();

  writeJson("api-fixtures/responses.json", "app/src/test/resources/parity/api-fixtures/responses.json", {
    contractVersion: PARITY.contractVersion,
    note: "Success responses per route, keyed by \"METHOD path\" as in the Android Retrofit interfaces.",
    routes: buildApiFixtures(lessons),
  });

  manifestFiles.sort((a, b) => a.path.localeCompare(b.path));
  const manifest = {
    contractVersion: PARITY.contractVersion,
    divergences: PARITY.divergences,
    files: manifestFiles,
  };
  writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(
    `Parity contract v${PARITY.contractVersion}: ${manifestFiles.length} files → ${relative(ROOT, OUT)}/manifest.json`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
