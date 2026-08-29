export interface ChatRequest {
  message: string;
  lang: "fr" | "en";
  stats: {
    username: string;
    style: string;
    winRate: number;
    topOpenings?: { name: string; count: number }[];
  };
  config: {
    playStyle: string;
    elo: number;
    favoriteOpening: string;
  };
  /** House coach (ChessAvatarPro) instead of a player clone. */
  role?: "house" | "persona";
  review?: {
    fen?: string;
    lastMove?: string;
    classification?: string;
  };
}

function reviewBlurb(req: ChatRequest, lang: "fr" | "en"): string {
  const r = req.review;
  if (!r?.lastMove && !r?.fen) return "";
  if (lang === "fr") {
    const bits = [
      r.lastMove ? `Coup en cours : ${r.lastMove}` : "",
      r.classification ? `Évaluation : ${r.classification}` : "",
      r.fen ? `FEN : ${r.fen}` : "",
    ].filter(Boolean);
    return `\nPartie en review. ${bits.join(". ")}.`;
  }
  const bits = [
    r.lastMove ? `Current move: ${r.lastMove}` : "",
    r.classification ? `Label: ${r.classification}` : "",
    r.fen ? `FEN: ${r.fen}` : "",
  ].filter(Boolean);
  return `\nGame review. ${bits.join(". ")}.`;
}

export function buildSystemPrompt(req: ChatRequest): string {
  const { stats, config, lang } = req;
  const openings = stats.topOpenings?.slice(0, 3).map((o) => o.name).join(", ") ?? "";
  const review = reviewBlurb(req, lang);
  const isHouse = req.role === "house" || stats.username === "ChessAvatarPro";

  if (isHouse) {
    if (lang === "fr") {
      return `Tu es ChessAvatarPro, le coach officiel de ChessAvatar.
Tu aides le joueur à comprendre la partie : idées, plans, et erreurs, sans jargon inutile.
Réponds TOUJOURS en français, à la première personne, pédagogue et précis (2-4 phrases).
Tu peux citer un coup en SAN court. Pas de listes.${review}`;
    }
    return `You are ChessAvatarPro, the official ChessAvatar coach.
Help the player understand the game: ideas, plans, and mistakes, without fluff.
Always reply in English, first person, pedagogical and precise (2-4 sentences).
Short SAN is fine. No lists.${review}`;
  }

  if (lang === "fr") {
    return `Tu es ${stats.username}, un joueur d'échecs avec un style ${stats.style.toLowerCase()} (ELO ~${config.elo}).
Style de jeu : ${config.playStyle}. Ouverture favorite : ${config.favoriteOpening}. Top ouvertures : ${openings}.
Taux de victoire : ${Math.round(stats.winRate)}%.
Réponds TOUJOURS en français, à la première personne, comme si tu parlais dans le chat Lichess/Chess.com.
Sois concis (1-3 phrases), avec la personnalité d'un vrai joueur — pas un coach neutre.
N'utilise pas de listes ni de notation algébrique longue.${review}`;
  }
  return `You are ${stats.username}, a chess player with a ${stats.style} style (~${config.elo} ELO).
Play style: ${config.playStyle}. Favorite opening: ${config.favoriteOpening}. Top openings: ${openings}.
Win rate: ${Math.round(stats.winRate)}%.
Always reply in English, first person, as if chatting on Lichess/Chess.com.
Be concise (1-3 sentences) with a real player's personality — not a neutral coach.
No lists or long algebraic notation.${review}`;
}
