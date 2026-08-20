#!/usr/bin/env npx tsx
/**
 * Validates campaign puzzle solutions (standard + fantasy).
 * Usage: npx tsx scripts/validate-campaign-puzzles.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Chess } from "chess.js";
import { FantasyChessEngine } from "../lib/ascension/fantasy-chess/engine";
import type { FantasyRuleSet } from "../lib/ascension/fantasy-chess/types";

type SeedPuzzle = {
  slug: string;
  kind: "standard" | "fantasy";
  fen: string;
  solution_ucis: string[];
  fantasy_rules?: FantasyRuleSet;
};

const seedPath = join(process.cwd(), "data/ascension/puzzles/seed-puzzles.json");
const puzzles = JSON.parse(readFileSync(seedPath, "utf8")) as SeedPuzzle[];

let failed = 0;

for (const puzzle of puzzles) {
  if (puzzle.kind === "fantasy") {
    const rules: FantasyRuleSet = {
      enabledAbilities: puzzle.fantasy_rules?.enabledAbilities ?? [],
      objective: puzzle.fantasy_rules?.objective,
      objectiveSquare: puzzle.fantasy_rules?.objectiveSquare,
      objectivePiece: puzzle.fantasy_rules?.objectivePiece,
    };
    const result = FantasyChessEngine.replaySolution(puzzle.fen, rules, puzzle.solution_ucis);
    if (!result.ok) {
      console.error(`[FAIL] ${puzzle.slug}: ${result.error}`);
      failed++;
    } else {
      console.log(`[OK] ${puzzle.slug}`);
    }
    continue;
  }

  const chess = new Chess(puzzle.fen);
  let ok = true;
  for (const uci of puzzle.solution_ucis) {
    try {
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] as "q" | "r" | "b" | "n" | undefined,
      });
      if (!move) {
        ok = false;
        break;
      }
    } catch {
      ok = false;
      break;
    }
  }
  if (!ok) {
    console.error(`[FAIL] ${puzzle.slug}: illegal standard line`);
    failed++;
  } else {
    console.log(`[OK] ${puzzle.slug}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} puzzle(s) failed validation.`);
  process.exit(1);
}

console.log(`\nAll ${puzzles.length} puzzles validated.`);
