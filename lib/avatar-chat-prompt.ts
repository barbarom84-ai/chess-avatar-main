import type { ReviewChatContext, ReviewEngineLine } from "@/lib/review-coach-context";
import { classifyReviewCoachQuestion } from "@/lib/review-coach-context";
import { formatEvalLabel } from "@/lib/engine-eval";
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

function formatEngineLinesBlurb(
  lines: ReviewEngineLine[] | undefined,
  lang: "fr" | "en"
): string {
  if (!lines?.length) return "";
  return lines
    .map((line) => {
      const san = localizeSan(line.san, lang);
      const evalLabel = formatEvalLabel(
        line.evalWhitePov,
        line.isMate,
        line.mateInMovesWhite
      );
      const rest = line.pvSan
        .slice(1, 4)
        .map((ply) => localizeSan(ply, lang))
        .join(" ");
      return `${line.rank}. ${san} (${evalLabel})${rest ? ` ${rest}` : ""}`;
    })
    .join(" ; ");
}

export function reviewBlurb(req: ChatRequest, lang: "fr" | "en"): string {
  const r = req.review;
  if (!r?.lastMove && !r?.fen && !r?.fenBefore && !r?.playerColor) return "";

  const mover = sideLabel(r.sideToMove, lang);
  const nowToMove = sideLabel(r.turnToMove, lang);
  const moveLabel = localizeSan(r.lastMove ?? r.lastMoveUci ?? "", lang);
  const bestLabel = localizeSan(r.bestMove ?? r.bestMoveUci ?? "", lang);
  const intent = classifyReviewCoachQuestion(req.message, lang);
  const suggestNow = intent === "how_to_play" || intent === "other";
  const beforeSans = (r.legalMovesBefore ?? []).map((san) => localizeSan(san, lang));
  const engineNow = formatEngineLinesBlurb(r.engineLinesNow, lang);

  if (lang === "fr") {
    const intentBlock =
      intent === "why_last" && moveLabel
        ? `INTENTION : expliquer le DERNIER COUP DÉJÀ JOUÉ (${moveLabel} par ${mover}, flèche jaune). Neutre : pas de « tu joues les Blancs/Noirs ». INTERDIT de proposer un coup à ${nowToMove}.`
        : intent === "best_line"
          ? bestLabel
            ? `INTENTION : la meilleure suite est UNIQUEMENT ${bestLabel}, un coup de ${mover} À LA PLACE de ${moveLabel || "ce coup"}, depuis le FEN AVANT. INTERDIT d'inventer un autre SAN (pas de Cc6 / b8-c6 s'ils ne sont pas ${bestLabel}). Ce n'est pas un coup de l'échiquier actuel.`
            : `INTENTION : meilleure suite, mais AUCUNE alternative moteur n'est fournie. Dis que l'analyse n'est pas prête. INTERDIT d'inventer un coup (Cc6, b8-c6, développement générique…).`
          : intent === "how_to_play"
            ? engineNow
              ? `INTENTION : comment jouer MAINTENANT. Cite UNIQUEMENT un ou plusieurs des 3 coups Stockfish : ${engineNow}. INTERDIT d'inventer un autre SAN.`
              : `INTENTION : comment jouer MAINTENANT, mais les 3 coups moteur ne sont pas prêts. Dis-le. INTERDIT d'inventer un coup.`
            : intent === "lost_advantage"
              ? `INTENTION : où l'évaluation a glissé. Parle du coup affiché (${moveLabel || "?"}) et de sa classification, pas d'un coup futur, et sans prendre parti pour un camp.`
              : "";
    const facts = [
      r.whiteName || r.blackName
        ? `Partie : Blancs ${r.whiteName ?? "?"} — Noirs ${r.blackName ?? "?"}.`
        : "",
      r.turnToMove
        ? `TRAIT ACTUEL (échiquier affiché) : ${nowToMove}. Le 2e champ du FEN (w/b) le confirme.`
        : "",
      r.sideToMove && moveLabel
        ? `Dernier coup DÉJÀ joué : ${moveLabel}, par ${mover}. Ce camp n'a plus le trait.`
        : "",
      r.boardPieces
        ? `Pièces réellement présentes (seules celles-ci existent) : ${r.boardPieces}`
        : "",
      r.boardAscii
        ? `DIAGRAMME ACTUEL (8e rangée en haut) — après ${moveLabel || "le coup"} :\n${r.boardAscii}`
        : "",
      suggestNow && engineNow
        ? `3 MEILLEURS COUPS Stockfish MAINTENANT (seuls ceux-ci peuvent être proposés) : ${engineNow}.`
        : "",
      suggestNow && !engineNow && r.legalMovesNow?.length
        ? `Coups LÉGAUX MAINTENANT (seuls ceux-ci peuvent être proposés comme suite) : ${r.legalMovesNow
            .map((san) => localizeSan(san, lang))
            .join(", ")}.`
        : "",
      intent === "best_line" && beforeSans.length
        ? `Coups LÉGAUX AVANT ${moveLabel || "ce coup"} (seuls ceux-ci pouvaient le remplacer) : ${beforeSans.join(", ")}.`
        : "",
      r.classification ? `Classification moteur : ${r.classification}.` : "",
      typeof r.cpl === "number" ? `Perte : ${r.cpl} centipions.` : "",
      bestLabel
        ? `Alternative moteur MANQUÉE (depuis le FEN AVANT, à la place de ${moveLabel || "ce coup"}) : ${bestLabel}.`
        : "",
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
- Reste NEUTRE : n'adresse jamais le joueur comme « tu joues les Blancs » ou « tu joues les Noirs ». Décris les deux camps à la 3e personne.
- Ne dis jamais « tu as joué X ».
- Le trait ACTUEL n'est PAS le camp qui vient de jouer.
- Ne parle que des pièces du diagramme. N'invente pas de cavalier ou de case occupée (pas de « Cc6 » si un pion est déjà en c6).
- Un coup proposé MAINTENANT doit être l'un des 3 coups Stockfish s'ils sont fournis, sinon un coup de la liste légale. Une meilleure suite se joue dans le FEN AVANT.
- Reste sur CE coup et CETTE position, pas une ouverture générique.
- ${frenchNotationSystemHint()}
${intentBlock ? `${intentBlock}\n` : ""}${facts.join("\n")}`;
  }

  const enIntentBlock =
    intent === "why_last" && moveLabel
      ? `INTENT: explain the LAST MOVE ALREADY PLAYED (${moveLabel} by ${mover}, yellow arrow). Stay side-neutral. Do NOT suggest a move for ${nowToMove}.`
      : intent === "best_line"
        ? bestLabel
          ? `INTENT: the only best continuation is ${bestLabel}, a ${mover} move INSTEAD of ${moveLabel || "this move"} from the BEFORE FEN. Do NOT invent another SAN.`
          : `INTENT: best continuation, but NO engine alternative is provided. Say analysis is not ready. Do NOT invent a move (Nc6, b8-c6, generic development…).`
        : intent === "how_to_play"
          ? engineNow
            ? `INTENT: how to play NOW. Cite ONLY Stockfish's top 3: ${engineNow}. Do NOT invent another SAN.`
            : `INTENT: how to play NOW, but the engine's top 3 are not ready. Say so. Do NOT invent a move.`
          : intent === "lost_advantage"
            ? `INTENT: where the evaluation slipped. Talk about the displayed move (${moveLabel || "?"}), without taking a side.`
            : "";

  const facts = [
    r.whiteName || r.blackName
      ? `Game: White ${r.whiteName ?? "?"} — Black ${r.blackName ?? "?"}.`
      : "",
    r.turnToMove
      ? `SIDE TO MOVE NOW (displayed board): ${nowToMove}. The FEN's second field (w/b) confirms this.`
      : "",
    r.sideToMove && moveLabel
      ? `Last move ALREADY played: ${moveLabel}, by ${mover}. That side no longer has the move.`
      : "",
    r.boardPieces
      ? `Pieces actually on the board (only these exist): ${r.boardPieces}`
      : "",
    r.boardAscii
      ? `CURRENT DIAGRAM (rank 8 at the top) — after ${moveLabel || "the move"}:\n${r.boardAscii}`
      : "",
    suggestNow && engineNow
      ? `Stockfish TOP 3 NOW (only these may be suggested): ${engineNow}.`
      : "",
    suggestNow && !engineNow && r.legalMovesNow?.length
      ? `Legal moves NOW (only these may be suggested as a continuation): ${r.legalMovesNow.join(", ")}.`
      : "",
    intent === "best_line" && beforeSans.length
      ? `Legal moves BEFORE ${moveLabel || "this move"} (only these could replace it): ${beforeSans.join(", ")}.`
      : "",
    r.classification ? `Engine label: ${r.classification}.` : "",
    typeof r.cpl === "number" ? `Loss: ${r.cpl} centipawns.` : "",
    bestLabel
      ? `MISSED engine alternative (from the BEFORE FEN, instead of ${moveLabel || "the played move"}): ${bestLabel}.`
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
- Stay NEUTRAL: never address the player as "you play White" or "you play Black". Describe both sides in the third person.
- Never say "you played X".
- The side to move NOW is NOT the side that just moved.
- Only mention pieces on the diagram. Do not invent a knight onto an occupied square (no "Nc6" if a pawn is already on c6).
- A move to play NOW must be one of Stockfish's top 3 if provided, otherwise a move from the legal list. A better continuation is played from the BEFORE FEN.
- Stay on THIS move and THIS position, not a generic opening lecture.
${enIntentBlock ? `${enIntentBlock}\n` : ""}${facts.join("\n")}`;
}

export function buildSystemPrompt(req: ChatRequest): string {
  const { stats, config, lang } = req;
  const openings = stats.topOpenings?.slice(0, 3).map((o) => o.name).join(", ") ?? "";
  const review = reviewBlurb(req, lang);
  const isHouse = req.role === "house" || stats.username === "ChessAvatarPro";

  if (isHouse) {
    if (lang === "fr") {
      return `Tu es ChessAvatarPro, le coach officiel de ChessAvatar.
Tu aides à comprendre la partie : idées, plans et erreurs, sans jargon inutile.
Reste neutre vis-à-vis des deux camps : jamais « tu joues les Blancs/Noirs ».
Réponds TOUJOURS en français, à la première personne, pédagogue et précis (2-4 phrases).
${frenchNotationSystemHint()}
Pas de listes.${review}`;
    }
    return `You are ChessAvatarPro, the official ChessAvatar coach.
Help understand the game: ideas, plans, and mistakes, without fluff.
Stay side-neutral: never "you play White/Black".
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
