import pgn from "./dovliatov-mamedyarov-baku-2006.pgn";
import type { HistoricalGameMeta } from "@/lib/historical-games-loader";

const meta: HistoricalGameMeta = {
  openingId: "alekhine-defense",
  pgn,
  event: {
    fr: "President’s Cup de Bakou 2006 — ronde 5",
    en: "2006 Baku President’s Cup — round 5",
  },
  anecdote: {
    fr: "Alekhine moderne (2.e5 Cd5, fianchetto roi) : Mamedyarov accepte une structure avec pions c doublés et un jeu tactique où la dame et le fou g7 décident vite.",
    en: "Modern Alekhine (2.e5 Nd5, kingside fianchetto): Mamedyarov accepts doubled c-pawns and sharp play where the queen and Bg7 decide quickly.",
  },
  annotations: [
    {
      afterMoveIndex: 3,
      text: {
        fr: "…Cd5 : la tabiya de l’Alekhine — le cavalier bloque le pion d4 futur et garde la case f6 pour le roi.",
        en: "…Nd5: the Alekhine tabiya — the knight blocks the future d-pawn and keeps f6 for the king.",
      },
    },
    {
      afterMoveIndex: 12,
      text: {
        fr: "bxc3 : les blancs ont des pions c doublés — compensation typique pour les noirs : cases d5 et pièces actives.",
        en: "bxc3: White has doubled c-pawns — typical Black compensation: d5 squares and active pieces.",
      },
    },
    {
      afterMoveIndex: 23,
      text: {
        fr: "…Dxc3 : la dame noire s’invite en territoire blanc ; les blancs doivent montrer du jeu concret (Ff4, tours).",
        en: "…Qxc3: Black’s queen invades; White must show concrete play (Bf4, rooks).",
      },
    },
    {
      afterMoveIndex: 32,
      text: {
        fr: "Fxg7 : le fou blanc casse le fianchetto noir — le roi noir est exposé même après la reprise en g7.",
        en: "Bxg7: White smashes the fianchetto — the black king is loose even after recaptures.",
      },
    },
    {
      afterMoveIndex: 48,
      text: {
        fr: "Dxb6 : la dame blanche cueille un pion, mais les noirs gardent la coordination (dame + cavalier + colonnes ouvertes).",
        en: "Qxb6: White grabs a pawn, but Black keeps coordination (queen + knight + open files).",
      },
    },
    {
      afterMoveIndex: 53,
      text: {
        fr: "Cf3+ ! : fourchette roi–dame ; la position blanche s’effondre.",
        en: "Nf3+!: a king-and-queen fork; White’s position collapses.",
      },
    },
  ],
  challenges: [
    {
      id: "baku-2006-bxg7",
      afterMoveCount: 32,
      correctUci: "h6g7",
      prompt: {
        fr: "Les noirs viennent de jouer …Fxa2. Comment les blancs continuent-ils avec le fou en h6 dans la partie ?",
        en: "Black has just played …Bxa2. How did White continue with the bishop on h6 in the game?",
      },
      wrongChoices: ["h6g5", "h6f4", "h6e3"],
      hints: [
        {
          fr: "Le fou attaque le pion g7 défendu par le roi — une prise qui ouvre le roi noir.",
          en: "The bishop hits the g7-pawn defended by the king — a capture that exposes Black’s king.",
        },
        {
          fr: "Ce n’est pas une retraite en diagonale vers le centre : c’est une capture sur la case g7.",
          en: "Not a retreat toward the center — it’s a capture on g7.",
        },
      ],
      insight: {
        fr: "Fxg7 : échange de fous où les blancs espèrent le jeu d’attaque ; Mamedyarov garde malgré tout l’initiative grâce à la dame active.",
        en: "Bxg7: a bishop trade where White hopes for attack; Mamedyarov still keeps initiative thanks to his active queen.",
      },
    },
  ],
};

export default meta;
