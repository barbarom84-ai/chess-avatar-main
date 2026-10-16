import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");

const args = [
  "--onefile",
  "--noconsole",
  "--clean",
  "--distpath",
  ".",
  "--workpath",
  path.join(root, ".setup-build"),
  "--specpath",
  path.join(root, ".setup-build"),
  "--name",
  "ChessAvatarSetup",
  "--icon",
  path.join(publicDir, "chessavatar.ico"),
  // Windows PyInstaller datas: source;dest (argv array — no shell ';' split)
  "--add-data",
  `${path.join(publicDir, "knight-logo.png")};.`,
  "--add-data",
  `${path.join(publicDir, "chessavatar.ico")};.`,
  "--hidden-import",
  "PIL._tkinter_finder",
  "ChessAvatarSetup.py",
];

const r = spawnSync("pyinstaller", args, {
  cwd: publicDir,
  stdio: "inherit",
  shell: false,
});
process.exit(r.status ?? 1);
