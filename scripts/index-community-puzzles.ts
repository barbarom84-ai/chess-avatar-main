/**
 * Index cloud games into community_puzzles (forced mate M2/M3).
 *
 * Loads `.env.local` then `.env` from the repo root (same habit as Next.js).
 *
 * Requires env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage (from repo root):
 *   npm run index-community-puzzles
 *
 * Optional:
 *   COMMUNITY_PUZZLE_INDEX_PAGE_SIZE=80   (default 50)
 *   COMMUNITY_PUZZLE_INDEX_MAX_GAMES=200  (omit for no limit)
 *   COMMUNITY_PUZZLE_MATE_SEARCH_MS=4000   (max ms per ply minimax; omit = 4000)
 *   COMMUNITY_PUZZLE_FETCH_RETRIES=6       (retries on transient network errors)
 *   COMMUNITY_PUZZLE_FETCH_RETRY_MS=2000   (base delay before retry, exponential backoff)
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { parsePgnBlock } from "@/lib/pgn-to-uci";
import { buildCloudPayloadAtPly } from "@/lib/cloud-puzzle";
import {
  forcedMateTwoOrThreeForHistoricalPly,
  isCheckOrCaptureAtPly,
} from "@/lib/forced-mate-puzzle";

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

const MIN_PLIES_BEFORE_GUESS = 6;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

const pageSize = Math.max(
  10,
  Number.parseInt(process.env.COMMUNITY_PUZZLE_INDEX_PAGE_SIZE ?? "50", 10) || 50
);
const maxGamesEnv = process.env.COMMUNITY_PUZZLE_INDEX_MAX_GAMES?.trim();
const maxGames =
  maxGamesEnv !== undefined && maxGamesEnv !== ""
    ? Math.max(1, Number.parseInt(maxGamesEnv, 10) || 0)
    : null;

const mateSearchMs = Math.max(
  200,
  Number.parseInt(process.env.COMMUNITY_PUZZLE_MATE_SEARCH_MS ?? "4000", 10) || 4000
);

function shortId(id: string): string {
  return id.length <= 8 ? id : `${id.slice(0, 8)}…`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Erreurs réseau / infra souvent transitoires (coupure Wi‑Fi, timeout Supabase, etc.). */
function isTransientFetchFailure(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("fetch failed") ||
    m.includes("network error") ||
    m.includes("econnreset") ||
    m.includes("etimedout") ||
    m.includes("epipe") ||
    m.includes("socket hang up") ||
    m.includes("enotfound") ||
    m.includes("502") ||
    m.includes("503") ||
    m.includes("504")
  );
}

async function main(): Promise<void> {
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  console.log(
    `[index-community-puzzles] Démarrage (budget minimax ${mateSearchMs} ms par coup candidat). Les logs de partie apparaissent ci‑dessous ; Ctrl+C pour arrêter.`
  );

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let offset = 0;
  let gamesProcessed = 0;
  let rowsUpserted = 0;

  while (true) {
    if (maxGames !== null && gamesProcessed >= maxGames) break;

    const take = maxGames !== null ? Math.min(pageSize, maxGames - gamesProcessed) : pageSize;
    if (take <= 0) break;

    const maxAttempts = Math.max(
      1,
      Number.parseInt(process.env.COMMUNITY_PUZZLE_FETCH_RETRIES ?? "6", 10) || 6
    );
    const baseDelayMs = Math.max(
      500,
      Number.parseInt(process.env.COMMUNITY_PUZZLE_FETCH_RETRY_MS ?? "2000", 10) || 2000
    );

    let batchUpserts = 0;

    let games: {
      id: string;
      pgn: string | null;
      opponent_name: string | null;
      moves_count: number;
    }[] | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { data, error } = await admin
        .from("games")
        .select("id, pgn, opponent_name, moves_count")
        .gte("moves_count", 10)
        .order("created_at", { ascending: false })
        .range(offset, offset + take - 1);

      if (!error) {
        games = data;
        break;
      }

      const msg = error.message ?? String(error);
      const retry = attempt < maxAttempts - 1 && isTransientFetchFailure(msg);
      if (!retry) {
        console.error(
          "Requête games Supabase :",
          msg,
          "\n(vérifie la connexion, le pare-feu, l’URL du projet et que la table existe.)"
        );
        process.exit(1);
      }

      const delay = baseDelayMs * 2 ** attempt;
      console.warn(
        `[index-community-puzzles] Échec réseau (${msg}). Nouvel essai ${attempt + 2}/${maxAttempts} dans ${delay} ms…`
      );
      await sleep(delay);
    }

    if (!games || games.length === 0) break;

    for (const g of games) {
      if (!g.pgn || typeof g.id !== "string") continue;

      const parsed = parsePgnBlock(g.pgn);
      if (!parsed?.uciMoves?.length) continue;

      const uciMoves = parsed.uciMoves.map((u) => u.trim().toLowerCase());
      const high = uciMoves.length - 1;

      console.log(
        `  Partie ${shortId(g.id)} — ${uciMoves.length} coups (scan des plies tactiques)…`
      );

      for (let ply = MIN_PLIES_BEFORE_GUESS; ply <= high; ply++) {
        if (!isCheckOrCaptureAtPly(uciMoves, ply)) continue;

        const mateCat = forcedMateTwoOrThreeForHistoricalPly(uciMoves, ply, {
          maxSearchMs: mateSearchMs,
        });
        if (!mateCat) continue;

        const payload = buildCloudPayloadAtPly(g.pgn, {
          gameId: g.id,
          opponentName: g.opponent_name ?? "?",
        }, ply, mateCat);

        if (!payload) continue;

        let upsertOk = false;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const { error: upErr } = await admin.from("community_puzzles").upsert(
            {
              game_id: g.id,
              ply_index: ply,
              mate_attacker_moves: mateCat,
              payload,
            },
            { onConflict: "game_id,ply_index" }
          );

          if (!upErr) {
            upsertOk = true;
            break;
          }

          const msg = upErr.message ?? String(upErr);
          const retry = attempt < maxAttempts - 1 && isTransientFetchFailure(msg);
          if (!retry) {
            console.error(`upsert game ${g.id} ply ${ply}:`, msg);
            process.exit(1);
          }
          const delay = baseDelayMs * 2 ** attempt;
          console.warn(
            `[index-community-puzzles] Upsert réseau (${msg}). Réessai ${attempt + 2}/${maxAttempts} dans ${delay} ms…`
          );
          await sleep(delay);
        }

        if (upsertOk) {
          rowsUpserted += 1;
          batchUpserts += 1;
        }
      }
    }

    gamesProcessed += games.length;
    offset += games.length;

    console.log(`Processed ${gamesProcessed} games, ${rowsUpserted} puzzle rows upserted…`);
    if (batchUpserts === 0) {
      console.log(
        "  (Aucun puzzle sur ce lot : critère très strict — mat forcé en 2 ou 3 demi‑coups ; vous pouvez augmenter COMMUNITY_PUZZLE_MATE_SEARCH_MS ou élargir le pool de parties.)"
      );
    }

    if (games.length < take) break;
  }

  console.log(`Done. Games scanned: ${gamesProcessed}, rows upserted: ${rowsUpserted}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
