import pgn from "./maroczy-spielmann-prague-1908.pgn";
import type { HistoricalGameMeta } from "@/lib/historical-games-loader";

const meta: HistoricalGameMeta = {
  openingId: "london-system",
  pgn,
  event: {
    fr: "Tournoi international de maîtres, Prague 1908 — ronde 14",
    en: "Prague 1908 International Masters — round 14",
  },
  anecdote: {
    fr: "Une ligne D02 (d4, Ff4, e3) typique de la « Londres » du tournage : structure avec pions c et jeu de tours sur la colonne c avant la finale gagnante.",
    en: "A D02 London-style line (d4, Bf4, e3): c-pawn structure and rook play on the c-file before a winning ending.",
  },
  annotations: [
    {
      afterMoveIndex: 2,
      text: {
        fr: "2.Ff4 : signature du système de Londres — le fou sort avant e3 pour éviter le blocage classique.",
        en: "2.Bf4: the London signature — the bishop develops before e3 to avoid the usual blockage.",
      },
    },
    {
      afterMoveIndex: 10,
      text: {
        fr: "Ce5 : le cavalier occupe une case centrale forte avant les échanges de fous.",
        en: "Ne5: the knight occupies a strong central square before the bishop trades.",
      },
    },
    {
      afterMoveIndex: 17,
      text: {
        fr: "…Cbd7 : les noirs développent ; la tension e4–d5 structure le milieu de partie.",
        en: "…Nbd7: Black develops; the e4/d5 tension shapes the middlegame.",
      },
    },
    {
      afterMoveIndex: 33,
      text: {
        fr: "…O-O-O : roques opposés — la partie s’oriente vers l’attaque sur les ailes.",
        en: "…O-O-O: opposite-side castling — play turns toward wing attacks.",
      },
    },
    {
      afterMoveIndex: 54,
      text: {
        fr: "Txe5 : les blancs reprennent sur e5 avec la tour — les colonnes centrales s’ouvrent vers le roi noir.",
        en: "Rxe5: White recaptures on e5 with the rook — central files open toward the black king.",
      },
    },
    {
      afterMoveIndex: 64,
      text: {
        fr: "Dxd5 : la dame récupère le pion d et la partie est gagnante pour les blancs.",
        en: "Qxd5: the queen recovers the d-pawn and White is winning.",
      },
    },
  ],
  challenges: [
    {
      id: "prague-1908-rcxd5",
      afterMoveCount: 62,
      correctUci: "c5d5",
      prompt: {
        fr: "La tour blanche est en c5, le pion noir en d5. Quel coup des blancs, joué dans la partie, capture sur d5 avec la tour ?",
        en: "White’s rook is on c5, Black’s pawn on d5. Which White move, as played, captures on d5 with the rook?",
      },
      wrongChoices: ["e5d5", "c5c6", "c5b5"],
      hints: [
        {
          fr: "Seule la tour en c5 peut prendre directement le pion d5.",
          en: "Only the rook on c5 can capture the d5-pawn directly.",
        },
        {
          fr: "C’est une prise sur la même colonne que la tour.",
          en: "It’s a capture along the rook’s file.",
        },
      ],
      insight: {
        fr: "Txd5 : les blancs éliminent le pion central et ouvrent la colonne pour la dame en b3.",
        en: "Rxd5: White removes the central pawn and opens lines toward the queen on b3.",
      },
    },
  ],
};

export default meta;
