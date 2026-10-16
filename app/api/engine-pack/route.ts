import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import JSZip from "jszip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_DIR = path.join(process.cwd(), "public");

function sanitizeName(raw: unknown, fallback = "ChessAvatar"): string {
  if (typeof raw !== "string") return fallback;
  const cleaned = raw
    .replace(/[^A-Za-z0-9_\-]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return cleaned || fallback;
}

function avatarUrlFromProfile(profile: Record<string, unknown>): string | null {
  const candidates = [profile.avatarUrl, profile.avatar_url, profile.portraitUrl];
  for (const c of candidates) {
    if (typeof c === "string" && /^https?:\/\//i.test(c.trim())) {
      return c.trim();
    }
  }
  return null;
}

function guessImageExt(url: string, contentType: string | null): string {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("bmp")) return "bmp";
  const pathPart = url.split("?")[0]?.toLowerCase() ?? "";
  if (pathPart.endsWith(".png")) return "png";
  if (pathPart.endsWith(".jpg") || pathPart.endsWith(".jpeg")) return "jpg";
  if (pathPart.endsWith(".bmp")) return "bmp";
  return "webp";
}

async function fetchAvatarBytes(
  url: string
): Promise<{ bytes: Buffer; ext: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "image/*" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 32 || buf.length > 8_000_000) return null;
    return {
      bytes: buf,
      ext: guessImageExt(url, res.headers.get("content-type")),
    };
  } catch {
    return null;
  }
}

function buildReadme(engineName: string, profileFileName: string): string {
  return `========================================
  Chess Avatar - Pack moteur UCI
========================================

Bienvenue ! Ce ZIP installe votre avatar comme moteur UCI
dans Fritz 20 / ChessBase (et compatible Arena / Cutechess).

----------------------------------------
  Installation rapide (2 etapes)
----------------------------------------

1. Decompressez ce ZIP dans un dossier de votre choix
   (par exemple sur le Bureau).

2. Double-cliquez sur "ChessAvatarSetup.exe".
   Acceptez l'invite UAC Windows une seule fois.
   L'installateur va :
   - verifier AvatarEngine.exe + votre profil
   - telecharger Stockfish si besoin (~30 Mo)
   - generer engine.ini + logo Fritz (AvatarEngine.bmp)
   - copier tout dans :
     Documents\\ChessBase\\Engines\\${engineName}\\
   - enregistrer le moteur pour Fritz
     (%APPDATA%\\ChessBase\\Engines.uci\\)

3. Ouvrez Fritz 20 : votre moteur "${engineName}" doit
   apparaitre dans la liste des modules (avec logo si
   Fritz affiche les images moteur).

Aucune installation Python. Aucun script .bat a lancer.

----------------------------------------
  Contenu du pack
----------------------------------------

- ChessAvatarSetup.exe    Installateur graphique (recommande)
- AvatarEngine.exe        Moteur UCI pre-compile
- ${profileFileName}      Votre profil personnalise
- avatar.*                Photo / portrait (si disponible)
- README.txt              Ce fichier

Legacy (optionnel, non necessaire) :
- install_engine.bat / swap_profile.bat restent telechargeables
  depuis la page Guide > Avance sur le site.

----------------------------------------
  Depannage
----------------------------------------

- Windows SmartScreen sur le .exe ?
  "Informations complementaires" > "Executer quand meme"

- Le moteur ne reagit pas ?
  Verifiez stockfish.exe, le .json et engine.ini dans
  Documents\\ChessBase\\Engines\\${engineName}\\

- Stockfish n'a pas pu etre telecharge ?
  Telechargez-le depuis https://stockfishchess.org
  Placez stockfish.exe a cote de ChessAvatarSetup.exe
  puis relancez l'installateur.

Pour plus d'infos : https://chessavatar.net/guide
`;
}

export async function POST(req: NextRequest) {
  try {
    const profile = await req.json();

    if (!profile || typeof profile !== "object") {
      return NextResponse.json(
        { error: "INVALID_PROFILE" },
        { status: 400 }
      );
    }

    const profileObj = profile as Record<string, unknown>;
    const rawName = profileObj.username ?? profileObj.name;
    const safeName = sanitizeName(rawName);
    const profileFileName = `Bot_${safeName}.profile.json`;
    const engineName = `${safeName}_Avatar`;
    const zipName = `ChessAvatar_${safeName}_Pack.zip`;

    const exePath = path.join(PUBLIC_DIR, "AvatarEngine.exe");
    const setupPath = path.join(PUBLIC_DIR, "ChessAvatarSetup.exe");

    const [exeBuf, setupBuf] = await Promise.all([
      fs.readFile(exePath),
      fs.readFile(setupPath),
    ]);

    const zip = new JSZip();
    zip.file("ChessAvatarSetup.exe", setupBuf, { binary: true });
    zip.file("AvatarEngine.exe", exeBuf, { binary: true });
    zip.file(profileFileName, JSON.stringify(profile, null, 2));
    zip.file("README.txt", buildReadme(engineName, profileFileName));

    const avatarUrl = avatarUrlFromProfile(profileObj);
    if (avatarUrl) {
      const img = await fetchAvatarBytes(avatarUrl);
      if (img) {
        zip.file(`avatar.${img.ext}`, img.bytes, { binary: true });
      }
    }

    const zipBuf = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    return new NextResponse(new Uint8Array(zipBuf), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
        "Content-Length": String(zipBuf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (
      err instanceof Error &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return NextResponse.json(
        {
          error: "ENGINE_NOT_BUILT",
          detail:
            "AvatarEngine.exe or ChessAvatarSetup.exe is missing in /public. Run `npm run build:engine-pack` first.",
        },
        { status: 500 }
      );
    }
    console.error("[engine-pack] error:", message);
    return NextResponse.json(
      { error: "PACK_GENERATION_FAILED", detail: message },
      { status: 500 }
    );
  }
}
