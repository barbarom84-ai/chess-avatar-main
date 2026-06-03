import { Chess, type Square } from "chess.js";
import type {
  FantasyChessStateSnapshot,
  FantasyMove,
  FantasyObjective,
  FantasyRuleSet,
  PieceAbilityId,
  SquareEffect,
} from "@/lib/ascension/fantasy-chess/types";
import { getSideToMoveFromFen } from "@/lib/ascension/fen-utils";

const FILES = "abcdefgh";
const RANKS = "12345678";

function squareToCoords(sq: Square): { file: number; rank: number } {
  return { file: FILES.indexOf(sq[0]!), rank: RANKS.indexOf(sq[1]!) };
}

function coordsToSquare(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${FILES[file]}${RANKS[rank]}` as Square;
}

function normalizeUci(uci: string): string | null {
  const u = uci.trim().toLowerCase();
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u)) return null;
  return u;
}

function applyStandardMove(chess: Chess, uci: string): boolean {
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promotion = uci.length > 4 ? (uci[4] as "q" | "r" | "b" | "n") : undefined;
  try {
    const move = chess.move({ from, to, promotion });
    return !!move;
  } catch {
    return false;
  }
}

function pieceAt(chess: Chess, sq: Square) {
  return chess.get(sq);
}

function generateKnightCrazyHorseMoves(
  chess: Chess,
  from: Square,
  rules: FantasyRuleSet,
  used: PieceAbilityId[]
): FantasyMove[] {
  if (!rules.enabledAbilities.includes("knight_phantom") || used.includes("knight_phantom")) {
    return [];
  }
  const piece = pieceAt(chess, from);
  if (!piece || piece.type !== "n") return [];

  const { file, rank } = squareToCoords(from);
  const moves: FantasyMove[] = [];

  // Diagonal slides like a bishop (same-color squares from the knight's square).
  const diagonals = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (const [df, dr] of diagonals) {
    for (let step = 1; step <= 7; step++) {
      const to = coordsToSquare(file + df * step, rank + dr * step);
      if (!to) break;
      const target = pieceAt(chess, to);
      if (!target) {
        moves.push({ uci: `${from}${to}`, isFantasy: true, abilityId: "knight_phantom" });
        continue;
      }
      if (target.color !== piece.color) {
        moves.push({ uci: `${from}${to}`, isFantasy: true, abilityId: "knight_phantom" });
      }
      break;
    }
  }

  // Orthogonal leap of exactly 2 squares (left, right, up, down); can jump over a blocker.
  const ortho2 = [
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
  ];
  for (const [df, dr] of ortho2) {
    const to = coordsToSquare(file + df, rank + dr);
    if (!to) continue;
    const target = pieceAt(chess, to);
    if (target && target.color === piece.color) continue;
    moves.push({ uci: `${from}${to}`, isFantasy: true, abilityId: "knight_phantom" });
  }

  return moves;
}

function generateBishopOrthogonalMoves(
  chess: Chess,
  from: Square,
  rules: FantasyRuleSet,
  used: PieceAbilityId[]
): FantasyMove[] {
  if (!rules.enabledAbilities.includes("bishop_orthogonal") || used.includes("bishop_orthogonal")) {
    return [];
  }
  const piece = pieceAt(chess, from);
  if (!piece || piece.type !== "b") return [];

  const { file, rank } = squareToCoords(from);
  const ortho = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const moves: FantasyMove[] = [];

  for (const [df, dr] of ortho) {
    for (let step = 1; step <= 7; step++) {
      const to = coordsToSquare(file + df * step, rank + dr * step);
      if (!to) break;
      const target = pieceAt(chess, to);
      if (!target) {
        moves.push({ uci: `${from}${to}`, isFantasy: true, abilityId: "bishop_orthogonal" });
        continue;
      }
      if (target.color !== piece.color) {
        moves.push({ uci: `${from}${to}`, isFantasy: true, abilityId: "bishop_orthogonal" });
      }
      break;
    }
  }

  return moves;
}

function generateRookTunnelMoves(
  chess: Chess,
  from: Square,
  rules: FantasyRuleSet
): FantasyMove[] {
  if (!rules.enabledAbilities.includes("rook_tunnel")) return [];
  const piece = pieceAt(chess, from);
  if (!piece || piece.type !== "r") return [];

  const { file, rank } = squareToCoords(from);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const moves: FantasyMove[] = [];

  for (const [df, dr] of dirs) {
    let skippedAlly = false;
    for (let step = 1; step <= 7; step++) {
      const to = coordsToSquare(file + df * step, rank + dr * step);
      if (!to) break;
      const target = pieceAt(chess, to);
      if (!target) {
        moves.push({ uci: `${from}${to}`, isFantasy: true, abilityId: "rook_tunnel" });
        continue;
      }
      if (target.color === piece.color && !skippedAlly) {
        skippedAlly = true;
        continue;
      }
      if (target.color !== piece.color) {
        moves.push({ uci: `${from}${to}`, isFantasy: true, abilityId: "rook_tunnel" });
      }
      break;
    }
  }

  return moves;
}

function generatePawnChargeMoves(
  chess: Chess,
  from: Square,
  rules: FantasyRuleSet,
  used: PieceAbilityId[]
): FantasyMove[] {
  if (!rules.enabledAbilities.includes("pawn_charge") || used.includes("pawn_charge")) {
    return [];
  }
  const piece = pieceAt(chess, from);
  if (!piece || piece.type !== "p") return [];

  const { file, rank } = squareToCoords(from);
  const dir = piece.color === "w" ? 1 : -1;
  const to = coordsToSquare(file, rank + dir * 2);
  if (!to) return [];

  const mid = coordsToSquare(file, rank + dir);
  if (!mid) return [];
  const midPiece = pieceAt(chess, mid);
  if (midPiece) {
    return [{ uci: `${from}${to}`, isFantasy: true, abilityId: "pawn_charge" }];
  }
  return [];
}

function getQueenSplitMoves(chess: Chess, from: Square): FantasyMove[] {
  const piece = pieceAt(chess, from);
  if (!piece || piece.type !== "q") return [];
  return chess.moves({ square: from, verbose: true }).map((m) => ({
    uci: `${m.from}${m.to}${m.promotion ?? ""}`,
    isFantasy: false as const,
    abilityId: "queen_split" as const,
  }));
}

function getGreedyPawnCaptures(chess: Chess, from: Square): FantasyMove[] {
  const piece = pieceAt(chess, from);
  if (!piece || piece.type !== "p") return [];

  const { file, rank } = squareToCoords(from);
  const dir = piece.color === "w" ? 1 : -1;
  const moves: FantasyMove[] = [];

  for (const df of [-1, 1]) {
    const to = coordsToSquare(file + df, rank + dir);
    if (!to) continue;
    const target = pieceAt(chess, to);
    if (!target || target.color === piece.color) continue;

    const promoRank = piece.color === "w" ? 7 : 0;
    const landRank = squareToCoords(to).rank;
    if (landRank === promoRank) {
      for (const promotion of ["q", "r", "b", "n"] as const) {
        moves.push({ uci: `${from}${to}${promotion}`, isFantasy: false, abilityId: "pawn_greedy" });
      }
    } else {
      moves.push({ uci: `${from}${to}`, isFantasy: false, abilityId: "pawn_greedy" });
    }
  }

  return moves;
}

/** Greedy pawn chain: captures first, then a forward promotion if on the 7th rank. */
function getGreedyPawnChainMoves(chess: Chess, from: Square): FantasyMove[] {
  const captures = getGreedyPawnCaptures(chess, from);
  if (captures.length > 0) return captures;

  const piece = pieceAt(chess, from);
  if (!piece || piece.type !== "p") return [];

  const { file, rank } = squareToCoords(from);
  const dir = piece.color === "w" ? 1 : -1;
  const promoRank = piece.color === "w" ? 7 : 0;
  const landRank = rank + dir;
  if (landRank !== promoRank) return [];

  const to = coordsToSquare(file, landRank);
  if (!to || pieceAt(chess, to)) return [];

  return (["q", "r", "b", "n"] as const).map((promotion) => ({
    uci: `${from}${to}${promotion}`,
    isFantasy: false as const,
    abilityId: "pawn_greedy" as const,
  }));
}

export class FantasyChessEngine {
  private chess: Chess;
  private rules: FantasyRuleSet;
  private moveHistory: string[] = [];
  private usedAbilities: PieceAbilityId[] = [];
  private fantasyMoveFlags: boolean[] = [];
  private abilityByMoveIndex: (PieceAbilityId | undefined)[] = [];
  private greedyPawnSquare: Square | null = null;
  private queenSplitSquare: Square | null = null;
  private triggeredSquares: Set<string> = new Set();

  constructor(fen: string, rules: FantasyRuleSet) {
    this.chess = new Chess(fen);
    this.rules = rules;
  }

  getSpecialSquares(): SquareEffect[] {
    return this.rules.specialSquares ?? [];
  }

  getTriggeredSquares(): string[] {
    return [...this.triggeredSquares];
  }

  get fen(): string {
    return this.chess.fen();
  }

  get turn(): "w" | "b" {
    return this.chess.turn();
  }

  isGreedyChainActive(): boolean {
    return this.greedyPawnSquare !== null;
  }

  isQueenSplitChainActive(): boolean {
    return this.queenSplitSquare !== null;
  }

  getGreedyPawnSquare(): Square | null {
    return this.greedyPawnSquare;
  }

  getQueenSplitSquare(): Square | null {
    return this.queenSplitSquare;
  }

  /** True when piece abilities may apply (solver side in puzzles). */
  private isFantasyColor(color: "w" | "b"): boolean {
    if (!this.rules.fantasySide) return true;
    return color === this.rules.fantasySide;
  }

  private clearFantasyChains(): void {
    this.greedyPawnSquare = null;
    this.queenSplitSquare = null;
  }

  private applyStandardOnlyMove(
    normalized: string,
    from: Square,
    to: Square,
    moverColor: "w" | "b"
  ): boolean {
    this.clearFantasyChains();
    const next = new Chess(this.chess.fen());
    if (!applyStandardMove(next, normalized)) return false;
    this.chess = next;
    this.resolveSquareEffects(to, moverColor);

    this.moveHistory.push(normalized);
    this.fantasyMoveFlags.push(false);
    this.abilityByMoveIndex.push(undefined);
    return true;
  }

  private setSideToMove(color: "w" | "b") {
    const parts = this.chess.fen().split(" ");
    parts[1] = color;
    this.chess.load(parts.join(" "));
  }

  private continueGreedyChainIfPossible(landSquare: Square, pawnColor: "w" | "b") {
    if (
      !this.isFantasyColor(pawnColor) ||
      !this.rules.enabledAbilities.includes("pawn_greedy")
    ) {
      this.greedyPawnSquare = null;
      return;
    }
    const moreCaptures = getGreedyPawnChainMoves(this.chess, landSquare);
    if (moreCaptures.length > 0) {
      this.greedyPawnSquare = landSquare;
      this.setSideToMove(pawnColor);
      return;
    }
    this.greedyPawnSquare = null;
  }

  private continueQueenSplitIfPossible(landSquare: Square, queenColor: "w" | "b") {
    if (
      !this.isFantasyColor(queenColor) ||
      !this.rules.enabledAbilities.includes("queen_split")
    ) {
      this.queenSplitSquare = null;
      return;
    }
    this.setSideToMove(queenColor);
    const moreMoves = getQueenSplitMoves(this.chess, landSquare);
    if (moreMoves.length > 0) {
      this.queenSplitSquare = landSquare;
      return;
    }
    this.queenSplitSquare = null;
    if (!this.usedAbilities.includes("queen_split")) {
      this.usedAbilities.push("queen_split");
    }
  }

  snapshot(): FantasyChessStateSnapshot {
    return {
      fen: this.chess.fen(),
      moveHistory: [...this.moveHistory],
      usedAbilities: [...this.usedAbilities],
      fantasyMovesUsed: this.fantasyMoveFlags.filter(Boolean).length,
      triggeredSquares: [...this.triggeredSquares],
    };
  }

  private squareEffectAt(square: string): SquareEffect | undefined {
    return (this.rules.specialSquares ?? []).find((e) => e.square === square);
  }

  /** True when moving onto a tunnel entry whose exit is blocked by a friendly piece. */
  private tunnelExitBlocked(from: Square, to: Square): boolean {
    const effect = this.squareEffectAt(to);
    if (!effect || effect.type !== "tunnel" || !effect.linkTo) return false;
    const mover = this.chess.get(from);
    const exitOccupant = this.chess.get(effect.linkTo as Square);
    return !!mover && !!exitOccupant && exitOccupant.color === mover.color;
  }

  /**
   * Resolve a special square after a piece has landed on `to`. Kings are immune to
   * explosive blast (adjacent). Tunnels relocate the piece then resolve effects at
   * the exit (explosive/trap chain). Uses chess.js board edits.
   */
  private resolveSquareEffects(to: Square, moverColor: "w" | "b", depth = 0): void {
    if (depth > 6) return;

    const effect = this.squareEffectAt(to);
    if (!effect) return;

    if (effect.type === "tunnel") {
      if (!effect.linkTo) return;
      const exit = effect.linkTo as Square;
      const piece = this.chess.get(to);
      if (!piece) return;
      const occupant = this.chess.get(exit);
      if (occupant && occupant.color === piece.color) return;
      if (occupant) this.chess.remove(exit);
      this.chess.remove(to);
      this.chess.put({ type: piece.type, color: piece.color }, exit);
      this.resolveSquareEffects(exit, piece.color, depth + 1);
      return;
    }

    // explosive / trap fire once.
    if (this.triggeredSquares.has(to)) return;
    this.triggeredSquares.add(to);

    if (effect.type === "trap") {
      const piece = this.chess.get(to);
      if (!piece) return;
      if (
        piece.type === "k" &&
        this.rules.enabledAbilities.includes("king_anchor") &&
        this.isFantasyColor(piece.color)
      ) {
        return;
      }
      this.chess.remove(to);
      return;
    }

    if (effect.type === "explosive") {
      const { file, rank } = squareToCoords(to);
      const center = this.chess.get(to);
      const blastDodge =
        this.rules.passiveSkills?.includes("blast_dodge") &&
        this.isFantasyColor(moverColor);
      if (center && center.type !== "k" && !blastDodge) this.chess.remove(to);
      for (let df = -1; df <= 1; df++) {
        for (let dr = -1; dr <= 1; dr++) {
          if (df === 0 && dr === 0) continue;
          const adj = coordsToSquare(file + df, rank + dr);
          if (!adj) continue;
          const p = this.chess.get(adj);
          if (p && p.type !== "k") this.chess.remove(adj);
        }
      }
    }
  }

  getLegalMoves(from?: Square): FantasyMove[] {
    if (this.greedyPawnSquare) {
      const chainSquare = this.greedyPawnSquare;
      const chainPiece = this.chess.get(chainSquare);
      if (!chainPiece || !this.isFantasyColor(chainPiece.color)) {
        this.greedyPawnSquare = null;
      } else {
        if (from && from !== chainSquare) return [];
        return getGreedyPawnChainMoves(this.chess, chainSquare);
      }
    }

    if (this.queenSplitSquare) {
      const chainSquare = this.queenSplitSquare;
      const chainPiece = this.chess.get(chainSquare);
      if (!chainPiece || !this.isFantasyColor(chainPiece.color)) {
        this.queenSplitSquare = null;
      } else {
        if (from && from !== chainSquare) return [];
        return getQueenSplitMoves(this.chess, chainSquare);
      }
    }

    const standard = this.chess.moves({ square: from, verbose: true }).map((m) => ({
      uci: `${m.from}${m.to}${m.promotion ?? ""}`,
      isFantasy: false as const,
    }));

    if (!from) return standard;

    const mover = this.chess.get(from);
    if (!mover || !this.isFantasyColor(mover.color)) {
      return standard;
    }

    const fantasy: FantasyMove[] = [
      ...generateKnightCrazyHorseMoves(this.chess, from, this.rules, this.usedAbilities),
      ...generateBishopOrthogonalMoves(this.chess, from, this.rules, this.usedAbilities),
      ...generateRookTunnelMoves(this.chess, from, this.rules),
      ...generatePawnChargeMoves(this.chess, from, this.rules, this.usedAbilities),
    ];

    const seen = new Set<string>();
    const merged: FantasyMove[] = [];
    for (const m of [...standard, ...fantasy]) {
      if (seen.has(m.uci)) continue;
      seen.add(m.uci);
      merged.push(m);
    }
    return merged.filter(
      (m) => !this.tunnelExitBlocked(from, m.uci.slice(2, 4) as Square)
    );
  }

  private applyFantasyMove(from: Square, to: Square, promotion?: string): boolean {
    const piece = this.chess.get(from);
    if (!piece) return false;

    const temp = new Chess(this.chess.fen());
    temp.remove(from);
    if (temp.get(to)) temp.remove(to);
    const placedType =
      promotion && piece.type === "p"
        ? (promotion as "q" | "r" | "b" | "n")
        : piece.type;
    temp.put({ type: placedType, color: piece.color }, to);

    const parts = temp.fen().split(" ");
    parts[1] = this.chess.turn() === "w" ? "b" : "w";
    parts[4] = "0";
    if (parts[1] === "w") {
      parts[5] = String(Number(parts[5] ?? "1") + 1);
    }
    this.chess.load(parts.join(" "));
    return true;
  }

  applyMove(uci: string): boolean {
    const normalized = normalizeUci(uci);
    if (!normalized) return false;

    const from = normalized.slice(0, 2) as Square;
    const to = normalized.slice(2, 4) as Square;
    const pieceBefore = this.chess.get(from);
    const capturedBefore = this.chess.get(to);
    if (!pieceBefore) return false;

    if (!this.isFantasyColor(pieceBefore.color)) {
      return this.applyStandardOnlyMove(normalized, from, to, pieceBefore.color);
    }

    if (this.greedyPawnSquare) {
      if (from !== this.greedyPawnSquare) return false;
      const legal = getGreedyPawnChainMoves(this.chess, from);
      const match = legal.find((m) => m.uci === normalized);
      if (!match || !pieceBefore) return false;

      const next = new Chess(this.chess.fen());
      if (!applyStandardMove(next, normalized)) return false;
      this.chess = next;
      this.resolveSquareEffects(to, pieceBefore.color);

      this.moveHistory.push(normalized);
      this.fantasyMoveFlags.push(false);
      this.abilityByMoveIndex.push("pawn_greedy");
      this.continueGreedyChainIfPossible(to, pieceBefore.color);
      return true;
    }

    if (this.queenSplitSquare) {
      if (from !== this.queenSplitSquare) return false;
      const legal = getQueenSplitMoves(this.chess, from);
      const match = legal.find((m) => m.uci === normalized);
      if (!match) return false;

      const next = new Chess(this.chess.fen());
      if (!applyStandardMove(next, normalized)) return false;
      this.chess = next;
      this.resolveSquareEffects(to, pieceBefore.color);

      this.moveHistory.push(normalized);
      this.fantasyMoveFlags.push(false);
      this.abilityByMoveIndex.push("queen_split");
      this.queenSplitSquare = null;
      if (!this.usedAbilities.includes("queen_split")) {
        this.usedAbilities.push("queen_split");
      }
      return true;
    }

    const legal = this.getLegalMoves(from);
    const match = legal.find((m) => m.uci === normalized);
    if (!match) return false;

    const next = new Chess(this.chess.fen());
    const applied = applyStandardMove(next, normalized);

    if (applied) {
      this.chess = next;
    } else if (match.isFantasy) {
      const promotion = normalized.length > 4 ? normalized[4] : undefined;
      if (!this.applyFantasyMove(from, to, promotion)) return false;
    } else {
      return false;
    }

    this.resolveSquareEffects(to, pieceBefore.color);

    this.moveHistory.push(normalized);
    this.fantasyMoveFlags.push(match.isFantasy);
    this.abilityByMoveIndex.push(match.abilityId);
    if (
      match.abilityId &&
      match.abilityId !== "queen_split" &&
      !this.usedAbilities.includes(match.abilityId)
    ) {
      this.usedAbilities.push(match.abilityId);
    }

    const wasPawnCapture =
      pieceBefore?.type === "p" &&
      !!capturedBefore &&
      capturedBefore.color !== pieceBefore.color;
    const wasQueenMove = pieceBefore?.type === "q";
    if (wasPawnCapture) {
      this.continueGreedyChainIfPossible(to, pieceBefore.color);
    } else if (
      wasQueenMove &&
      this.rules.enabledAbilities.includes("queen_split") &&
      !this.usedAbilities.includes("queen_split")
    ) {
      this.continueQueenSplitIfPossible(to, pieceBefore.color);
    } else {
      this.greedyPawnSquare = null;
    }

    return true;
  }

  isObjectiveMet(objective: FantasyObjective = this.rules.objective ?? "checkmate"): boolean {
    if (objective === "checkmate") {
      return this.chess.isCheckmate();
    }
    if (objective === "reach_square" && this.rules.objectiveSquare) {
      const sq = this.rules.objectiveSquare as Square;
      const piece = this.chess.get(sq);
      const moverColor = this.chess.turn() === "w" ? "b" : "w";
      return !!piece && piece.color === moverColor;
    }
    if (objective === "capture_piece" && this.rules.objectivePiece) {
      const [color, type] = this.rules.objectivePiece.split(":");
      for (const sq of FILES.split("").flatMap((f) =>
        RANKS.split("").map((r) => `${f}${r}` as Square)
      )) {
        const p = this.chess.get(sq);
        if (p && p.color === color && p.type === type) return false;
      }
      return true;
    }
    return this.chess.isCheckmate();
  }

  isPuzzleSolved(solutionUcis: string[]): boolean {
    if (this.moveHistory.length !== solutionUcis.length) return false;
    for (let i = 0; i < solutionUcis.length; i++) {
      if (this.moveHistory[i]!.toLowerCase() !== solutionUcis[i]!.toLowerCase()) {
        return false;
      }
    }
    return true;
  }

  static replaySolution(
    fen: string,
    rules: FantasyRuleSet,
    solutionUcis: string[]
  ): { ok: boolean; error?: string } {
    let engine: FantasyChessEngine;
    const puzzleRules = {
      ...rules,
      fantasySide: rules.fantasySide ?? getSideToMoveFromFen(fen),
    };
    try {
      engine = new FantasyChessEngine(fen, puzzleRules);
    } catch {
      return { ok: false, error: `Invalid FEN: ${fen}` };
    }
    for (const uci of solutionUcis) {
      if (!engine.applyMove(uci)) {
        return { ok: false, error: `Illegal move: ${uci}` };
      }
    }
    return { ok: true };
  }
}
