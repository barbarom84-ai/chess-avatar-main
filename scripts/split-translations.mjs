/**
 * One-off helper: splits lib/translations.ts into lib/i18n/fr.ts and lib/i18n/en.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "lib/translations.ts"), "utf8");

const frMatch = src.match(/^\s*fr:\s*\{/m);
const enMatch = src.match(/^\s*en:\s*\{/m);
if (!frMatch || !enMatch) {
  console.error("Could not find fr/en blocks");
  process.exit(1);
}

const frStart = frMatch.index + frMatch[0].indexOf("{");
const enStart = enMatch.index + enMatch[0].indexOf("{");

function extractObjectBody(startIndex) {
  let depth = 0;
  let i = startIndex;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return src.slice(startIndex + 1, i);
      }
    }
  }
  throw new Error("Unbalanced braces");
}

const frBody = extractObjectBody(frStart);
const enBody = extractObjectBody(enStart);

const i18nDir = path.join(root, "lib/i18n");
fs.mkdirSync(i18nDir, { recursive: true });

fs.writeFileSync(
  path.join(i18nDir, "fr.ts"),
  `/** French UI strings (generated from translations split). */\nexport const fr = {${frBody}} as const;\n`
);
fs.writeFileSync(
  path.join(i18nDir, "en.ts"),
  `/** English UI strings (generated from translations split). */\nexport const en = {${enBody}} as const;\n`
);

console.log("Wrote lib/i18n/fr.ts and lib/i18n/en.ts");
