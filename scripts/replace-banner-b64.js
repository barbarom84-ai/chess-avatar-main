/**
 * Regénère le Base64 (CRLF) depuis public/chess_avatar_banner.txt
 * et met à jour FromBase64String(...) dans tous les public/*.bat
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const bannerPath = path.join(__dirname, "../public/chess_avatar_banner.txt");
let t = fs.readFileSync(bannerPath, "utf8");
t = t.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
if (!t.endsWith("\r\n")) t += "\r\n";
const newB64 = Buffer.from(t, "utf8").toString("base64");

const pub = path.join(__dirname, "../public");
for (const f of fs.readdirSync(pub).filter((x) => x.endsWith(".bat"))) {
  const p = path.join(pub, f);
  let c = fs.readFileSync(p, "utf8");
  const newC = c.replace(/FromBase64String\('[^']+'\)/g, `FromBase64String('${newB64}')`);
  if (c !== newC) {
    fs.writeFileSync(p, newC);
    console.log("updated", f);
  }
}
