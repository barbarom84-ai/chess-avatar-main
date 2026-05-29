export type PieceAbilityId =
  | "knight_phantom"
  | "bishop_orthogonal"
  | "rook_tunnel"
  | "queen_split"
  | "pawn_charge"
  | "pawn_greedy"
  | "king_anchor";

export type FantasyObjective = "checkmate" | "capture_piece" | "reach_square";

export interface ActiveSkillSlot {
  id: string;
  charges: number;
}

/**
 * Board square mechanics resolved after a piece lands on the square.
 * - `explosive`: removes the landing piece and all adjacent pieces (kings immune); one-shot.
 * - `trap`: removes the landing piece (kings immune); one-shot.
 * - `tunnel`: teleports the landing piece to `linkTo` (captures an enemy there, blocked by an ally); reusable.
 */
export type SquareEffectType = "explosive" | "trap" | "tunnel";

export interface SquareEffect {
  square: string;
  type: SquareEffectType;
  /** Required for `tunnel`: destination square the piece is teleported to. */
  linkTo?: string;
}

export interface FantasyRuleSet {
  enabledAbilities: PieceAbilityId[];
  objective?: FantasyObjective;
  objectiveSquare?: string;
  objectivePiece?: string;
  activeSkills?: ActiveSkillSlot[];
  specialSquares?: SquareEffect[];
}

export interface FantasyMove {
  uci: string;
  isFantasy: boolean;
  abilityId?: PieceAbilityId;
}

export interface FantasyChessStateSnapshot {
  fen: string;
  moveHistory: string[];
  usedAbilities: PieceAbilityId[];
  fantasyMovesUsed: number;
  triggeredSquares?: string[];
}
