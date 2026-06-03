import { Chess, type Square } from "chess.js";
import { FantasyChessEngine } from "@/lib/ascension/fantasy-chess/engine";
import type {
  FantasyObjective,
  FantasyRuleSet,
  PieceAbilityId,
  SquareEffect,
} from "@/lib/ascension/fantasy-chess/types";
import { buildPromptFromThemes } from "@/lib/ascension/lichess-import";
import { validateStandardPuzzleLine } from "@/lib/ascension/puzzle-validation";
import { extractPlayerMoves } from "@/lib/ascension/puzzle-sequence";
import type { LocalizedText } from "@/lib/ascension/types";

const FILES = "abcdefgh";
const RANKS = "12345678";

const ABILITY_ORDER: PieceAbilityId[] = [
  "bishop_orthogonal",
  "rook_tunnel",
  "knight_phantom",
  "pawn_greedy",
  "pawn_charge",
  "queen_split",
  "king_anchor",
];

const ABILITY_LABELS: Record<PieceAbilityId, LocalizedText> = {
  bishop_orthogonal: {
    fr: "Pouvoir fantasy : fou orthogonal",
    en: "Fantasy power: orthogonal bishop",
  },
  rook_tunnel: { fr: "Pouvoir fantasy : tour tunnel", en: "Fantasy power: tunnel rook" },
  knight_phantom: {
    fr: "Pouvoir fantasy : Cavalier fou (Crazy Horse)",
    en: "Fantasy power: Crazy Horse knight",
  },
  pawn_greedy: { fr: "Pouvoir fantasy : pion glouton", en: "Fantasy power: greedy pawn" },
  pawn_charge: { fr: "Pouvoir fantasy : charge du pion", en: "Fantasy power: pawn charge" },
  queen_split: { fr: "Pouvoir fantasy : dame scindée", en: "Fantasy power: split queen" },
  king_anchor: { fr: "Pouvoir fantasy : roi ancré", en: "Fantasy power: anchored king" },
};

const ABILITY_HINTS: Record<PieceAbilityId, LocalizedText[]> = {
  bishop_orthogonal: [
    {
      fr: "Le fou peut glisser verticalement ou horizontalement comme une tour.",
      en: "The bishop can slide vertically or horizontally like a rook.",
    },
  ],
  rook_tunnel: [
    {
      fr: "La tour peut traverser une pièce alliée sur sa trajectoire.",
      en: "The rook can pass through a friendly piece on its path.",
    },
  ],
  knight_phantom: [
    {
      fr: "Le cavalier peut sauter de 2 cases sur les côtés ou glisser en diagonale.",
      en: "The knight can leap 2 squares orthogonally or slide diagonally.",
    },
  ],
  pawn_greedy: [
    {
      fr: "Après une capture, le pion continue tant qu'une prise est possible.",
      en: "After a capture, the pawn keeps taking while another capture is available.",
    },
  ],
  pawn_charge: [
    {
      fr: "Le pion peut avancer de deux cases malgré un blocage devant lui.",
      en: "The pawn can advance two squares despite a block in front.",
    },
  ],
  queen_split: [
    {
      fr: "La dame peut enchaîner un second coup sans passer le tour, sauf si le premier met le roi adverse en échec.",
      en: "The queen can chain a second move without yielding the turn, unless the first move puts the opponent king in check.",
    },
  ],
  king_anchor: [
    {
      fr: "Le roi ancré ne peut pas être capturé par les effets de cases spéciales.",
      en: "The anchored king cannot be captured by special-square effects.",
    },
  ],
};

export type FantasyTransformSource = "ability" | "special_square" | "fallback";

export interface FantasyTransformResult {
  fantasy_rules: FantasyRuleSet;
  prompt: LocalizedText;
  hints: LocalizedText[];
  mechanismNote: LocalizedText;
  source: FantasyTransformSource;
}

function normalizeSolution(solutionUcis: string[]): string[] {
  return solutionUcis.map((u) => u.trim().toLowerCase());
}

function allSquares(): Square[] {
  return FILES.split("").flatMap((f) =>
    RANKS.split("").map((r) => `${f}${r}` as Square)
  );
}

function adjacentSquares(sq: string): Square[] {
  const file = FILES.indexOf(sq[0]!);
  const rank = RANKS.indexOf(sq[1]!);
  if (file < 0 || rank < 0) return [];
  const out: Square[] = [];
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const f = file + df;
      const r = rank + dr;
      if (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
        out.push(`${FILES[f]}${RANKS[r]}` as Square);
      }
    }
  }
  return out;
}

function isMateTheme(themes: string[]): boolean {
  return themes.some(
    (t) => t === "mate" || t === "backRankMate" || t.startsWith("mateIn")
  );
}

function lastPlayerDestination(fen: string, solutionUcis: string[]): string | undefined {
  const playerMoves = extractPlayerMoves(fen, normalizeSolution(solutionUcis));
  const last = playerMoves[playerMoves.length - 1];
  return last && last.length >= 4 ? last.slice(2, 4) : undefined;
}

function inferObjective(
  themes: string[],
  destination: string | undefined
): FantasyObjective {
  if (isMateTheme(themes)) return "checkmate";
  return "reach_square";
}

function buildRules(
  enabledAbilities: PieceAbilityId[],
  objective: FantasyObjective,
  objectiveSquare?: string,
  objectivePiece?: string,
  specialSquares?: SquareEffect[]
): FantasyRuleSet {
  return {
    enabledAbilities,
    objective,
    ...(objective === "reach_square" && objectiveSquare
      ? { objectiveSquare }
      : {}),
    ...(objective === "capture_piece" && objectivePiece ? { objectivePiece } : {}),
    ...(specialSquares && specialSquares.length > 0 ? { specialSquares } : {}),
  };
}

function validateTransform(
  fen: string,
  rules: FantasyRuleSet,
  solutionUcis: string[]
): boolean {
  const normalized = normalizeSolution(solutionUcis);
  const replay = FantasyChessEngine.replaySolution(fen, rules, normalized);
  if (!replay.ok) return false;

  try {
    const engine = new FantasyChessEngine(fen, rules);
    for (const uci of normalized) {
      if (!engine.applyMove(uci)) return false;
    }
    const objective = rules.objective ?? "checkmate";
    return engine.isObjectiveMet(objective);
  } catch {
    return false;
  }
}

function finalStandardFen(fen: string, solutionUcis: string[]): string | null {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  for (const uci of normalizeSolution(solutionUcis)) {
    if (!applyMoveToChess(chess, uci)) return null;
  }
  return chess.fen();
}

function finalFantasyFen(
  fen: string,
  rules: FantasyRuleSet,
  solutionUcis: string[]
): string | null {
  try {
    const engine = new FantasyChessEngine(fen, rules);
    for (const uci of normalizeSolution(solutionUcis)) {
      if (!engine.applyMove(uci)) return null;
    }
    return engine.fen;
  } catch {
    return null;
  }
}

function applyMoveToChess(chess: Chess, uci: string): boolean {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? (uci[4] as "q" | "r" | "b" | "n") : undefined;
  try {
    return !!chess.move({ from, to, promotion });
  } catch {
    return false;
  }
}

/** Special squares should only apply when they change the outcome vs standard chess. */
function outcomeDiffersFromStandard(
  fen: string,
  rules: FantasyRuleSet,
  solutionUcis: string[]
): boolean {
  const standardFen = finalStandardFen(fen, solutionUcis);
  const fantasyFen = finalFantasyFen(fen, rules, solutionUcis);
  if (!standardFen || !fantasyFen) return false;
  return standardFen !== fantasyFen;
}

function tryAbilitySet(
  fen: string,
  solutionUcis: string[],
  themes: string[],
  abilities: PieceAbilityId[]
): FantasyRuleSet | null {
  const destination = lastPlayerDestination(fen, solutionUcis);
  const objective = inferObjective(themes, destination);
  const rules = buildRules(
    abilities,
    objective,
    objective === "reach_square" ? destination : undefined
  );
  if (validateTransform(fen, rules, solutionUcis)) return rules;
  if (objective === "checkmate") return null;

  const checkmateRules = buildRules(abilities, "checkmate");
  if (validateTransform(fen, checkmateRules, solutionUcis)) return checkmateRules;
  return null;
}

function tryRequiredAbilities(
  fen: string,
  solutionUcis: string[],
  themes: string[]
): PieceAbilityId[] | null {
  const standardOk = validateStandardPuzzleLine(fen, normalizeSolution(solutionUcis)).ok;
  if (standardOk) return null;

  for (const ability of ABILITY_ORDER) {
    if (tryAbilitySet(fen, solutionUcis, themes, [ability])) return [ability];
  }

  for (let i = 0; i < ABILITY_ORDER.length; i++) {
    for (let j = i + 1; j < ABILITY_ORDER.length; j++) {
      const pair = [ABILITY_ORDER[i]!, ABILITY_ORDER[j]!];
      if (tryAbilitySet(fen, solutionUcis, themes, pair)) return pair;
    }
  }

  return null;
}

function enemySquares(chess: Chess, color: "w" | "b"): Array<{ square: Square; piece: string }> {
  const enemyColor = color === "w" ? "b" : "w";
  const out: Array<{ square: Square; piece: string }> = [];
  for (const sq of allSquares()) {
    const piece = chess.get(sq);
    if (piece && piece.color === enemyColor) {
      out.push({ square: sq, piece: `${piece.color}:${piece.type}` });
    }
  }
  return out;
}

function tryTunnelSquares(
  fen: string,
  solutionUcis: string[],
  landingSquare: string
): FantasyRuleSet | null {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }

  const solverColor = fen.split(" ")[1] === "b" ? "b" : "w";
  const enemies = enemySquares(chess, solverColor);

  for (const { square: linkTo, piece: objectivePiece } of enemies) {
    const specialSquares: SquareEffect[] = [
      { square: landingSquare, type: "tunnel", linkTo },
    ];
    const reachRules = buildRules([], "reach_square", linkTo, undefined, specialSquares);
    if (
      validateTransform(fen, reachRules, solutionUcis) &&
      outcomeDiffersFromStandard(fen, reachRules, solutionUcis)
    ) {
      return reachRules;
    }

    const captureRules = buildRules(
      [],
      "capture_piece",
      undefined,
      objectivePiece,
      specialSquares
    );
    if (
      validateTransform(fen, captureRules, solutionUcis) &&
      outcomeDiffersFromStandard(fen, captureRules, solutionUcis)
    ) {
      return captureRules;
    }
  }

  return null;
}

function tryExplosiveSquare(
  fen: string,
  solutionUcis: string[],
  landingSquare: string,
  themes: string[]
): FantasyRuleSet | null {
  if (isMateTheme(themes)) return null;

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }

  const solverColor = fen.split(" ")[1] === "b" ? "b" : "w";
  const adjacentEnemies = adjacentSquares(landingSquare)
    .map((sq) => ({ sq, piece: chess.get(sq) }))
    .filter(({ piece }) => piece && piece.color !== solverColor && piece.type !== "k")
    .sort((a, b) => pieceValue(b.piece!.type) - pieceValue(a.piece!.type));

  if (adjacentEnemies.length === 0) return null;

  const specialSquares: SquareEffect[] = [{ square: landingSquare, type: "explosive" }];

  for (const { sq, piece } of adjacentEnemies) {
    const objectivePiece = `${piece!.color}:${piece!.type}`;
    const captureRules = buildRules(
      [],
      "capture_piece",
      undefined,
      objectivePiece,
      specialSquares
    );
    if (
      validateTransform(fen, captureRules, solutionUcis) &&
      outcomeDiffersFromStandard(fen, captureRules, solutionUcis)
    ) {
      return captureRules;
    }
  }

  return null;
}

function tryTrapSquare(
  fen: string,
  solutionUcis: string[],
  landingSquare: string,
  themes: string[]
): FantasyRuleSet | null {
  if (isMateTheme(themes)) return null;

  const specialSquares: SquareEffect[] = [{ square: landingSquare, type: "trap" }];
  const objective = inferObjective(themes, landingSquare);
  const rules = buildRules(
    [],
    objective,
    objective === "reach_square" ? landingSquare : undefined,
    undefined,
    specialSquares
  );
  if (
    validateTransform(fen, rules, solutionUcis) &&
    outcomeDiffersFromStandard(fen, rules, solutionUcis)
  ) {
    return rules;
  }
  return null;
}

function pieceValue(type: string): number {
  switch (type) {
    case "q":
      return 9;
    case "r":
      return 5;
    case "b":
    case "n":
      return 3;
    case "p":
      return 1;
    default:
      return 0;
  }
}

function trySpecialSquares(
  fen: string,
  solutionUcis: string[],
  themes: string[]
): FantasyRuleSet | null {
  if (isMateTheme(themes)) return null;

  const landingSquare = lastPlayerDestination(fen, solutionUcis);
  if (!landingSquare) return null;

  return (
    tryTunnelSquares(fen, solutionUcis, landingSquare) ??
    tryExplosiveSquare(fen, solutionUcis, landingSquare, themes) ??
    tryTrapSquare(fen, solutionUcis, landingSquare, themes)
  );
}

function buildFallbackRules(
  fen: string,
  solutionUcis: string[],
  themes: string[]
): FantasyRuleSet {
  const destination = lastPlayerDestination(fen, solutionUcis);
  const objective = inferObjective(themes, destination);
  return buildRules(
    [],
    objective,
    objective === "reach_square" ? destination : undefined
  );
}

function buildMechanismNote(
  rules: FantasyRuleSet,
  source: FantasyTransformSource
): LocalizedText {
  if (source === "ability") {
    const primary = rules.enabledAbilities[0];
    if (primary) {
      return {
        fr: `Mécanique : ${ABILITY_LABELS[primary].fr}.`,
        en: `Mechanic: ${ABILITY_LABELS[primary].en}.`,
      };
    }
  }

  const effect = rules.specialSquares?.[0];
  if (source === "special_square" && effect) {
    if (effect.type === "tunnel") {
      return {
        fr: `Mécanique : tunnel ${effect.square} → ${effect.linkTo ?? "?"}.`,
        en: `Mechanic: tunnel ${effect.square} → ${effect.linkTo ?? "?"}.`,
      };
    }
    if (effect.type === "explosive") {
      return {
        fr: `Mécanique : case explosive sur ${effect.square}.`,
        en: `Mechanic: explosive square on ${effect.square}.`,
      };
    }
    if (effect.type === "trap") {
      return {
        fr: `Mécanique : piège sur ${effect.square}.`,
        en: `Mechanic: trap on ${effect.square}.`,
      };
    }
  }

  return {
    fr: "Puzzle fantasy (objectif classique).",
    en: "Fantasy puzzle (standard objective).",
  };
}

function buildHints(rules: FantasyRuleSet, source: FantasyTransformSource): LocalizedText[] {
  if (source === "ability") {
    const hints: LocalizedText[] = [];
    for (const ability of rules.enabledAbilities) {
      hints.push(...(ABILITY_HINTS[ability] ?? []));
    }
    return hints.slice(0, 2);
  }

  const effect = rules.specialSquares?.[0];
  if (source === "special_square" && effect) {
    if (effect.type === "tunnel") {
      return [
        {
          fr: `La case ${effect.square} est un tunnel vers ${effect.linkTo} : la pièce y arrive puis ressort à la destination.`,
          en: `Square ${effect.square} is a tunnel to ${effect.linkTo}: land there to warp to the exit.`,
        },
      ];
    }
    if (effect.type === "explosive") {
      return [
        {
          fr: `La case ${effect.square} est explosive : la pièce qui y arrive détruit les pièces adjacentes (sauf les rois).`,
          en: `Square ${effect.square} is explosive: the arriving piece blasts adjacent pieces (kings excluded).`,
        },
      ];
    }
    if (effect.type === "trap") {
      return [
        {
          fr: `La case ${effect.square} est un piège : la pièce qui y arrive est éliminée.`,
          en: `Square ${effect.square} is a trap: the landing piece is removed.`,
        },
      ];
    }
  }

  return [];
}

function buildPrompt(
  themes: string[],
  rules: FantasyRuleSet,
  source: FantasyTransformSource
): LocalizedText {
  if (source === "ability") {
    const primary = rules.enabledAbilities[0];
    if (primary) return ABILITY_LABELS[primary];
  }

  const effect = rules.specialSquares?.[0];
  if (source === "special_square" && effect) {
    if (effect.type === "tunnel") {
      return {
        fr: `Tunnel : traverse jusqu'en ${effect.linkTo ?? "?"}`,
        en: `Tunnel: warp to ${effect.linkTo ?? "?"}`,
      };
    }
    if (effect.type === "explosive") {
      return {
        fr: "Explosion : déclenche la case explosive",
        en: "Explosion: trigger the blast square",
      };
    }
    if (effect.type === "trap") {
      return {
        fr: "Piège : évite ou exploite la case piégée",
        en: "Trap: avoid or exploit the trapped square",
      };
    }
  }

  const base = buildPromptFromThemes(themes);
  return {
    fr: `${base.fr} (piste Fantasy)`,
    en: `${base.en} (Fantasy track)`,
  };
}

/** Infer fantasy rules and bilingual content for a Lichess puzzle imported on the Fantasy track. */
export function transformLichessToFantasy(
  fen: string,
  solutionUcis: string[],
  themes: string[]
): FantasyTransformResult {
  const normalized = normalizeSolution(solutionUcis);

  const abilities = tryRequiredAbilities(fen, normalized, themes);
  if (abilities) {
    const rules = tryAbilitySet(fen, normalized, themes, abilities)!;
    const source: FantasyTransformSource = "ability";
    return {
      fantasy_rules: rules,
      prompt: buildPrompt(themes, rules, source),
      hints: buildHints(rules, source),
      mechanismNote: buildMechanismNote(rules, source),
      source,
    };
  }

  const specialRules = trySpecialSquares(fen, normalized, themes);
  if (specialRules) {
    const source: FantasyTransformSource = "special_square";
    return {
      fantasy_rules: specialRules,
      prompt: buildPrompt(themes, specialRules, source),
      hints: buildHints(specialRules, source),
      mechanismNote: buildMechanismNote(specialRules, source),
      source,
    };
  }

  const fallbackRules = buildFallbackRules(fen, normalized, themes);
  const source: FantasyTransformSource = "fallback";
  return {
    fantasy_rules: fallbackRules,
    prompt: buildPrompt(themes, fallbackRules, source),
    hints: buildHints(fallbackRules, source),
    mechanismNote: buildMechanismNote(fallbackRules, source),
    source,
  };
}
