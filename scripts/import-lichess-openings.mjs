/**
 * Télécharge les TSV eco du dépôt lichess-org/chess-openings, convertit en fiches
 * `Opening` (UCI via chess.js), déduplique par séquence UCI, écrit une partition.
 *
 * Usage : node scripts/import-lichess-openings.mjs
 * Sortie : lib/data/openings/partitions/lichess-named-openings.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Chess } from "chess.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(
  root,
  "lib",
  "data",
  "openings",
  "partitions",
  "lichess-named-openings.json"
);

const BASE =
  "https://raw.githubusercontent.com/lichess-org/chess-openings/master";
const FILES = ["a.tsv", "b.tsv", "c.tsv", "d.tsv", "e.tsv"];

const MIN_PLIES = 2;
/** Profondeur max par ligne (lignes nommées Lichess). */
const MAX_PLIES = 32;
/** 0 = garder toutes les lignes uniques du dépôt. */
const MAX_UNIQUE_LINES = 0;

function stripPgnNoise(s) {
  return s
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/;(.*?)$/g, "")
    .trim();
}

function parseDataLine(line) {
  const m = line.match(/^([A-E]\d{2})\s+(.*)$/);
  if (!m) return null;
  const eco = m[1];
  const rest = m[2];
  const moveStart = rest.search(/\b\d+\.\s/);
  if (moveStart < 0) return null;
  const name = rest.slice(0, moveStart).trim();
  const pgn = rest.slice(moveStart).trim();
  if (!name || !pgn) return null;
  return { eco, name, pgn };
}

function pgnToUci(pgn) {
  const g = new Chess();
  const clean = stripPgnNoise(pgn);
  const tokens = clean.split(/\s+/).filter(Boolean);
  const uci = [];
  for (const raw of tokens) {
    if (/^\d+\.?$/.test(raw)) continue;
    if (raw === "1-0" || raw === "0-1" || raw === "1/2-1/2" || raw === "*") break;
    const move = g.move(raw, { sloppy: true });
    if (!move) return null;
    uci.push(move.from + move.to + (move.promotion || ""));
  }
  return uci;
}

function slugId(eco, name) {
  const base = `${eco}-${name}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return base || `eco-${eco.toLowerCase()}-line`;
}

function openingFromRow(row, idSuffix) {
  const { eco, name, uci, pgn } = row;
  let id = slugId(eco, name);
  if (idSuffix) id = `${id}-${idSuffix}`;
  const movesPretty = pgn.replace(/\s+/g, " ").trim();
  return {
    id,
    name,
    nameEn: name,
    eco,
    moves: movesPretty,
    uciMoves: uci,
    character: "balanced",
    difficulty: 3,
    popularity: 3,
    color: "both",
    description: `Ligne nommée (${eco}) — base de données Lichess chess-openings.`,
    descriptionEn: `Named line (${eco}) — Lichess chess-openings database.`,
    tags: ["lichess-openings", eco.slice(0, 1)],
  };
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function main() {
  const lines = [];
  for (const file of FILES) {
    const text = await fetchText(`${BASE}/${file}`);
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim() || line.startsWith("eco ")) continue;
      lines.push(line);
    }
  }

  /** @type {Map<string, { eco: string, name: string, uci: string[], pgn: string }>} */
  const byUci = new Map();

  for (const line of lines) {
    const parsed = parseDataLine(line);
    if (!parsed) continue;
    const uci = pgnToUci(parsed.pgn);
    if (!uci || uci.length < MIN_PLIES || uci.length > MAX_PLIES) continue;
    const key = uci.join(",");
    const prev = byUci.get(key);
    if (!prev || parsed.name.length < prev.name.length) {
      byUci.set(key, {
        eco: parsed.eco,
        name: parsed.name,
        uci,
        pgn: parsed.pgn,
      });
    }
  }

  let rows = Array.from(byUci.values());
  rows.sort((a, b) => b.uci.length - a.uci.length || a.eco.localeCompare(b.eco));
  if (MAX_UNIQUE_LINES > 0) {
    rows = rows.slice(0, MAX_UNIQUE_LINES);
  }

  const usedIds = new Set();
  const openings = [];
  for (let i = 0; i < rows.length; i++) {
    let suf = 0;
    let op = openingFromRow(rows[i], 0);
    while (usedIds.has(op.id)) {
      suf += 1;
      op = openingFromRow(rows[i], suf);
    }
    usedIds.add(op.id);
    openings.push(op);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(openings, null, 2) + "\n", "utf8");

  const plies = openings.map((o) => o.uciMoves.length);
  const maxPly = Math.max(...plies);
  const ge20 = plies.filter((n) => n >= 20).length;
  console.log(
    "Wrote",
    outPath,
    "openings:",
    openings.length,
    "| max plies:",
    maxPly,
    "| lines >= 20 plies:",
    ge20,
    "| TSV rows:",
    lines.length
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
