/**
 * Verify committed ChessAvatar WASM artifacts in public/chessavatar/.
 * Used in CI — does not require the engine repo.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "..", "public", "chessavatar");
const manifestPath = path.join(outDir, "manifest.json");

const REQUIRED = [
  "chessavatar_wasm.js",
  "chessavatar_wasm_bg.wasm",
  "worker.js",
  "nn-default.nnue",
];

const MIN_BYTES = {
  "chessavatar_wasm.js": 1024,
  "chessavatar_wasm_bg.wasm": 100_000,
  "worker.js": 512,
  "nn-default.nnue": 1_000_000,
};

function sha256File(filePath) {
  const buf = readFileSync(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

let failed = false;

for (const name of REQUIRED) {
  const filePath = path.join(outDir, name);
  if (!existsSync(filePath)) {
    console.error(`::error::Missing ChessAvatar artifact: public/chessavatar/${name}`);
    failed = true;
    continue;
  }
  const size = statSync(filePath).size;
  const min = MIN_BYTES[name] ?? 1;
  if (size < min) {
    console.error(
      `::error::ChessAvatar artifact too small: ${name} (${size} bytes, min ${min})`
    );
    failed = true;
  }
}

if (!existsSync(manifestPath)) {
  console.error(
    "::error::Missing public/chessavatar/manifest.json — run: npm run sync:chessavatar"
  );
  failed = true;
} else {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    console.error("::error::Invalid manifest.json (not valid JSON)");
    failed = true;
    manifest = null;
  }

  if (manifest?.files) {
    for (const name of REQUIRED) {
      const filePath = path.join(outDir, name);
      if (!existsSync(filePath)) continue;
      const entry = manifest.files[name];
      if (!entry?.sha256) {
        console.error(`::error::manifest.json missing sha256 for ${name}`);
        failed = true;
        continue;
      }
      const actual = sha256File(filePath);
      if (actual !== entry.sha256) {
        console.error(
          `::error::ChessAvatar ${name} hash mismatch — run: npm run sync:chessavatar`
        );
        failed = true;
      }
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("ChessAvatar WASM artifacts OK:", outDir);
