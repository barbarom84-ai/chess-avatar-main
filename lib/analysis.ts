import { Chess } from "chess.js";
import { clampProfileElo } from "@/lib/elo-bounds";

/** Export UCI / Fritz (AvatarEngine.py) — réponses noires après séquence de coups blancs. */
export interface FritzBlackChoice {
  uci: string;
  weight: number;
}

export interface FritzBlackOpeningFallbackEntry {
  whiteUci: string[];
  choices: FritzBlackChoice[];
}

export interface PersonaStats {
  username: string;
  avatarUrl?: string;
  platform?: 'lichess' | 'chesscom'; // Plateforme détectée
  gameCount: number;
  winRate: number;
  drawRate: number;
  lossRate: number;
  style: "Agressif" | "Solide" | "Équilibré" | "Chaotique";
  topOpenings: { name: string; count: number }[];
  avgMoves: number;
}

export interface EngineConfig {
  name: string;
  avatarUrl?: string;
  platform?: 'lichess' | 'chesscom'; // Plateforme détectée
  elo: number;
  difficulty: 1 | 2 | 3 | 4 | 5; // 1=Débutant, 5=Grand Maître
  aggressiveness: number; // 0-100
  threads: number; // 2-8 (minimum 2)
  depth: number; // Profondeur de calcul (8-20)
  timeControl: number; // Temps de réflexion en ms
  favoriteOpening: string; // Ouverture préférée
  playStyle: "agressif" | "solide" | "équilibré" | "positionnel" | "tactique";
  openings: Record<string, string>;
  // Nouveau: Répertoire d'ouvertures
  openingRepertoire?: {
    whiteOpenings: { id: string; weight: number }[];
    blackOpenings: { id: string; weight: number }[];
  };
  // Ligne forcée : source (ouvertures du répertoire vs personnalisée) et séquences par couleur
  forcedLineSource?: 'openings' | 'custom';
  forcedLineWhite?: string[];  // Coups du bot quand il joue les blancs
  forcedLineBlack?: string[];  // Coups du bot quand il joue les noirs
  /** @deprecated Préférer forcedLineWhite / forcedLineBlack. Conservé pour rétrocompat. */
  forcedLine?: string[];
  /**
   * Export UCI / Fritz : réponses noires indexées uniquement sur les coups blancs joués.
   * Rempli par prepareConfigForExport ; consommé par AvatarEngine.py.
   */
  fritzBlackOpeningFallback?: FritzBlackOpeningFallbackEntry[];
  creatorName?: string;
  /**
   * Tous les N coups joués par l'avatar, jouer un coup sous-optimal (MultiPV).
   * 0 = désactivé. undefined = 10 (comportement par défaut).
   */
  humanBlunderInterval?: number;
  /** Profil créé par le script / API « champions » Arène */
  featuredSeed?: boolean;
}

function normalizeOpeningName(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (
    trimmed.toLowerCase() === "ouverture inconnue" ||
    trimmed.toLowerCase() === "unknown opening"
  ) {
    return null;
  }
  return trimmed;
}

function parsePgnTag(pgn: string, tag: string): string | null {
  const regex = new RegExp(`\\[${tag}\\s+"([^"]+)"\\]`, "i");
  const match = pgn.match(regex);
  return match?.[1]?.trim() || null;
}

function openingFromEcoUrl(ecoUrl?: string | null): string | null {
  if (!ecoUrl) return null;
  // Ex: https://www.chess.com/openings/Italian-Game
  const slug = ecoUrl.split("/").filter(Boolean).pop();
  if (!slug) return null;
  const cleaned = slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return normalizeOpeningName(cleaned);
}

export interface PersonaGameInput {
  id?: string;
  createdAt?: number;
  opening?: { name?: string };
  pgn?: string;
  winner?: string | null;
  players?: {
    white?: { user?: { name?: string }; username?: string };
    black?: { user?: { name?: string }; username?: string };
  };
}

function extractOpeningName(game: PersonaGameInput): string | null {
  const direct = normalizeOpeningName(game?.opening?.name);
  if (direct) return direct;

  const pgn = typeof game?.pgn === "string" ? game.pgn : "";
  if (!pgn) return null;

  // Chess.com PGN generally provides [Opening "..."] and sometimes [ECOUrl "..."].
  const pgnOpening = normalizeOpeningName(parsePgnTag(pgn, "Opening"));
  if (pgnOpening) return pgnOpening;

  const ecoUrl = parsePgnTag(pgn, "ECOUrl");
  const fromUrl = openingFromEcoUrl(ecoUrl);
  if (fromUrl) return fromUrl;

  const ecoCode = parsePgnTag(pgn, "ECO");
  if (ecoCode) return `ECO ${ecoCode}`;

  return null;
}

function estimatePersonaElo(
  games: PersonaGameInput[],
  username: string,
  winRate: number,
  platformRating?: number
): number {
  if (platformRating != null && platformRating > 0) {
    return clampProfileElo(platformRating);
  }

  const needle = username.toLowerCase();
  const perfRatings: number[] = [];

  for (const game of games) {
    const pgn = typeof game?.pgn === "string" ? game.pgn : "";
    const whiteName =
      game.players?.white?.user?.name ||
      game.players?.white?.username ||
      "";
    const blackName =
      game.players?.black?.user?.name ||
      game.players?.black?.username ||
      "";
    const isWhite = whiteName.toLowerCase() === needle;
    const oppRatingTag = isWhite ? "BlackElo" : "WhiteElo";
    const selfRatingTag = isWhite ? "WhiteElo" : "BlackElo";
    const selfR = parsePgnTag(pgn, selfRatingTag);
    const oppR = parsePgnTag(pgn, oppRatingTag);
    const selfNum = selfR ? parseInt(selfR, 10) : NaN;
    const oppNum = oppR ? parseInt(oppR, 10) : NaN;
    if (!Number.isNaN(selfNum) && selfNum > 0) perfRatings.push(selfNum);
    if (!Number.isNaN(oppNum) && oppNum > 0) {
      const perf = oppNum + (winRate - 50) * 4;
      perfRatings.push(perf);
    }
  }

  if (perfRatings.length >= 2) {
    const avg =
      perfRatings.reduce((a, b) => a + b, 0) / perfRatings.length;
    return clampProfileElo(avg);
  }

  return clampProfileElo(800 + winRate * 27);
}

// On ajoute le paramètre platform à la fonction
export function analyzePersona(
  games: PersonaGameInput[],
  username: string,
  avatarUrl?: string,
  platform?: "lichess" | "chesscom",
  platformRating?: number
): { stats: PersonaStats; config: EngineConfig } {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let totalMoves = 0;
  const openingsMap = new Map<string, number>();
  const openingMovesMap = new Map<string, string>();

  // Sécurité : on ne garde que les parties avec PGN
  const validGames = games.filter(g => g && typeof g.pgn === 'string');

  validGames.forEach((game) => {
    const pgnText = game.pgn;
    if (!pgnText) return;

    // Gestion des noms un peu différente selon Lichess/Chess.com
    // On essaie de trouver le joueur qui correspond au username
    const whiteName = game.players?.white?.user?.name || game.players?.white?.username || "Anonymous";
    const isWhite = whiteName.toLowerCase() === username.toLowerCase();
    
    const winner = game.winner; 
    
    if (!winner || winner === 'draw') draws++; // Chess.com renvoie parfois 'draw' explicitement
    else if ((isWhite && winner === 'white') || (!isWhite && winner === 'black')) wins++;
    else losses++;

    try {
      const chess = new Chess();
      chess.loadPgn(pgnText);
      const history = chess.history({ verbose: true });
      totalMoves += history.length;

      // Récupération ouverture (Lichess + fallback PGN pour Chess.com)
      const openingName = extractOpeningName(game);
      if (openingName) {
        openingsMap.set(openingName, (openingsMap.get(openingName) || 0) + 1);
      }

      if (history.length > 5) {
        // Construction du livre
        history.slice(0, 12).forEach((move) => {
          if (move.color === (isWhite ? 'w' : 'b')) {
            openingMovesMap.set(move.before, move.lan); 
          }
        });
      }
    } catch {
      // Ignorer les parties corrompues
    }
  });

  const total = validGames.length || 1;
  const avgMoves = Math.floor(totalMoves / total);

  let style: PersonaStats["style"] = "Équilibré";
  const drawPercent = (draws / total) * 100;
  
  if (avgMoves < 30) style = "Agressif";
  else if (avgMoves > 50) style = "Solide";
  
  // Style chaotique : beaucoup de pertes ET beaucoup de victoires (variance élevée)
  if ((losses / total) * 100 > 35 && (wins / total) * 100 > 35) style = "Chaotique";
  // Solide : beaucoup de nulles
  else if (drawPercent > 40) style = "Solide";

  const topOpenings = Array.from(openingsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  const openingBookObj: Record<string, string> = {};
  openingMovesMap.forEach((value, key) => {
    openingBookObj[key] = value;
  });

  // Calcul du niveau de difficulté basé sur le winRate et le style
  const winRate = (wins / total) * 100;
  let difficulty: 1 | 2 | 3 | 4 | 5 = 3;
  if (winRate >= 70) difficulty = 5;
  else if (winRate >= 60) difficulty = 4;
  else if (winRate >= 50) difficulty = 3;
  else if (winRate >= 40) difficulty = 2;
  else difficulty = 1;

  const estimatedElo = estimatePersonaElo(
    validGames,
    username,
    winRate,
    platformRating
  );

  // Détermination du style de jeu
  let playStyle: "agressif" | "solide" | "équilibré" | "positionnel" | "tactique" = "équilibré";
  if (style === "Agressif") playStyle = avgMoves < 35 ? "tactique" : "agressif";
  else if (style === "Solide") {
    playStyle = avgMoves >= 40 ? "solide" : avgMoves <= 32 ? "équilibré" : "positionnel";
  }
  else if (style === "Chaotique") playStyle = "tactique";
  // Équilibré reste "équilibré" par défaut

  // Ouverture favorite (la plus jouée)
  const favoriteOpening = topOpenings.length > 0 ? topOpenings[0].name : "Italienne";

  return {
    stats: {
      username,
      avatarUrl,
      platform,
      gameCount: total,
      winRate: Math.round(winRate),
      drawRate: Math.round((draws / total) * 100),
      lossRate: Math.round((losses / total) * 100),
      style,
      topOpenings,
      avgMoves
    },
    config: {
      name: `Bot_${username}`,
      avatarUrl,
      platform,
      elo: estimatedElo,
      difficulty,
      aggressiveness: style === "Agressif" ? 100 : style === "Solide" ? 20 : 50,
      threads: difficulty >= 4 ? 4 : 2, // Minimum 2 threads
      depth:
        difficulty === 1 ? 6 : difficulty === 2 ? 9 : difficulty * 3 + 5, // 6, 9 puis 14–20
      timeControl: Math.max(300, (6 - difficulty) * 150), // 300-750ms (plus rapide)
      favoriteOpening,
      playStyle,
      openings: openingBookObj,
      humanBlunderInterval: 10
    }
  };
}