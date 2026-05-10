import type { Move } from "chess.js";
import { Chess } from "chess.js";
import type { MoveChallenge } from "@/lib/opening-lessons";
import { parsePgnBlock, chessAtPly, suggestWrongMoves } from "@/lib/pgn-to-uci";

/** Minimum plies before we ask for a move (skip ultra-early opening). */
const MIN_PLIES_BEFORE_GUESS = 6;
const WRONG_CHOICE_COUNT = 3;
/** Half-moves suivants dans la partie réelle pour détecter une combinaison de mat. */
const MAX_PLIES_MATE_IN_GAME_LINE = 28;

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

function pieceValue(piece: string): number {
  return PIECE_VALUES[piece] ?? 0;
}

function uciToFromTo(uci: string): { from: string; to: string; promotion?: string } | null {
  const m = uci.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/i);
  if (!m) return null;
  return { from: m[1], to: m[2], promotion: m[3]?.toLowerCase() };
}

/**
 * Capture « sacrifice » : pièce qui prend une cible plus faible (pion, f ou c),
 * exclut les échanges lourds (DxT, TxT, …).
 */
function isMaterialSacrificeCapture(move: Move): boolean {
  if (!move.captured) return false;
  if (!["p", "n", "b"].includes(move.captured)) return false;
  return pieceValue(move.piece) > pieceValue(move.captured);
}

function mateFollowsInRecordedContinuation(
  fenAfterGuess: string,
  uciMoves: string[],
  nextMoveIndex: number
): boolean {
  const c = new Chess(fenAfterGuess);
  const end = Math.min(uciMoves.length, nextMoveIndex + MAX_PLIES_MATE_IN_GAME_LINE);
  for (let i = nextMoveIndex; i < end; i++) {
    const parts = uciToFromTo(uciMoves[i]);
    if (!parts) break;
    const played = c.move(parts);
    if (!played) break;
    if (c.isCheckmate()) return true;
  }
  return false;
}

/**
 * Coups éligibles : combinaison de mat (sur le coup ou dans la ligne jouée) ou sacrifice matériel
 * sur une capture de pion / pièce mineure.
 */
export function isCloudPuzzleCandidatePly(uciMoves: string[], afterMoveCount: number): boolean {
  const chess = chessAtPly(uciMoves, afterMoveCount);
  if (!chess) return false;
  const parts = uciToFromTo(uciMoves[afterMoveCount]);
  if (!parts) return false;
  let played: Move;
  try {
    const m = chess.move(parts);
    if (!m) return false;
    played = m;
  } catch {
    return false;
  }
  if (chess.isCheckmate()) return true;
  if (isMaterialSacrificeCapture(played)) return true;
  return mateFollowsInRecordedContinuation(chess.fen(), uciMoves, afterMoveCount + 1);
}

function collectCandidatePlies(uciMoves: string[]): number[] {
  const low = MIN_PLIES_BEFORE_GUESS;
  const high = uciMoves.length - 1;
  const out: number[] = [];
  for (let i = low; i <= high; i++) {
    if (!isCloudPuzzleCandidatePly(uciMoves, i)) continue;
    const correct = uciMoves[i];
    if (!correct || correct.length < 4) continue;
    const wrongChoices = collectWrongChoices(uciMoves, i, correct);
    if (wrongChoices.length < WRONG_CHOICE_COUNT) continue;
    out.push(i);
  }
  return out;
}

export function collectWrongChoices(
  uciMoves: string[],
  afterMoveCount: number,
  correctUci: string
): string[] {
  const primary = suggestWrongMoves(uciMoves, afterMoveCount, correctUci, 16);
  const chess = chessAtPly(uciMoves, afterMoveCount);
  if (!chess) return primary.slice(0, WRONG_CHOICE_COUNT);

  const legal = chess
    .moves({ verbose: true })
    .map((m) => `${m.from}${m.to}${m.promotion ?? ""}`)
    .filter((u) => u !== correctUci);

  const out: string[] = [];
  const seen = new Set<string>([correctUci]);

  for (const u of primary) {
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u.toLowerCase());
    }
    if (out.length >= WRONG_CHOICE_COUNT) return out;
  }

  const sortedLegal = [...legal].sort();
  for (const u of sortedLegal) {
    const ul = u.toLowerCase();
    if (seen.has(ul)) continue;
    seen.add(ul);
    out.push(ul);
    if (out.length >= WRONG_CHOICE_COUNT) break;
  }

  return out.slice(0, WRONG_CHOICE_COUNT);
}

export interface CloudPuzzlePayload {
  kind: "cloud";
  gameId: string;
  opponentName: string;
  uciMoves: string[];
  challenge: MoveChallenge;
  /** Curated puzzle with organizer-provided mating line */
  source?: "manual";
  /** UCI half-moves after `challenge.correctUci` (organizer-defined continuation; may or may not end in mate). */
  solutionLineUci?: string[];
}

export type ManualCommunityPuzzleBuildResult =
  | { ok: true; payload: CloudPuzzlePayload; mateAttackerHalfMoves: number }
  | { ok: false; errorKey: string };

/**
 * Build a community puzzle from an organizer-defined position and continuation line.
 * The puzzle move may differ from the move stored in the game PGN at that ply.
 */
export function tryBuildManualCommunityPuzzlePayload(input: {
  pgn: string;
  gameId: string;
  opponentName: string;
  afterMoveCount: number;
  correctUci: string;
  solutionLineUci: string[];
  promptFr?: string;
  promptEn?: string;
}): ManualCommunityPuzzleBuildResult {
  const parsed = parsePgnBlock(input.pgn);
  if (!parsed?.uciMoves?.length) return { ok: false, errorKey: "invalid_pgn" };

  const uciMoves = parsed.uciMoves.map((u) => u.trim().toLowerCase());
  const { afterMoveCount } = input;
  if (afterMoveCount < 0 || afterMoveCount >= uciMoves.length) {
    return { ok: false, errorKey: "ply_out_of_range" };
  }

  const chessBefore = chessAtPly(uciMoves, afterMoveCount);
  if (!chessBefore) return { ok: false, errorKey: "invalid_position" };

  const attackerColor = chessBefore.turn();
  if (attackerColor !== "w" && attackerColor !== "b") {
    return { ok: false, errorKey: "invalid_position" };
  }

  const correct = input.correctUci.trim().toLowerCase();
  const parts = uciToFromTo(correct);
  if (!parts) return { ok: false, errorKey: "invalid_uci" };

  const trial = new Chess(chessBefore.fen());
  let played: Move;
  try {
    const m = trial.move(parts);
    if (!m) return { ok: false, errorKey: "illegal_correct" };
    played = m;
  } catch {
    return { ok: false, errorKey: "illegal_correct" };
  }

  if (played.color !== attackerColor) return { ok: false, errorKey: "illegal_correct" };

  let attackerHalfMoves = 1;

  const solution = input.solutionLineUci
    .map((u) => u.trim().toLowerCase())
    .filter((u) => u.length >= 4);

  for (const uci of solution) {
    const p = uciToFromTo(uci);
    if (!p) return { ok: false, errorKey: "invalid_uci" };
    try {
      const m = trial.move(p);
      if (!m) return { ok: false, errorKey: "illegal_solution" };
      if (m.color === attackerColor) attackerHalfMoves += 1;
    } catch {
      return { ok: false, errorKey: "illegal_solution" };
    }
  }

  if (attackerHalfMoves < 2) return { ok: false, errorKey: "mate_too_short" };

  const wrongChoices = collectWrongChoices(uciMoves, afterMoveCount, correct);
  if (wrongChoices.length < WRONG_CHOICE_COUNT) {
    return { ok: false, errorKey: "wrong_choices" };
  }

  const label = input.opponentName.trim() || "?";

  const promptFr =
    input.promptFr?.trim() ||
    `Quel coup amorce la combinaison dans cette partie contre « ${label} » ?`;
  const promptEn =
    input.promptEn?.trim() ||
    `Which move starts the combination in this game vs « ${label} »?`;

  const challenge: MoveChallenge = {
    id: `cloud-manual-${input.gameId}-${afterMoveCount}`,
    afterMoveCount,
    prompt: { fr: promptFr, en: promptEn },
    correctUci: correct,
    wrongChoices: wrongChoices.slice(0, WRONG_CHOICE_COUNT),
    hints: [],
    insight: {
      fr: "Ligne proposée par l’organisateur :",
      en: "Curator continuation:",
    },
  };

  const payload: CloudPuzzlePayload = {
    kind: "cloud",
    gameId: input.gameId,
    opponentName: label,
    uciMoves,
    challenge,
    source: "manual",
    solutionLineUci: solution.length > 0 ? solution : undefined,
  };

  return { ok: true, payload, mateAttackerHalfMoves: attackerHalfMoves };
}

function insightForcedMate(mateAttackerMoves: 2 | 3): MoveChallenge["insight"] {
  return {
    fr: `Le coup joué amorce un mat forcé en exactement ${mateAttackerMoves} demi-coups du camp attaquant (défense optimale).`,
    en: `The played move begins a forced checkmate in exactly ${mateAttackerMoves} attacker half-moves (optimal defense).`,
  };
}

/**
 * Build community puzzle payload at a fixed ply (forced mate M2/M3 pool).
 */
export function buildCloudPayloadAtPly(
  pgn: string,
  meta: { opponentName: string; gameId: string },
  afterMoveCount: number,
  mateAttackerMoves: 2 | 3
): CloudPuzzlePayload | null {
  const parsed = parsePgnBlock(pgn);
  if (!parsed?.uciMoves?.length) return null;
  const uciMoves = parsed.uciMoves.map((u) => u.trim().toLowerCase());

  if (
    afterMoveCount < MIN_PLIES_BEFORE_GUESS ||
    afterMoveCount > uciMoves.length - 1
  ) {
    return null;
  }

  const correctUci = uciMoves[afterMoveCount];
  if (!correctUci || correctUci.length < 4) return null;

  const wrongChoices = collectWrongChoices(uciMoves, afterMoveCount, correctUci);
  if (wrongChoices.length < WRONG_CHOICE_COUNT) return null;

  const label = meta.opponentName.trim() || "?";
  const challenge: MoveChallenge = {
    id: `cloud-${meta.gameId}-${afterMoveCount}`,
    afterMoveCount,
    prompt: {
      fr: `Quel coup amorce un mat forcé en ${mateAttackerMoves} dans cette partie contre « ${label} » ?`,
      en: `Which move begins a forced mate in ${mateAttackerMoves} in this game vs « ${label} »?`,
    },
    correctUci,
    wrongChoices: wrongChoices.slice(0, WRONG_CHOICE_COUNT),
    hints: [],
    insight: insightForcedMate(mateAttackerMoves),
  };

  return {
    kind: "cloud",
    gameId: meta.gameId,
    opponentName: label,
    uciMoves,
    challenge,
  };
}

/**
 * Build a single-move quiz from a saved game PGN (guess the move played at a random ply).
 * Ne retient que des positions tactiques : sacrifices (captures typiques) ou combinaisons de mat
 * (mat au coup ou mat dans la continuation enregistrée).
 */
export function buildCloudMoveChallengeFromPgn(
  pgn: string,
  meta: { opponentName: string; gameId: string },
  rng: () => number = Math.random
): CloudPuzzlePayload | null {
  const parsed = parsePgnBlock(pgn);
  if (!parsed?.uciMoves?.length) return null;
  const uciMoves = parsed.uciMoves.map((u) => u.trim().toLowerCase());

  const candidates = collectCandidatePlies(uciMoves);
  if (candidates.length === 0) return null;

  const afterMoveCount = candidates[Math.floor(rng() * candidates.length)]!;
  const correctUci = uciMoves[afterMoveCount];
  if (!correctUci || correctUci.length < 4) return null;

  const wrongChoices = collectWrongChoices(uciMoves, afterMoveCount, correctUci);
  if (wrongChoices.length < WRONG_CHOICE_COUNT) return null;

  const label = meta.opponentName.trim() || "?";
  const challenge: MoveChallenge = {
    id: `cloud-${meta.gameId}-${afterMoveCount}`,
    afterMoveCount,
    prompt: {
      fr: `Quel coup tactique a été joué dans cette partie contre « ${label} » ?`,
      en: `What tactical move was played in this game vs « ${label} »?`,
    },
    correctUci,
    wrongChoices: wrongChoices.slice(0, WRONG_CHOICE_COUNT),
    hints: [],
    insight: {
      fr: "Coups issus des parties cloud : uniquement sacrifices typiques ou combinaisons menant au mat dans la ligne jouée.",
      en: "From cloud games: only typical sacrifices or combinations that lead to checkmate on the recorded line.",
    },
  };

  return {
    kind: "cloud",
    gameId: meta.gameId,
    opponentName: label,
    uciMoves,
    challenge,
  };
}

/** Validate that a PGN produces au moins un ply tactique avec assez de pièges. */
export function canBuildCloudPuzzleFromPgn(pgn: string): boolean {
  const parsed = parsePgnBlock(pgn);
  if (!parsed?.uciMoves?.length) return false;
  const uciMoves = parsed.uciMoves.map((u) => u.trim().toLowerCase());
  return collectCandidatePlies(uciMoves).length > 0;
}
