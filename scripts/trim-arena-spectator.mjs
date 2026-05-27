import fs from "node:fs";

const p = "components/ArenaSpectator.tsx";
const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
const start = lines.findIndex((l) => l.includes("__REMOVE_START__"));
const end = lines.findIndex(
  (l, i) => i > start && l.startsWith("export default function ArenaSpectator")
);
if (start < 0 || end < 0) {
  console.error("markers", start, end);
  process.exit(1);
}
const head = lines.slice(0, start).filter(
  (l) => !l.includes("import type { ProfileOption }")
);
head.push("import type { ProfileOption } from \"@/lib/arena-types\";");
const out = [...head, ...lines.slice(end)];
fs.writeFileSync(p, out.join("\n"));
console.log("Removed lines", start + 1, "to", end);
