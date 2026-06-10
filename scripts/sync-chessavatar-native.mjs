/**
 * Copy native ChessAvatar UCI binary + NNUE into public/ for Fritz engine packs.
 *
 * Usage (from chess-avatar-main):
 *   node scripts/sync-chessavatar-native.mjs
 *
 * Optional env ENGINE_ROOT — defaults to sibling "../UCI Chess Engine".
 */
import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const engineRoot =
  process.env.ENGINE_ROOT ??
  path.resolve(projectRoot, "..", "UCI Chess Engine");

const exeCandidates = [
  path.join(engineRoot, "target", "release", "ChessAvatar.exe"),
  path.join(engineRoot, "target", "release", "chessavatar.exe"),
];
const nnueSrc = path.join(engineRoot, "networks", "nn-default.nnue");
const outDir = path.join(projectRoot, "public");
const outExe = path.join(outDir, "ChessAvatar.exe");
const outNnue = path.join(outDir, "nn-default.nnue");
const manifestPath = path.join(outDir, "engine-native-manifest.json");

function findExe() {
  for (const p of exeCandidates) {
    if (existsSync(p) && statSync(p).size > 100_000) return p;
  }
  return null;
}

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

const exeSrc = findExe();
if (!exeSrc) {
  console.error("ChessAvatar.exe not found. Build the engine first:");
  console.error('  cd "../UCI Chess Engine"');
  console.error("  .\\scripts\\build-release.ps1");
  process.exit(1);
}

if (!existsSync(nnueSrc)) {
  console.error("NNUE missing:", nnueSrc);
  console.error("Run networks/download.ps1 in the engine repo.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
cpSync(exeSrc, outExe);
cpSync(nnueSrc, outNnue);

const manifest = {
  generatedAt: new Date().toISOString(),
  sourceExe: exeSrc,
  files: {
    "ChessAvatar.exe": { size: statSync(outExe).size, sha256: sha256File(outExe) },
    "nn-default.nnue": { size: statSync(outNnue).size, sha256: sha256File(outNnue) },
  },
};
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(
  "Native engine synced:",
  outExe,
  `(~${Math.round(statSync(outExe).size / 1024)} KB), NNUE ~${Math.round(statSync(outNnue).size / 1024 / 1024)} MB`
);
