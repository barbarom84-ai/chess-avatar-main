import { Chess } from "chess.js";

export const MAX_PGN_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_PGN_GAMES_PER_IMPORT = 50;

export type PgnGameSavePayload = {
  opponentName: string;
  opponentPlatform?: string;
  result: "win" | "loss" | "draw";
  resultType: string;
  playerColor: "white" | "black";
  pgn: string;
  finalFen: string;
  movesCount: number;
};

export interface PgnImportParseResult {
  games: PgnGameSavePayload[];
  skippedInvalid: number;
  skippedNotPlayer: number;
}

export function splitPgnDatabase(raw: string): string[] {
  const normalized = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  return normalized
    .split(/\n\n(?=\[)/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Extrait la valeur d'un en-tête PGN standard `[Tag "valeur"]` (ou guillemets simples). */
export function parsePgnTagInBlock(block: string, tag: string): string | null {
  const dq = new RegExp(`\\[${tag}\\s+"([^"]*)"\]`, "i");
  const m1 = block.match(dq);
  if (m1) return m1[1]?.trim() || null;
  const sq = new RegExp(`\\[${tag}\\s+'([^']*)'\]`, "i");
  const m2 = block.match(sq);
  return m2 ? (m2[1]?.trim() || null) : null;
}

/**
 * Liste triée des noms uniques trouvés dans [White] / [Black] (sans charger les coups).
 * Ignore les noms vides ou « ? ».
 */
export function listPlayerNamesFromPgn(raw: string): string[] {
  const seen = new Map<string, string>();
  for (const block of splitPgnDatabase(raw)) {
    for (const tag of ["White", "Black"] as const) {
      const rawName = parsePgnTagInBlock(block, tag);
      const name = rawName?.trim();
      if (!name || name === "?") continue;
      const key = name.toLowerCase();
      if (!seen.has(key)) seen.set(key, name);
    }
  }
  return Array.from(seen.values()).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

function outcomeFromResultTag(result: string | undefined): "white" | "black" | null {
  const r = (result ?? "*").trim().replace(/\u2013/g, "-");
  if (r === "1-0") return "white";
  if (r === "0-1") return "black";
  return null;
}

function playerResult(
  playerIsWhite: boolean,
  winner: "white" | "black" | null
): "win" | "loss" | "draw" {
  if (winner === null) return "draw";
  if (playerIsWhite) return winner === "white" ? "win" : "loss";
  return winner === "black" ? "win" : "loss";
}

export function parsePgnFileForGames(
  raw: string,
  playerNameInPgn: string
): PgnImportParseResult {
  const games: PgnGameSavePayload[] = [];
  let skippedInvalid = 0;
  let skippedNotPlayer = 0;
  const userLower = playerNameInPgn.trim().toLowerCase();
  if (!userLower) {
    return { games: [], skippedInvalid: 0, skippedNotPlayer: 0 };
  }

  const blocks = splitPgnDatabase(raw);

  for (const block of blocks) {
    if (games.length >= MAX_PGN_GAMES_PER_IMPORT) break;

    try {
      const chess = new Chess();
      chess.loadPgn(block);
      const h = chess.getHeaders();
      const white = (h.White ?? "?").trim();
      const black = (h.Black ?? "?").trim();
      const wLower = white.toLowerCase();
      const bLower = black.toLowerCase();
      const isWhite = wLower === userLower;
      const isBlack = bLower === userLower;

      if (isWhite && isBlack) {
        skippedInvalid++;
        continue;
      }
      if (!isWhite && !isBlack) {
        skippedNotPlayer++;
        continue;
      }

      const playerIsWhite = isWhite;
      const resultTag = (h.Result ?? "*").trim();
      const winner = outcomeFromResultTag(resultTag);
      const result = playerResult(playerIsWhite, winner);
      const opponentName = (playerIsWhite ? black : white) || "?";

      games.push({
        opponentName,
        opponentPlatform: "pgn",
        result,
        resultType: "pgn_import",
        playerColor: playerIsWhite ? "white" : "black",
        pgn: block,
        finalFen: chess.fen(),
        movesCount: chess.history().length,
      });
    } catch {
      skippedInvalid++;
    }
  }

  return { games, skippedInvalid, skippedNotPlayer };
}

/**
 * Build a single cloud row from raw PGN text when the user identifies which
 * header name (White/Black) is "them". Returns null if no matching game block.
 */
export function tryBuildCloudSavePayloadFromPgn(
  raw: string,
  playerNameInPgn: string
): PgnGameSavePayload | null {
  const trimmed = playerNameInPgn.trim();
  if (!trimmed) return null;
  const { games } = parsePgnFileForGames(raw, trimmed);
  return games[0] ?? null;
}