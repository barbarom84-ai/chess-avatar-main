/**
 * Génère public/data/openings/fen-index.generated.json à partir des partitions JSON.
 * Usage : node scripts/build-opening-fen-index.mjs
 * À brancher en CI si vous ajoutez beaucoup de lignes (optionnel pour le dev).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Chess } from "chess.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const partitionsDir = path.join(root, "lib", "data", "openings", "partitions");
const outPath = path.join(root, "public", "data", "openings", "fen-index.generated.json");

function fenKey(fen) {
  return fen.trim().split(/\s+/).slice(0, 4).join(" ");
}

function main() {
  const index = {};
  if (!fs.existsSync(partitionsDir)) {
    console.warn("No partitions dir:", partitionsDir);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, "{}\n");
    return;
  }

  const files = fs.readdirSync(partitionsDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const raw = fs.readFileSync(path.join(partitionsDir, file), "utf8");
    let openings;
    try {
      openings = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!Array.isArray(openings)) continue;

    for (const opening of openings) {
      const id = opening.id;
      const uciMoves = opening.uciMoves;
      if (!id || !Array.isArray(uciMoves)) continue;

      const g = new Chess();
      for (let ply = 0; ply < uciMoves.length; ply++) {
        const uci = uciMoves[ply];
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.length > 4 ? uci[4] : undefined;
        const mv = g.move({ from, to, promotion });
        if (!mv) break;
        const key = fenKey(g.fen());
        const entry = { openingId: id, theoryStep: ply + 1 };
        if (!index[key]) index[key] = [];
        const dup = index[key].some(
          (x) => x.openingId === entry.openingId && x.theoryStep === entry.theoryStep
        );
        if (!dup) index[key].push(entry);
      }
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(index), "utf8");
  console.log("Wrote", outPath, "keys:", Object.keys(index).length);
}

main();
