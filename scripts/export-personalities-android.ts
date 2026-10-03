/**
 * Exports the personality opponents for the Android app (bundled assets).
 *
 *   npx tsx scripts/export-personalities-android.ts <android-assets-personalities-dir>
 *
 * Writes `personalities.json` (catalog + precompiled EngineConfig with the
 * FEN→UCI opening book) and copies the webp portraits next to it.
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { PERSONALITY_OPPONENTS } from "../lib/personality-opponents";
import { personalityToEngineConfig } from "../lib/personality-to-engine";

const outDir = resolve(process.argv[2] ?? "tmp/personalities-android");
mkdirSync(outDir, { recursive: true });

const publicDir = resolve("public");
let copied = 0;

const opponents = PERSONALITY_OPPONENTS.map((o) => {
  const config = personalityToEngineConfig(o, {}, "en");
  let portraitFile: string | null = null;
  if (o.portraitUrl) {
    const src = join(publicDir, o.portraitUrl.replace(/^\//, ""));
    if (existsSync(src)) {
      portraitFile = basename(src);
      copyFileSync(src, join(outDir, portraitFile));
      copied++;
    }
  }
  return {
    id: o.id,
    kind: o.kind,
    name: o.name,
    bio: o.bio,
    era: o.era,
    archetype: o.archetype,
    years: o.years ?? null,
    portraitInitials: o.portraitInitials,
    portraitFile,
    accent: o.accent,
    style: o.style,
    playStyle: o.playStyle,
    elo: o.elo,
    difficulty: o.difficulty,
    favoriteOpeningId: o.favoriteOpeningId,
    config: {
      ...config,
      avatarUrl: null,
      personalityId: undefined,
    },
  };
});

writeFileSync(
  join(outDir, "personalities.json"),
  JSON.stringify({ version: 1, opponents }, null, 1) + "\n",
  "utf8"
);

console.log(`Exported ${opponents.length} personalities (${copied} portraits) to ${outDir}`);
