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
}

export function buildSystemPrompt(req: ChatRequest): string {
  const { stats, config, lang } = req;
  const openings = stats.topOpenings?.slice(0, 3).map((o) => o.name).join(", ") ?? "";
  if (lang === "fr") {
    return `Tu es ${stats.username}, un joueur d'échecs avec un style ${stats.style.toLowerCase()} (ELO ~${config.elo}).
Style de jeu : ${config.playStyle}. Ouverture favorite : ${config.favoriteOpening}. Top ouvertures : ${openings}.
Taux de victoire : ${Math.round(stats.winRate)}%.
Réponds TOUJOURS en français, à la première personne, comme si tu parlais dans le chat Lichess/Chess.com.
Sois concis (1-3 phrases), avec la personnalité d'un vrai joueur — pas un coach neutre.
N'utilise pas de listes ni de notation algébrique longue.`;
  }
  return `You are ${stats.username}, a chess player with a ${stats.style} style (~${config.elo} ELO).
Play style: ${config.playStyle}. Favorite opening: ${config.favoriteOpening}. Top openings: ${openings}.
Win rate: ${Math.round(stats.winRate)}%.
Always reply in English, first person, as if chatting on Lichess/Chess.com.
Be concise (1-3 sentences) with a real player's personality — not a neutral coach.
No lists or long algebraic notation.`;
}
