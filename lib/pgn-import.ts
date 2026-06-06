import { Chess } from "chess.js";

export const MAX_PGN_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_PGN_GAMES_PER_IMPORT = 50;

export type PgnGameSavePayload = {
  opponentName: string;
  opponentPlatform?: string;
  result: "win" | "loss" | "draw";
  resultType: string;
  resultMessage?: string;
  playerColor: "white" | "black" | "none";
  pgn: string;
  finalFen: string;
  movesCount: number;
};

export function isPlaceholderPlayerName(s: string): boolean {
  const t = s.trim();
  return !t || t === "?" || t === "-";
}

/** Readable « White vs Black » title from a single PGN block. */
export function matchupTitleFromPgnBlock(block: string): string {
  const white = parsePgnTagInBlock(block, "White")?.trim();
  const black = parsePgnTagInBlock(block, "Black")?.trim();
  const w = white && !isPlaceholderPlayerName(white) ? white : null;
  const b = black && !isPlaceholderPlayerName(black) ? black : null;
  if (w && b) return `${w} vs ${b}`;
  if (w) return w;
  if (b) return b;
  return "?";
}

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

/**
 * Noms joueurs depuis les en-têtes d'une partie déjà parsée (ordre Blanc puis Noir).
 * Exclut les valeurs vides ou « ? » ; déduplique sans casse.
 */
export function playerNamesFromPgnHeaders(headers: Record<string, string>): string[] {
  const out: string[] = [];
  const seenLower = new Set<string>();
  for (const tag of ["White", "Black"] as const) {
    const raw = headers[tag]?.trim();
    if (!raw || raw === "?") continue;
    const k = raw.toLowerCase();
    if (seenLower.has(k)) continue;
    seenLower.add(k);
    out.push(raw);
  }
  return out;
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

/**
 * Build a cloud row when the user picks a side (White/Black) in the save dialog.
 */
export function tryBuildCloudSavePayloadFromSide(
  raw: string,
  side: "white" | "black"
): PgnGameSavePayload | null {
  const block = splitPgnDatabase(raw.trim())[0];
  if (!block) return null;
  try {
    const chess = new Chess();
    chess.loadPgn(block);
    const h = chess.getHeaders();
    const white = (h.White ?? "?").trim();
    const black = (h.Black ?? "?").trim();
    const playerIsWhite = side === "white";
    const resultTag = (h.Result ?? "*").trim();
    const winner = outcomeFromResultTag(resultTag);
    const result = playerResult(playerIsWhite, winner);
    let opponentName = (playerIsWhite ? black : white) || "?";
    if (isPlaceholderPlayerName(opponentName)) {
      opponentName = playerIsWhite ? "Black" : "White";
    }

    return {
      opponentName,
      opponentPlatform: "pgn",
      result,
      resultType: "pgn_import",
      playerColor: side,
      pgn: block,
      finalFen: chess.fen(),
      movesCount: chess.history().length,
    };
  } catch {
    return null;
  }
}

/** Archive save — no player side; excluded from personal win/loss stats. */
export function buildArchiveSavePayloadFromPgn(raw: string): PgnGameSavePayload | null {
  const block = splitPgnDatabase(raw.trim())[0];
  if (!block) return null;
  try {
    const chess = new Chess();
    chess.loadPgn(block);
    const h = chess.getHeaders();
    const resultTag = (h.Result ?? "*").trim().replace(/\u2013/g, "-");
    return {
      opponentName: matchupTitleFromPgnBlock(block),
      opponentPlatform: "pgn",
      result: "draw",
      resultType: "pgn_archive",
      resultMessage: resultTag,
      playerColor: "none",
      pgn: block,
      finalFen: chess.fen(),
      movesCount: chess.history().length,
    };
  } catch {
    return null;
  }
}

/** Pre-select White/Black in the save dialog when context allows. */
export function inferDefaultSaveSide(params: {
  pgn: string;
  hint?: string | null;
  playerColor?: "white" | "black" | null;
  emailLocalPart?: string | null;
}): "white" | "black" | null {
  const name = inferSavePlayerNameFromContext(params);
  if (!name) return params.playerColor ?? null;
  const block = splitPgnDatabase(params.pgn.trim())[0];
  if (!block) return params.playerColor ?? null;
  const white = parsePgnTagInBlock(block, "White")?.trim() ?? "";
  const black = parsePgnTagInBlock(block, "Black")?.trim() ?? "";
  if (!isPlaceholderPlayerName(white) && white.toLowerCase() === name.toLowerCase()) {
    return "white";
  }
  if (!isPlaceholderPlayerName(black) && black.toLowerCase() === name.toLowerCase()) {
    return "black";
  }
  return params.playerColor ?? null;
}

/**
 * Guess which [White]/[Black] name is the account owner for cloud save, without manual entry when possible.
 * Order: explicit hint → known saved-game color → email local-part match → single named player.
 */
export function inferSavePlayerNameFromContext(params: {
  pgn: string;
  hint?: string | null;
  playerColor?: "white" | "black" | null;
  emailLocalPart?: string | null;
}): string | null {
  const raw = params.pgn?.trim();
  if (!raw) return null;
  const block = splitPgnDatabase(raw)[0];
  if (!block) return null;
  const white = parsePgnTagInBlock(block, "White")?.trim() ?? "";
  const black = parsePgnTagInBlock(block, "Black")?.trim() ?? "";

  const hintT = params.hint?.trim();
  if (hintT) {
    if (!isPlaceholderPlayerName(white) && white.toLowerCase() === hintT.toLowerCase()) {
      return white;
    }
    if (!isPlaceholderPlayerName(black) && black.toLowerCase() === hintT.toLowerCase()) {
      return black;
    }
  }

  const pc = params.playerColor;
  if (pc === "white" && !isPlaceholderPlayerName(white)) return white;
  if (pc === "black" && !isPlaceholderPlayerName(black)) return black;

  const emailT = params.emailLocalPart?.trim();
  if (emailT) {
    const el = emailT.toLowerCase();
    if (!isPlaceholderPlayerName(white) && white.toLowerCase() === el) return white;
    if (!isPlaceholderPlayerName(black) && black.toLowerCase() === el) return black;
  }

  if (!isPlaceholderPlayerName(white) && isPlaceholderPlayerName(black)) return white;
  if (!isPlaceholderPlayerName(black) && isPlaceholderPlayerName(white)) return black;

  return null;
}

/**
 * Hint for cloud save when importing a PGN into Game Review (single named player
 * or a stored player name that matches the headers).
 */
export function inferImportSavePlayerHint(
  pgn: string,
  authUserId?: string | null
): string | null {
  const fromHeaders = inferSavePlayerNameFromContext({ pgn });
  if (fromHeaders) return fromHeaders;
  if (!authUserId) return null;
  try {
    const stored = localStorage
      .getItem(`chess-avatar.games.savePlayerName.${authUserId}`)
      ?.trim();
    if (!stored) return null;
    const { games } = parsePgnFileForGames(pgn, stored);
    return games.length > 0 ? stored : null;
  } catch {
    return null;
  }
}