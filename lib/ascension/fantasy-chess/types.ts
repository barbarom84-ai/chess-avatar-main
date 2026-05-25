export type PieceAbilityId =
  | "knight_phantom"
  | "bishop_orthogonal"
  | "rook_tunnel"
  | "queen_split"
  | "pawn_charge"
  | "king_anchor";

export type FantasyObjective = "checkmate" | "capture_piece" | "reach_square";

export interface ActiveSkillSlot {
  id: string;
  charges: number;
}

export interface FantasyRuleSet {
  enabledAbilities: PieceAbilityId[];
  objective?: FantasyObjective;
  objectiveSquare?: string;
  objectivePiece?: string;
  activeSkills?: ActiveSkillSlot[];
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
}
