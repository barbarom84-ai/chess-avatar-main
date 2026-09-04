import type { ReviewChatContext } from "@/lib/review-coach-context";
import { frenchNotationSystemHint, localizeFrenchCoachText, localizeSan } from "@/lib/localized-san";

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
  review?: ReviewChatContext;
}

function sideLabel(side: "white" | "black" | undefined, lang: "fr" | "en"): string {
  if (side === "black") return lang === "fr" ? "les Noirs" : "Black";
  if (side === "white") return lang === "fr" ? "les Blancs" : "White";
  return lang === "fr" ? "couleur inconnue" : "unknown side";
}

export function reviewBlurb(req: ChatRequest, lang: "fr" | "en"): string {
  const r = req.review;
  if (!r?.lastMove && !r?.fen && !r?.fenBefore && !r?.playerColor) return "";

  const player = sideLabel(r.playerColor, lang);
  const mover = sideLabel(r.sideToMove, lang);
  const moveLabel = localizeSan(r.lastMove ?? r.lastMoveUci ?? "", lang);
  const bestLabel = localizeSan(r.bestMove ?? r.bestMoveUci ?? "", lang);
  const ownMove =
    r.isPlayerMove === true
      ? lang === "fr"
        ? "C'EST un coup du joueur (l'élève)."
        : "This IS the student's own move."
      : r.isPlayerMove === false
        ? lang === "fr"
          ? "Ce n'est PAS un coup du joueur — c'est l'adversaire."
          : "This is NOT the student's move — it is the opponent."
        : "";

  if (lang === "fr") {
    const facts = [
      r.playerColor
        ? `L'élève joue ${player}${r.whiteName || r.blackName ? ` (Blancs: ${r.whiteName ?? "?"}, Noirs: ${r.blackName ?? "?"})` : ""}.`
        : "La couleur de l'élève n'est pas confirmée : déduis-la seulement si le FEN et les noms le permettent, sinon reste neutre.",
      r.sideToMove && moveLabel ? `Coup affiché, joué par ${mover} : ${moveLabel}. ${ownMove}` : "",
      r.classification ? `Classification moteur : ${r.classification}.` : "",
      typeof r.cpl === "number" ? `Perte : ${r.cpl} centipions.` : "",
      bestLabel ? `Meilleur coup moteur : ${bestLabel}. Ne propose PAS un autre « meilleur coup ».` : "",
      typeof r.playerEval === "number" && typeof r.bestEval === "number"
        ? `Éval après le coup joué : ${r.playerEval.toFixed(2)} (POV Blancs). Éval du meilleur coup : ${r.bestEval.toFixed(2)}.`
        : "",
      r.opening ? `Ouverture : ${r.opening}.` : "",
      r.fenBefore ? `FEN avant le coup : ${r.fenBefore}` : "",
      r.fen ? `FEN après le coup (échiquier actuel) : ${r.fen}` : "",
      r.lastExplanation
        ? `Explication déjà donnée pour ce coup (reste cohérent) : ${localizeFrenchCoachText(
            r.lastExplanation,
            [r.lastMove ?? "", r.bestMove ?? ""]
          )}`
        : "",
    ].filter(Boolean);

    return `
RÈGLES DE REVIEW (prioritaires) :
- Adresse-toi à l'élève selon SA couleur (${player}). N'inverse jamais Blancs et Noirs.
- Ne dis jamais « tu as joué X » si X a été joué par l'adversaire.
- Ne parle que des pièces présentes dans le FEN. N'invente pas de position.
- Reste sur CE coup et CETTE position, pas une autre ouverture générique.
- ${frenchNotationSystemHint()}
${facts.join("\n")}`;
  }

  const facts = [
    r.playerColor
      ? `The student plays ${player}${r.whiteName || r.blackName ? ` (White: ${r.whiteName ?? "?"}, Black: ${r.blackName ?? "?"})` : ""}.`
      : "The student's color is unconfirmed: infer it only from FEN/names if obvious, otherwise stay neutral.",
    r.sideToMove && moveLabel ? `Displayed move, played by ${mover}: ${moveLabel}. ${ownMove}` : "",
    r.classification ? `Engine label: ${r.classification}.` : "",
    typeof r.cpl === "number" ? `Loss: ${r.cpl} centipawns.` : "",
    bestLabel
      ? `Engine best move: ${bestLabel}. Do NOT invent a different best move.`
      : "",
    typeof r.playerEval === "number" && typeof r.bestEval === "number"
      ? `Eval after the played move: ${r.playerEval.toFixed(2)} (White POV). Best-move eval: ${r.bestEval.toFixed(2)}.`
      : "",
    r.opening ? `Opening: ${r.opening}.` : "",
    r.fenBefore ? `FEN before the move: ${r.fenBefore}` : "",
    r.fen ? `FEN after the move (current board): ${r.fen}` : "",
    r.lastExplanation
      ? `Explanation already given for this move (stay consistent): ${r.lastExplanation}`
      : "",
  ].filter(Boolean);

  return `
REVIEW RULES (highest priority):
- Address the student as playing ${player}. Never swap White and Black.
- Never say "you played X" if X was the opponent's move.
- Only mention pieces that appear in the FEN. Do not invent a position.
- Stay on THIS move and THIS position, not a generic opening lecture.
${facts.join("\n")}`;
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
${frenchNotationSystemHint()}
Pas de listes.${review}`;
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
