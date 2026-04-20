import pgn from "./steinitz-zukertort-1886-wch-r14.pgn";
import type { HistoricalGameMeta } from "@/lib/historical-games-loader";

const meta: HistoricalGameMeta = {
  openingId: "spanish-opening",
  pgn,
  event: {
    fr: "Championnat du monde 1886 (États-Unis), 14ᵉ partie — nulle",
    en: "1886 World Championship (USA), game 14 — draw",
  },
  anecdote: {
    fr: "Partie réelle de la première finale du championnat du monde : ouverture espagnole, variante berlinoise (C67), comme dans le fichier PGN du dépôt.",
    en: "From the first official world championship match: Spanish Opening, Berlin Defense (C67), matching the bundled PGN in the repo.",
  },
  annotations: [
    {
      afterMoveIndex: 5,
      text: {
        fr: "Tabiya de l’espagnole : les blancs vont choisir leur antithéorie (ici la ligne berlinoise 4.O-O).",
        en: "Ruy Lopez tabiya: White picks an anti-line (here the Berlin with 4.O-O).",
      },
    },
    {
      afterMoveIndex: 6,
      text: {
        fr: "4.O-O : le coup signature de la défense berlinoise — roc avant de reprendre le pion e4.",
        en: "4.O-O: the Berlin’s signature — castle before recapturing on e4.",
      },
    },
    {
      afterMoveIndex: 7,
      text: {
        fr: "…Cxe4 : les noirs prennent le pion central ; la partie bascule souvent vers des plans stratégiques.",
        en: "…Nxe4: Black grabs the central pawn; play often turns strategic.",
      },
    },
    {
      afterMoveIndex: 10,
      text: {
        fr: "6.Cxe5 : les blancs reprennent au centre ; la berlinoise mène à des structures équilibrées.",
        en: "6.Nxe5: White regains in the center; the Berlin often leads to balanced structures.",
      },
    },
    {
      afterMoveIndex: 95,
      text: {
        fr: "Nulle : finale avec fou — typique des berlinoises où beaucoup de matière a été échangée.",
        en: "Draw: bishop ending — typical of Berlins where much material was traded.",
      },
    },
  ],
  challenges: [
    {
      id: "berlin-castles-o-o",
      afterMoveCount: 6,
      correctUci: "e1g1",
      prompt: {
        fr: "Après 1.e4 e5 2.Cf3 Cc6 3.Fb5 Cf6, quel coup des blancs introduit la défense berlinoise dans cette partie historique ?",
        en: "After 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6, which White move introduces the Berlin Defense in this historic game?",
      },
      wrongChoices: ["b5c6", "d2d3", "b1c3"],
      hints: [
        {
          fr: "Ce n’est ni la prise en c6 ni le développement immédiat du cavalier dame (b1-c3) : pense « roi en sécurité » avant de reprendre sur e4.",
          en: "Not Bxc6 or an immediate QN development — think “king to safety” before recapturing on e4.",
        },
        {
          fr: "Les blancs roquent court ; la prise …Cxe4 viendra au coup suivant.",
          en: "White castles short; …Nxe4 follows on the next move.",
        },
      ],
      insight: {
        fr: "4.O-O est le coup moderne de la Berlin : le roi est mis à l’abri pendant que le pion e4 reste en prise une case de plus.",
        en: "4.O-O is the modern Berlin tabiya: the king is tucked away while the e4-pawn hangs one more tempo.",
      },
    },
  ],
};

export default meta;
