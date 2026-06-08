/**
 * Pre-deploy smoke checks for ChessAvatar WASM bundle (no browser required).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "..", "public", "chessavatar");

const checks = [
  ["worker.js", (s) => s.includes("set_multipv") && s.includes("go_search")],
  ["chessavatar_wasm.js", (s) => s.includes("WasmEngine")],
  ["manifest.json", (s) => {
    const m = JSON.parse(s);
    return Boolean(m.files?.["chessavatar_wasm_bg.wasm"]?.sha256);
  }],
];

let failed = false;

for (const [name, validate] of checks) {
  const p = path.join(outDir, name);
  if (!existsSync(p)) {
    console.error(`::error::smoke missing ${name}`);
    failed = true;
    continue;
  }
  const content = readFileSync(p, "utf8");
  try {
    if (!validate(content)) {
      console.error(`::error::smoke validation failed for ${name}`);
      failed = true;
    }
  } catch (e) {
    console.error(`::error::smoke ${name}:`, e);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("ChessAvatar smoke checks passed");
