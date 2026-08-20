import { validateStandardPuzzleLine } from "../lib/ascension/puzzle-validation";
import { FantasyChessEngine } from "../lib/ascension/fantasy-chess/engine";

interface SeedPuzzle {
  slug: string;
  kind: "standard" | "fantasy";
  track: string;
  fen: string;
  solution_ucis: string[];
  fantasy_rules?: Record<string, unknown>;
  sort_order: number;
}

const MAIN_STANDARD: SeedPuzzle[] = [
  { slug: "std-010-rook-mate", kind: "standard", track: "main", sort_order: 10, fen: "5k2/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1", solution_ucis: ["e1e8"] },
  { slug: "std-011-knight-fork", kind: "standard", track: "main", sort_order: 11, fen: "3k4/8/3q4/3N4/8/8/8/6K1 w - - 0 1", solution_ucis: ["d5c7"] },
  { slug: "std-012-queen-capture", kind: "standard", track: "main", sort_order: 12, fen: "6k1/5q2/8/8/8/8/6Q1/6K1 w - - 0 1", solution_ucis: ["g2g7"] },
  { slug: "std-013-bishop-pin", kind: "standard", track: "main", sort_order: 13, fen: "6k1/8/5p2/8/8/3B4/5PPP/6K1 w - - 0 1", solution_ucis: ["d3g6"] },
  { slug: "std-014-mate-in-1", kind: "standard", track: "main", sort_order: 14, fen: "6k1/5ppp/8/8/8/8/5QPP/6K1 w - - 0 1", solution_ucis: ["f2f7"] },
  { slug: "std-015-rook-check", kind: "standard", track: "main", sort_order: 15, fen: "6k1/8/8/8/8/8/5PPP/R5K1 w - - 0 1", solution_ucis: ["a1a8"] },
  { slug: "std-016-knight-capture", kind: "standard", track: "main", sort_order: 16, fen: "4k3/8/8/8/8/3n4/8/4N2K w - - 0 1", solution_ucis: ["e1d3"] },
  { slug: "std-017-queen-mate", kind: "standard", track: "main", sort_order: 17, fen: "6k1/5ppp/8/8/8/8/5QPP/6K1 w - - 0 1", solution_ucis: ["f2f7"] },
  { slug: "std-018-bishop-mate", kind: "standard", track: "main", sort_order: 18, fen: "6k1/8/5p2/8/8/8/5PPP/5BK1 w - - 0 1", solution_ucis: ["f1b5"] },
  { slug: "std-019-rook-capture", kind: "standard", track: "main", sort_order: 19, fen: "6k1/8/8/8/8/8/5r2/4R1K1 w - - 0 1", solution_ucis: ["e1e8"] },
  { slug: "std-020-queen-mate", kind: "standard", track: "main", sort_order: 20, fen: "5k2/8/8/8/8/8/5QPP/6K1 w - - 0 1", solution_ucis: ["f2f7"] },
];

const FANTASY_TRACK: SeedPuzzle[] = [
  { slug: "fantasy-004-trap", kind: "fantasy", track: "fantasy", sort_order: 4, fen: "6k1/8/8/8/8/8/8/4R2K w - - 0 1", solution_ucis: ["e1e8"], fantasy_rules: { enabledAbilities: [], objective: "reach_square", objectiveSquare: "e8", specialSquares: [{ square: "e5", type: "trap" }] } },
  { slug: "fantasy-005-bishop-orth", kind: "fantasy", track: "fantasy", sort_order: 5, fen: "8/8/8/8/4B3/8/8/2K2k2 w - - 0 1", solution_ucis: ["e4e8"], fantasy_rules: { enabledAbilities: ["bishop_orthogonal"], objective: "reach_square", objectiveSquare: "e8" } },
  { slug: "fantasy-006-rook-tunnel", kind: "fantasy", track: "fantasy", sort_order: 6, fen: "8/8/8/8/4R3/3P4/8/2K2k2 w - - 0 1", solution_ucis: ["e4e8"], fantasy_rules: { enabledAbilities: ["rook_tunnel"], objective: "reach_square", objectiveSquare: "e8" } },
  { slug: "fantasy-007-pawn-charge", kind: "fantasy", track: "fantasy", sort_order: 7, fen: "8/8/8/8/8/3p4/3P4/3K2k1 w - - 0 1", solution_ucis: ["d2d4"], fantasy_rules: { enabledAbilities: ["pawn_charge"], objective: "reach_square", objectiveSquare: "d4" } },
  { slug: "fantasy-008-tunnel-2", kind: "fantasy", track: "fantasy", sort_order: 8, fen: "6k1/8/4p3/8/R7/8/8/6K1 w - - 0 1", solution_ucis: ["a4e4"], fantasy_rules: { enabledAbilities: [], objective: "reach_square", objectiveSquare: "e6", specialSquares: [{ square: "e4", type: "tunnel", linkTo: "e6" }] } },
  { slug: "fantasy-009-explosive-2", kind: "fantasy", track: "fantasy", sort_order: 9, fen: "6k1/8/8/3q4/R7/8/8/6K1 w - - 0 1", solution_ucis: ["a4e4"], fantasy_rules: { enabledAbilities: [], objective: "capture_piece", objectivePiece: "b:q", specialSquares: [{ square: "e4", type: "explosive" }] } },
  { slug: "fantasy-010-bishop-orth-2", kind: "fantasy", track: "fantasy", sort_order: 10, fen: "8/8/8/8/8/1B6/8/1K3k2 w - - 0 1", solution_ucis: ["b3b8"], fantasy_rules: { enabledAbilities: ["bishop_orthogonal"], objective: "reach_square", objectiveSquare: "b8" } },
  { slug: "fantasy-011-king-tunnel", kind: "fantasy", track: "fantasy", sort_order: 11, fen: "6k1/8/8/8/8/8/8/4K3 w - - 0 1", solution_ucis: ["e1e2"], fantasy_rules: { enabledAbilities: [], objective: "reach_square", objectiveSquare: "e7", specialSquares: [{ square: "e2", type: "tunnel", linkTo: "e7" }] } },
  { slug: "fantasy-012-rook-tunnel-2", kind: "fantasy", track: "fantasy", sort_order: 12, fen: "8/8/8/8/4R3/3P4/8/2K2k2 w - - 0 1", solution_ucis: ["e4e8"], fantasy_rules: { enabledAbilities: ["rook_tunnel"], objective: "reach_square", objectiveSquare: "e8" } },
  { slug: "fantasy-013-pawn-charge-2", kind: "fantasy", track: "fantasy", sort_order: 13, fen: "8/8/8/8/8/3p4/3P4/3K2k1 w - - 0 1", solution_ucis: ["d2d4"], fantasy_rules: { enabledAbilities: ["pawn_charge"], objective: "reach_square", objectiveSquare: "d4" } },
  { slug: "fantasy-014-tunnel-3", kind: "fantasy", track: "fantasy", sort_order: 14, fen: "6k1/8/4p3/8/R7/8/8/6K1 w - - 0 1", solution_ucis: ["a4e4"], fantasy_rules: { enabledAbilities: [], objective: "reach_square", objectiveSquare: "e6", specialSquares: [{ square: "e4", type: "tunnel", linkTo: "e6" }] } },
  { slug: "fantasy-015-bishop-orth-3", kind: "fantasy", track: "fantasy", sort_order: 15, fen: "8/8/8/8/4B3/8/8/2K2k2 w - - 0 1", solution_ucis: ["e4e8"], fantasy_rules: { enabledAbilities: ["bishop_orthogonal"], objective: "reach_square", objectiveSquare: "e8" } },
  { slug: "fantasy-016-explosive-3", kind: "fantasy", track: "fantasy", sort_order: 16, fen: "6k1/8/8/3q4/R7/8/8/6K1 w - - 0 1", solution_ucis: ["a4e4"], fantasy_rules: { enabledAbilities: [], objective: "capture_piece", objectivePiece: "b:q", specialSquares: [{ square: "e4", type: "explosive" }] } },
  { slug: "fantasy-017-rook-tunnel-3", kind: "fantasy", track: "fantasy", sort_order: 17, fen: "8/8/8/8/4R3/3P4/8/2K2k2 w - - 0 1", solution_ucis: ["e4e8"], fantasy_rules: { enabledAbilities: ["rook_tunnel"], objective: "reach_square", objectiveSquare: "e8" } },
  { slug: "fantasy-018-king-tunnel-2", kind: "fantasy", track: "fantasy", sort_order: 18, fen: "6k1/8/8/8/8/8/8/4K3 w - - 0 1", solution_ucis: ["e1e2"], fantasy_rules: { enabledAbilities: [], objective: "reach_square", objectiveSquare: "e7", specialSquares: [{ square: "e2", type: "tunnel", linkTo: "e7" }] } },
  { slug: "fantasy-019-bishop-orth-4", kind: "fantasy", track: "fantasy", sort_order: 19, fen: "8/8/8/8/8/1B6/8/1K3k2 w - - 0 1", solution_ucis: ["b3b8"], fantasy_rules: { enabledAbilities: ["bishop_orthogonal"], objective: "reach_square", objectiveSquare: "b8" } },
  { slug: "fantasy-020-pawn-charge-3", kind: "fantasy", track: "fantasy", sort_order: 20, fen: "8/8/8/8/8/3p4/3P4/3K2k1 w - - 0 1", solution_ucis: ["d2d4"], fantasy_rules: { enabledAbilities: ["pawn_charge"], objective: "reach_square", objectiveSquare: "d4" } },
];

import type { FantasyRuleSet } from "../lib/ascension/fantasy-chess/types";

function validateFantasy(p: SeedPuzzle): boolean {
  const rules = (p.fantasy_rules ?? { enabledAbilities: [] }) as unknown as FantasyRuleSet;
  const result = FantasyChessEngine.replaySolution(p.fen, rules, p.solution_ucis);
  return result.ok;
}

let failed = false;
for (const p of MAIN_STANDARD) {
  const r = validateStandardPuzzleLine(p.fen, p.solution_ucis);
  if (!r.ok) {
    console.error("FAIL standard", p.slug, r.error);
    failed = true;
  } else {
    console.log("OK standard", p.slug);
  }
}
for (const p of FANTASY_TRACK) {
  if (!validateFantasy(p)) {
    console.error("FAIL fantasy", p.slug);
    failed = true;
  } else {
    console.log("OK fantasy", p.slug);
  }
}
process.exit(failed ? 1 : 0);
