/**
 * Importe les top 10 Lichess (blitz) + top 10 Chess.com (live blitz) en profils publics.
 *
 * Prérequis (.env.local) :
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   FEATURED_PROFILE_SEED_USER_ID  — UUID d’un compte Supabase (propriétaire des bots)
 *
 * Usage :
 *   npm run seed:featured-profiles
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { buildArenaFeaturedOptions } from "@/lib/arena-featured-profiles";

function loadEnvFilesFromRepoRoot(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  for (const fname of [".env.local", ".env"]) {
    const envPath = resolve(root, fname);
    if (!existsSync(envPath)) continue;
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const envKey = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[envKey] === undefined) {
        process.env[envKey] = val;
      }
    }
  }
}

loadEnvFilesFromRepoRoot();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
const ownerId = process.env.FEATURED_PROFILE_SEED_USER_ID?.trim() ?? "";

async function main(): Promise<void> {
  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }
  if (!ownerId) {
    console.error("Missing FEATURED_PROFILE_SEED_USER_ID.");
    console.error(
      "Connectez-vous une fois sur le site, puis copiez votre UUID depuis Supabase → Authentication → Users."
    );
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(
    "[seed-featured] Import des tops Lichess + Chess.com (1–3 min)…"
  );

  const options = await buildArenaFeaturedOptions(
    "Top Lichess",
    "Top Chess.com"
  );

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const opt of options) {
    const username = opt.stats.username || opt.config.name;

    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .eq("platform", opt.platform)
      .eq("user_id", ownerId)
      .maybeSingle();

    const payload = {
      user_id: ownerId,
      username,
      platform: opt.platform,
      config: {
        ...opt.config,
        featuredSeed: true,
        creatorName: "ChessAvatar Champions",
      },
      stats: opt.stats,
      is_public: true,
      updated_at: new Date().toISOString(),
    };

    process.stdout.write(`• ${opt.platform} / ${username} … `);

    if (existing?.id) {
      const { error } = await admin
        .from("profiles")
        .update(payload)
        .eq("id", existing.id);
      if (error) {
        console.log(`update error: ${error.message}`);
        skipped++;
      } else {
        console.log("updated");
        updated++;
      }
    } else {
      const { error } = await admin.from("profiles").insert(payload);
      if (error) {
        console.log(`insert error: ${error.message}`);
        skipped++;
      } else {
        console.log("inserted");
        inserted++;
      }
    }
  }

  console.log(
    `\nDone. inserted=${inserted} updated=${updated} skipped=${skipped} / ${options.length}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
