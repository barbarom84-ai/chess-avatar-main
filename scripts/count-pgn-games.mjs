#!/usr/bin/env node
/**
 * Compte les parties dans un gros PGN (flux ligne à ligne).
 * Usage : DATABASE2025_PGN_PATH=chemin/vers/fichier.pgn node scripts/count-pgn-games.mjs
 * Défaut : data/database2025/Database2025.pgn (relatif à la racine du repo).
 */

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const relDefault = path.join("data", "database2025", "Database2025.pgn");
const fromEnv = process.env.DATABASE2025_PGN_PATH?.trim();
const pgnPath = fromEnv
  ? path.isAbsolute(fromEnv)
    ? fromEnv
    : path.join(root, fromEnv)
  : path.join(root, relDefault);

let games = 0;
const rl = createInterface({
  input: createReadStream(pgnPath, { encoding: "utf8" }),
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  if (line.startsWith("[Event")) games += 1;
});

rl.on("close", () => {
  console.log(`File: ${pgnPath}`);
  console.log(`Games (Event headers): ${games}`);
});

rl.on("error", (err) => {
  console.error(err.message);
  process.exit(1);
});
