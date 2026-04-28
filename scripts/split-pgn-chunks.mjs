#!/usr/bin/env node
/**
 * Découpe un gros PGN en plusieurs fichiers < max MB sans couper une partie.
 * Frontière : ligne qui commence par [Event (tag standard en première ligne de partie).
 *
 * Usage :
 *   node scripts/split-pgn-chunks.mjs [entrée.pgn] [dossier_sortie]
 * Env :
 *   DATABASE2025_PGN_PATH — fichier source (défaut data/database2025/Database2025.pgn)
 *   PGN_CHUNK_OUT_DIR — dossier sortie (défaut data/database2025/parts)
 *   PGN_CHUNK_MAX_MB — taille max par fichier (défaut 95, marge sous la limite Vercel 100 Mo)
 */

import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const MAX_MB = Number(process.env.PGN_CHUNK_MAX_MB ?? "95");
const MAX_BYTES = Math.max(1, MAX_MB) * 1024 * 1024;

const DEFAULT_IN = path.join(root, "data", "database2025", "Database2025.pgn");
const DEFAULT_OUT = path.join(root, "data", "database2025", "parts");

const argvIn = process.argv[2]?.trim();
const argvOut = process.argv[3]?.trim();

const inputPath = argvIn
  ? path.isAbsolute(argvIn)
    ? argvIn
    : path.join(root, argvIn)
  : process.env.DATABASE2025_PGN_PATH?.trim()
    ? path.isAbsolute(process.env.DATABASE2025_PGN_PATH)
      ? process.env.DATABASE2025_PGN_PATH
      : path.join(root, process.env.DATABASE2025_PGN_PATH)
    : DEFAULT_IN;

const outDir = argvOut
  ? path.isAbsolute(argvOut)
    ? argvOut
    : path.join(root, argvOut)
  : process.env.PGN_CHUNK_OUT_DIR?.trim()
    ? path.isAbsolute(process.env.PGN_CHUNK_OUT_DIR)
      ? process.env.PGN_CHUNK_OUT_DIR
      : path.join(root, process.env.PGN_CHUNK_OUT_DIR)
    : DEFAULT_OUT;

/** Début de partie PGN — tag [Event presque toujours en tête (après espaces éventuels). */
function isNewGameStart(line) {
  const s = line.replace(/^\uFEFF/, "").trimStart();
  return s.startsWith("[Event");
}

function byteLen(str) {
  return Buffer.byteLength(str, "utf8");
}

/** Représente une partie complète (lignes sans normaliser les \n finaux). */
async function main() {
  await mkdir(outDir, { recursive: true });

  let currentLines = [];
  let partIndex = 1;
  let chunkGames = [];
  let chunkBytes = 0;

  function joinChunk(games) {
    return games.join("\n\n");
  }

  async function flushChunk() {
    if (chunkGames.length === 0) return;
    const body = joinChunk(chunkGames);
    const name = `Database2025-part-${String(partIndex).padStart(3, "0")}.pgn`;
    const target = path.join(outDir, name);
    await writeFile(target, body, "utf8");
    const mb = (byteLen(body) / (1024 * 1024)).toFixed(2);
    console.log(`Wrote ${name} — ${chunkGames.length} games — ${mb} MiB`);
    partIndex += 1;
    chunkGames = [];
    chunkBytes = 0;
  }

  async function pushGame(gameLines) {
    if (gameLines.length === 0) return;
    const gameText = gameLines.join("\n");
    const gameBytes = byteLen(gameText);
    const sepBytes = chunkGames.length > 0 ? byteLen("\n\n") : 0;
    const wouldAdd = sepBytes + gameBytes;

    if (gameBytes > MAX_BYTES) {
      console.warn(
        `[warn] Single game exceeds ${MAX_MB} MiB (${(gameBytes / (1024 * 1024)).toFixed(2)} MiB). Writing alone as oversized file.`,
      );
      await flushChunk();
      const name = `Database2025-oversized-game-at-offset-${partIndex}.pgn`;
      await writeFile(path.join(outDir, name), gameText, "utf8");
      console.log(`Wrote ${name} (oversized single game)`);
      return;
    }

    if (chunkBytes + wouldAdd > MAX_BYTES && chunkGames.length > 0) {
      await flushChunk();
    }

    chunkGames.push(gameText);
    chunkBytes = byteLen(joinChunk(chunkGames));
  }

  const rl = createInterface({
    input: createReadStream(inputPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;

  for await (const rawLine of rl) {
    lineNumber += 1;
    const line = rawLine.replace(/\r$/, "");

    if (isNewGameStart(line) && currentLines.length > 0) {
      await pushGame(currentLines);
      currentLines = [];
    }
    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    await pushGame(currentLines);
  }

  await flushChunk();

  console.log(`Done. Output directory: ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
