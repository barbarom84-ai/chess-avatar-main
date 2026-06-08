/**
 * Copy ChessAvatar WASM bundle from the engine repo into public/chessavatar/.
 *
 * Usage (from chess-avatar-main):
 *   node scripts/sync-chessavatar-wasm.mjs
 *
 * Optional env ENGINE_ROOT — defaults to sibling "../UCI Chess Engine".
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const engineRoot =
  process.env.ENGINE_ROOT ??
  path.resolve(projectRoot, "..", "UCI Chess Engine");

const pkgCandidates = [
  path.join(engineRoot, "crates", "chessavatar-wasm", "packages", "engine-bridge", "pkg"),
  path.join(engineRoot, "packages", "engine-bridge", "pkg"),
];

function newestPkgDir(candidates) {
  let best = null;
  let bestTime = 0;
  for (const dir of candidates) {
    const wasm = path.join(dir, "chessavatar_wasm_bg.wasm");
    if (!existsSync(wasm)) continue;
    const mtime = readFileSync(wasm).length > 0 ? statSync(wasm).mtimeMs : 0;
    if (mtime >= bestTime) {
      bestTime = mtime;
      best = dir;
    }
  }
  return best;
}

const pkgDir = newestPkgDir(pkgCandidates);
const distWorker = path.join(engineRoot, "packages", "engine-bridge", "dist", "worker.js");
const nnueSrc = path.join(engineRoot, "networks", "nn-default.nnue");
const outDir = path.join(projectRoot, "public", "chessavatar");

function requirePath(p, label) {
  if (!existsSync(p)) {
    console.error(`Missing ${label}: ${p}`);
    console.error(
      "Build the engine first:\n" +
        "  cd \"../UCI Chess Engine\"\n" +
        "  wasm-pack build crates/chessavatar-wasm --target web --release --out-dir packages/engine-bridge/pkg\n" +
        "  cd packages/engine-bridge && npm install && npm run build"
    );
    process.exit(1);
  }
}

if (!pkgDir) {
  console.error("ChessAvatar WASM pkg not found. Checked:", pkgCandidates.join(", "));
  process.exit(1);
}

requirePath(path.join(pkgDir, "chessavatar_wasm.js"), "WASM JS");
requirePath(path.join(pkgDir, "chessavatar_wasm_bg.wasm"), "WASM binary");
requirePath(distWorker, "compiled worker");

mkdirSync(outDir, { recursive: true });

cpSync(path.join(pkgDir, "chessavatar_wasm.js"), path.join(outDir, "chessavatar_wasm.js"));
cpSync(
  path.join(pkgDir, "chessavatar_wasm_bg.wasm"),
  path.join(outDir, "chessavatar_wasm_bg.wasm")
);

let worker = readFileSync(distWorker, "utf8");
worker = worker.replace(
  /from\s+['"]\.\.\/pkg\/chessavatar_wasm\.js['"]/,
  "from './chessavatar_wasm.js'"
);
writeFileSync(path.join(outDir, "worker.js"), worker);

if (existsSync(nnueSrc)) {
  cpSync(nnueSrc, path.join(outDir, "nn-default.nnue"));
  console.log("Copied NNUE network (~", Math.round(readFileSync(nnueSrc).length / 1024 / 1024), "MB)");
} else {
  console.warn("NNUE not found (optional):", nnueSrc);
  console.warn("Bot will use classical eval until you run networks/download.ps1 in the engine repo.");
}

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

const manifestFiles = {};
for (const name of [
  "chessavatar_wasm.js",
  "chessavatar_wasm_bg.wasm",
  "worker.js",
  "nn-default.nnue",
]) {
  const p = path.join(outDir, name);
  if (existsSync(p)) {
    manifestFiles[name] = {
      size: statSync(p).size,
      sha256: sha256File(p),
    };
  }
}
writeFileSync(
  path.join(outDir, "manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), files: manifestFiles }, null, 2)
);

console.log("ChessAvatar WASM synced to", outDir, "from", pkgDir);
