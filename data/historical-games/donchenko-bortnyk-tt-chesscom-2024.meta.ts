import pgn from "./donchenko-bortnyk-tt-chesscom-2024.pgn";
import type { HistoricalGameMeta } from "@/lib/historical-games-loader";

const meta: HistoricalGameMeta = {
  openingId: "alekhine-defense",
  pgn,
  event: {
    fr: "Titled Tuesday (Chess.com), session internationale — ronde 9",
    en: "Titled Tuesday (Chess.com), international late — round 9",
  },
  anecdote: {
    fr: "Même famille B02 (2.Cc3 d5) que Karlsbad 1923 : une partie de blitz moderne où les blancs tentent le jeu d’attaque au roi, mais les noirs terminent par un mat de dame sur c1.",
    en: "Same B02 family (2.Nc3 d5) as Karlsbad 1923: a modern blitz game where White goes for a king attack, but Black finishes with a queen mate on c1.",
  },
  annotations: [
    {
      afterMoveIndex: 8,
      text: {
        fr: "Cxd5 : sacrifice de cavalier pour ouvrir le centre — les blancs espèrent une initiative après Dxd4.",
        en: "Nxd5: knight sacrifice to open the center — White hopes for initiative after Qxd4.",
      },
    },
    {
      afterMoveIndex: 18,
      text: {
        fr: "O-O-O : les blancs roquent long pour attaquer sur l’aile roi ; le roi noir est encore au centre.",
        en: "O-O-O: White castles long to attack on the kingside; Black’s king is still central.",
      },
    },
    {
      afterMoveIndex: 20,
      text: {
        fr: "Dh4 : la dame s’aligne sur h4 pour presser le roi noir — jeu typique de la partie d’attaque.",
        en: "Qh4: the queen lines up on h4 to pressure the black king — typical attacking play.",
      },
    },
    {
      afterMoveIndex: 26,
      text: {
        fr: "dxc6 : structure avec pion c passé pour les blancs, mais la dame noire reste ultra-active.",
        en: "dxc6: White gets a c-passer, but Black’s queen stays extremely active.",
      },
    },
    {
      afterMoveIndex: 34,
      text: {
        fr: "Td8+ ! : sacrifice de tour pour dévier la tour noire — dernière chance tactique des blancs.",
        en: "Rd8+!: rook sacrifice to deflect Black’s rook — White’s last tactical chance.",
      },
    },
    {
      afterMoveIndex: 43,
      text: {
        fr: "Dc1# : mat de la dame sur la première rangée — les blancs ne peuvent plus parer.",
        en: "Qc1#: back-rank queen mate — White has no defense.",
      },
    },
  ],
  challenges: [
    {
      id: "chesscom-2024-rd8",
      afterMoveCount: 34,
      correctUci: "d1d8",
      prompt: {
        fr: "Les noirs viennent de jouer …Cc4. Quel coup des blancs avec la tour en d1 force immédiatement la prise en d8 ?",
        en: "Black has just played …Nc4. Which White move with the rook on d1 forces an immediate capture on d8?",
      },
      wrongChoices: ["d1d7", "d1d6", "d1e1"],
      hints: [
        {
          fr: "C’est un sacrifice de tour sur la huitième rangée avec échec.",
          en: "It’s a rook sacrifice on the eighth rank with check.",
        },
        {
          fr: "La tour blanche va sur la case du roi noir en échec.",
          en: "The white rook goes to the black king’s square with check.",
        },
      ],
      insight: {
        fr: "Td8+ : les blancs espèrent désorganiser la coordination noire ; Bortnyk reprend tout de même la partie avec la contre-attaque.",
        en: "Rd8+: White tries to scramble Black’s coordination; Bortnyk still takes over with counterplay.",
      },
    },
  ],
};

export default meta;
