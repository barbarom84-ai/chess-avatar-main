/**
 * Compare this clone to live chessavatar.net so a local deploy cannot
 * silently wipe PvP / Ascension / Avatars.
 *
 * Usage: node scripts/check-prod-parity.mjs
 * Exit 1 if required prod routes are missing from this tree.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED_LOCAL = [
  "app/analyze/page.tsx",
  "app/play/page.tsx",
  "app/arena/page.tsx",
  "app/learn/page.tsx",
  "app/puzzles/page.tsx",
  "app/api/lichess/route.ts",
  "app/api/account/delete/route.ts",
  "app/api/openings/catalog/route.ts",
];

/** Routes that exist on chessavatar.net but may be absent from this clone. */
const PROD_ONLY_WARN = [
  "app/avatars/page.tsx",
  "app/online/page.tsx",
  "app/ascension/page.tsx",
  "app/api/health/route.ts",
  "app/api/pvp/matchmaking/route.ts",
  "app/api/coach/chat/route.ts",
  "app/api/ascension/card/route.ts",
  "lib/ascension/fantasy-chess/engine.ts",
];

const missingRequired = REQUIRED_LOCAL.filter((p) => !existsSync(join(root, p)));
const missingProd = PROD_ONLY_WARN.filter((p) => !existsSync(join(root, p)));

if (missingRequired.length) {
  console.error("Missing required local files:");
  for (const p of missingRequired) console.error("  -", p);
  process.exit(1);
}

if (missingProd.length) {
  console.warn(
    "\n[prod-parity] This clone is missing files that are live on chessavatar.net:"
  );
  for (const p of missingProd) console.warn("  -", p);
  console.warn(
    "Do NOT run `vercel --prod` from this tree — it would delete those routes.\n" +
      "Recover the missing sources (other machine / Vercel deployment / git history) first.\n"
  );
  // Vercel sets VERCEL=1 in cloud builds. Fail closed so this incomplete
  // clone cannot overwrite chessavatar.net (PvP / Ascension / Avatars).
  if (process.env.STRICT_PROD_PARITY === "1" || process.env.VERCEL === "1") {
    console.error(
      "prod-parity: refusing deploy — recover missing production sources first."
    );
    process.exit(1);
  }
} else {
  console.log("prod-parity: local tree includes known production routes.");
}
