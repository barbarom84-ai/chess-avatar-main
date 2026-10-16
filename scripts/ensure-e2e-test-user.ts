/**
 * Ensure a local e2e test user exists in Supabase Auth (email confirmed).
 *
 * Env (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * Optional:
 *   E2E_TEST_EMAIL (default: e2e.test@chessavatar.local)
 *   E2E_TEST_PASSWORD (default: ChessAvatarE2e!23456)
 *
 * Usage:
 *   npx tsx scripts/ensure-e2e-test-user.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

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

const DEFAULT_EMAIL = "e2e.test@chessavatar.local";
const DEFAULT_PASSWORD = "ChessAvatarE2e!23456";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.E2E_TEST_EMAIL || DEFAULT_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD || DEFAULT_PASSWORD;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let existingId: string | null = null;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (found) {
      existingId = found.id;
      break;
    }
    if (data.users.length < 200) break;
  }

  if (existingId) {
    const { error } = await admin.auth.admin.updateUserById(existingId, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`Updated e2e test user: ${email}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`Created e2e test user: ${email} (${data.user?.id})`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
