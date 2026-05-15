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

function buildReadme(engineName: string, profileFileName: string): string {
  return `========================================
  Chess Avatar - Pack moteur UCI
========================================

Bienvenue ! Ce ZIP contient tout le necessaire pour installer votre
avatar comme moteur UCI dans Fritz, ChessBase, Arena ou Cutechess.

----------------------------------------
  Installation rapide (3 etapes)
----------------------------------------

>>> IMPORTANT : install_engine.bat doit etre lance EN TANT QU'ADMINISTRATEUR.
>>> Clic droit sur le fichier > "Executer en tant qu'administrateur".
>>> Un simple double-clic peut echouer (telechargement Stockfish bloque,
>>> copie de fichiers refusee selon votre configuration Windows).

1. Decompressez ce ZIP dans un dossier de votre choix
   (par exemple sur le Bureau).

2. CLIC DROIT sur "install_engine.bat" > "Executer en tant qu'administrateur".
   Acceptez l'invite UAC.
   Le script va :
   - verifier la presence d'AvatarEngine.exe
   - telecharger Stockfish automatiquement s'il manque
   - generer engine.ini
   - copier tout dans :
     Documents\\ChessBase\\Engines\\${engineName}\\

3. Ouvrez Fritz / ChessBase / Arena :
   - Menu Module (ou Engines) > Module UCI > Nouveau
   - Selectionnez AvatarEngine.exe dans le dossier ci-dessus
   - Votre moteur "${engineName}" est pret !

Aucune installation Python requise.

----------------------------------------
  Comment changer d'avatar
----------------------------------------

Vous avez 2 options :

OPTION A - Avatars multiples (recommande)
  Telechargez un nouveau pack ZIP depuis le site avec un autre profil.
  Lancez install_engine.bat : il creera un nouveau dossier moteur sous
  Documents\\ChessBase\\Engines\\<NouveauNom>_Avatar\\
  Vos deux avatars apparaissent separement dans Fritz.

OPTION B - Hot-swap dans le meme moteur
  1. Telechargez seulement le nouveau Bot_*.profile.json depuis le site
  2. Allez dans Documents\\ChessBase\\Engines\\${engineName}\\
  3. Double-cliquez sur "swap_profile.bat" (fenetre administrateur)
  4. Choisissez 1 (coller le chemin) ou 2 (boite de dialogue fichier).
     En admin, le glisser-depose depuis l'Explorateur est souvent bloque ;
     preferez 2 ou Shift+clic droit sur le fichier > Copier comme chemin d'acces.
  5. Relancez Fritz - votre moteur joue maintenant avec le nouveau profil

NOTE : Le hot-swap supprime engine.ini pour que le nom UCI du moteur
suive le nouveau profil. Si vous voulez garder l'ancien nom, restaurez
engine.ini depuis votre installation initiale.

Apres installation, seul le fichier profile.json est copie dans le dossier
moteur sous Documents\\ChessBase\\Engines\\ : pas de doublon avec Bot_*.profile.json.
Le Bot_*.profile.json du ZIP sert de source ; le moteur lit toujours profile.json.

Apres un hot-swap, les anciens Bot_*.profile.json du dossier moteur sont supprimes
automatiquement pour ne garder que profile.json ^(et profile.previous.json^).

----------------------------------------
  Contenu du pack
----------------------------------------

- AvatarEngine.exe        Moteur UCI pre-compile (aucun Python requis)
- install_engine.bat      Script d'installation automatique
- swap_profile.bat        Outil de changement d'avatar (a copier dans
                          le dossier moteur final par install_engine.bat)
- ${profileFileName}      Votre profil personnalise (genere depuis le site)
- README.txt              Ce fichier

----------------------------------------
  Depannage
----------------------------------------

- Windows bloque le .bat (SmartScreen) ?
  Clic droit > Proprietes > cochez "Debloquer" > OK
  Puis "Informations complementaires" > "Executer quand meme"

- Le moteur ne reagit pas ?
  Verifiez que stockfish.exe et profile.json sont bien dans le
  dossier Documents\\ChessBase\\Engines\\${engineName}\\

- Des fenetres noires (invite de commandes) qui s'ouvrent avec Fritz ?
  Re-telechargez un pack ZIP ou remplacez AvatarEngine.exe : la version recente
  ne cree plus de console pour le moteur ni pour Stockfish.

- Stockfish n'a pas pu etre telecharge ?
  Telechargez-le manuellement depuis https://stockfishchess.org
  Placez stockfish.exe dans le dossier du ZIP, puis relancez
  install_engine.bat

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

    const rawName =
      (profile as Record<string, unknown>).username ??
      (profile as Record<string, unknown>).name;
    const safeName = sanitizeName(rawName);
    const profileFileName = `Bot_${safeName}.profile.json`;
    const engineName = `${safeName}_Avatar`;
    const zipName = `ChessAvatar_${safeName}_Pack.zip`;

    const exePath = path.join(PUBLIC_DIR, "AvatarEngine.exe");
    const installBatPath = path.join(PUBLIC_DIR, "install_engine.bat");
    const swapBatPath = path.join(PUBLIC_DIR, "swap_profile.bat");

    const [exeBuf, installBat, swapBat] = await Promise.all([
      fs.readFile(exePath),
      fs.readFile(installBatPath, "utf8"),
      fs.readFile(swapBatPath, "utf8"),
    ]);

    const zip = new JSZip();
    zip.file("AvatarEngine.exe", exeBuf, { binary: true });
    zip.file("install_engine.bat", installBat);
    zip.file("swap_profile.bat", swapBat);
    zip.file(profileFileName, JSON.stringify(profile, null, 2));
    zip.file("README.txt", buildReadme(engineName, profileFileName));

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
            "AvatarEngine.exe is missing in /public. Run `npm run build:engine` first.",
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
