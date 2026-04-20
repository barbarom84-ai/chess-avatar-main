import pgn from "./bogoljubow-alekhine-karlsbad-1923.pgn";
import type { HistoricalGameMeta } from "@/lib/historical-games-loader";

const meta: HistoricalGameMeta = {
  openingId: "alekhine-defense",
  pgn,
  event: {
    fr: "Tournoi international de maîtres, Karlsbad 1923 — ronde 10",
    en: "Karlsbad 1923 International Masters — round 10",
  },
  anecdote: {
    fr: "Une Alekhine (ECO B02) où les blancs choisissent 2.Cc3 au lieu de 2.e5 : la partie reste tranchante et Alekhine convertit une attaque de roi.",
    en: "An Alekhine (ECO B02) where White opts for 2.Nc3 instead of 2.e5: the game stays sharp and Alekhine converts a kingside attack.",
  },
  annotations: [
    {
      afterMoveIndex: 2,
      text: {
        fr: "2.Cc3 : alternative à 2.e5 — les blancs gardent la tension centrale et évitent la ligne principale à quatre pions.",
        en: "2.Nc3: an alternative to 2.e5 — White keeps central tension and sidesteps the main Four Pawns Attack.",
      },
    },
    {
      afterMoveIndex: 12,
      text: {
        fr: "Fxc6 bxc6 : structure avec pions doublés c pour les noirs — compensation typique Alekhine : cases d5 et jeu dynamique.",
        en: "Bxc6 bxc6: doubled c-pawns for Black — classic Alekhine compensation: d5 squares and dynamic play.",
      },
    },
    {
      afterMoveIndex: 14,
      text: {
        fr: "e6 ! : le pion blanc en e6 gêne le développement noir et crée des cases faibles autour du roi.",
        en: "e6!: White’s e-pawn wedge cramps Black and creates holes near the king.",
      },
    },
    {
      afterMoveIndex: 20,
      text: {
        fr: "Cg5 : le cavalier attaque e6 et presse le roi noir avant que la structure se stabilise.",
        en: "Ng5: the knight hits e6 and pressures the black king before the structure stabilizes.",
      },
    },
    {
      afterMoveIndex: 56,
      text: {
        fr: "Cxf8 : les blancs prennent la tour en f8, mais la position reste floue ; Alekhine garde des ressources tactiques sur l’aile roi.",
        en: "Nxf8: White wins the rook on f8, yet the position stays messy; Alekhine keeps tactical resources on the kingside.",
      },
    },
    {
      afterMoveIndex: 102,
      text: {
        fr: "Ce5 : ultime ressort des blancs au centre ; les noirs reprennent à la tour et le roi blanc ne tient plus.",
        en: "Ne5: White’s last central try; Black answers with the rook and the white king collapses.",
      },
    },
  ],
  challenges: [
    {
      id: "karlsbad-1923-nxf8",
      afterMoveCount: 56,
      correctUci: "g6f8",
      prompt: {
        fr: "Les noirs viennent de jouer …Df7. Quel coup des blancs avec le cavalier en g6 capture la tour en f8 ?",
        en: "Black has just played …Qf7. Which White move with the knight on g6 captures the rook on f8?",
      },
      wrongChoices: ["g6h8", "g6e7", "g6h4"],
      hints: [
        {
          fr: "Le cavalier peut prendre la tour sur f8 — ce n’est ni une retraite ni une case sur la colonne h pour la tour.",
          en: "The knight can capture the rook on f8 — not a retreat or a hop to an h-file square for the rook.",
        },
        {
          fr: "Pense « prise sur f8 » avec le cavalier.",
          en: "Think “capture on f8” with the knight.",
        },
      ],
      insight: {
        fr: "Cxf8 : les blancs gagnent la tour, mais la partie reste tactique — la conversion demande encore de la précision des deux côtés.",
        en: "Nxf8: White wins the rook, but the game stays tactical — both sides still need accuracy.",
      },
    },
  ],
};

export default meta;
