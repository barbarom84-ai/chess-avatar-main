import pgn from "./hebert-seirawan-1982-luzern.pgn";
import type { HistoricalGameMeta } from "@/lib/historical-games-loader";

const meta: HistoricalGameMeta = {
  openingId: "french-defense",
  pgn,
  event: {
    fr: "Olympiade de Lucerne 1982 — ronde 9 (Canada – États-Unis)",
    en: "1982 Lucerne Olympiad — round 9 (Canada vs United States)",
  },
  anecdote: {
    fr: "Partie d’équipe au plus haut niveau : une française avec 2.d3 (ligne C00) où les noirs échangent les dames tôt puis imposent un jeu de positions et de finale à la Seirawan.",
    en: "A top-team board: a French with 2.d3 (C00) where Black trades queens early and outplays White in the middlegame and ending.",
  },
  annotations: [
    {
      afterMoveIndex: 7,
      text: {
        fr: "…c5 : contre-jeu typique à la française — les noirs frappent le centre blanc sans attendre.",
        en: "…c5: classic French counterplay — Black hits White’s center without delay.",
      },
    },
    {
      afterMoveIndex: 14,
      text: {
        fr: "Dxd7+ : les dames disparaissent — la partie bascule vers une finale où la structure de pions et les fous comptent beaucoup.",
        en: "Qxd7+: the queens come off — the game turns toward an ending where pawn structure and bishops matter.",
      },
    },
    {
      afterMoveIndex: 16,
      text: {
        fr: "e5 : les blancs revendiquent de l’espace sur l’aile roi ; le cavalier f6 doit se réorganiser (…Cg8).",
        en: "e5: White claims kingside space; the f6 knight must regroup (…Ng8).",
      },
    },
    {
      afterMoveIndex: 34,
      text: {
        fr: "Txh8+ : échange de tours sur la colonne h ouverte — le roi noir reste exposé sur le pion g.",
        en: "Rxh8+: rooks trade on the open h-file — the Black king stays loose on the g-pawn.",
      },
    },
    {
      afterMoveIndex: 79,
      text: {
        fr: "…Fg6 : le fou noir centralise et verrouille la case claire ; les blancs doivent défendre plusieurs faiblesses.",
        en: "…Bg6: Black centralizes the bishop and eyes light squares; White must cover several weaknesses.",
      },
    },
  ],
  challenges: [
    {
      id: "luzern-1982-qxd7",
      afterMoveCount: 14,
      correctUci: "a4d7",
      prompt: {
        fr: "Les blancs ont joué Da4+ et les noirs …Dd7. Quel coup des blancs, joué dans la partie, échange les dames ?",
        en: "White played Qa4+ and Black answered …Qd7. Which White move, as played, trades the queens?",
      },
      wrongChoices: ["a4b5", "a4c6", "a4a5"],
      hints: [
        {
          fr: "La dame blanche peut prendre la dame noire sur la même colonne.",
          en: "The white queen can capture the black queen on the same file.",
        },
        {
          fr: "La prise en d7 avec la dame est forcée pour le bon sens des échanges.",
          en: "Taking on d7 with the queen is the natural trade.",
        },
      ],
      insight: {
        fr: "Dxd7+ : les blancs éliminent les dames mais la partie reste très technique ; la suite favorise souvent les noirs si la structure est inférieure pour les blancs.",
        en: "Qxd7+: White removes the queens but the game stays technical; the sequel often favors Black if White’s structure is worse.",
      },
    },
  ],
};

export default meta;
