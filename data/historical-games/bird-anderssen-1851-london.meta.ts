import pgn from "./bird-anderssen-1851-london.pgn";
import type { HistoricalGameMeta } from "@/lib/historical-games-loader";

const meta: HistoricalGameMeta = {
  openingId: "spanish-opening",
  pgn,
  event: {
    fr: "Tournoi international de Londres (London2)",
    en: "London international tournament (London2)",
  },
  anecdote: {
    fr: "Lors du premier grand tournoi international à Londres en 1851, Bird bat Anderssen dans une Espagnole fougueuse (ECO C65) : roques opposés et finale où les blancs convertissent l’avantage.",
    en: "At the first major international tournament in London, 1851, Bird defeated Anderssen in a sharp Spanish (ECO C65): opposite-side castling and a finish where White converts the edge.",
  },
  annotations: [
    {
      afterMoveIndex: 5,
      text: {
        fr: "3…Cf6 : la défense berlinoise apparaît déjà — la partie reste dans le répertoire espagnol moderne.",
        en: "3…Nf6: the Berlin Defense appears — still within today’s Spanish repertoire.",
      },
    },
    {
      afterMoveIndex: 9,
      text: {
        fr: "5.Cxd4 exd4 : le centre s’ouvre ; les blancs auront la paire de fous et des lignes pour la dame.",
        en: "5.Nxd4 exd4: the center opens; White keeps the bishop pair and lines for the queen.",
      },
    },
    {
      afterMoveIndex: 23,
      text: {
        fr: "12…O-O-O : les noirs roquent long ; la lutte se joue sur les deux ailes avec la dame blanche déjà active.",
        en: "12…O-O-O: Black castles long; the fight runs on both wings with White’s queen already active.",
      },
    },
    {
      afterMoveIndex: 24,
      text: {
        fr: "13.Dxa7 ! : la dame capture le pion a7 — gain matériel dans une position encore très tactique.",
        en: "13.Qxa7!: the queen snaps the a7-pawn — material gain in a still-tactical position.",
      },
    },
    {
      afterMoveIndex: 76,
      text: {
        fr: "c7 ! : le pion c bondit vers la promotion et fixe la défense noire — la partie bascule clairement pour les blancs.",
        en: "c7!: the c-pawn races toward promotion and ties Black down — White’s advantage is decisive.",
      },
    },
  ],
  challenges: [
    {
      id: "bird-1851-qxa7",
      afterMoveCount: 24,
      correctUci: "d4a7",
      prompt: {
        fr: "Les noirs viennent de roquer long (…O-O-O). Quel coup des blancs, joué dans la partie, saisit immédiatement du matériel à l’aile dame ?",
        en: "Black has just castled long (…O-O-O). Which White move, as played in the game, grabs material on the queenside right away?",
      },
      wrongChoices: ["d4b6", "d4e5", "d4c4"],
      hints: [
        {
          fr: "La dame en d4 peut attaquer le pion le plus avancé de l’aile dame noire en une case.",
          en: "The queen on d4 can attack Black’s most advanced queenside pawn in one go.",
        },
        {
          fr: "Ce n’est pas un échec : c’est une prise de pion sur la 7ᵉ rangée.",
          en: "It’s not a check — it’s capturing a pawn on the 7th rank.",
        },
      ],
      insight: {
        fr: "13.Dxa7 : les blancs prennent un pion tout en gardant la dame très active dans la position à roques opposés.",
        en: "13.Qxa7: White grabs a pawn while keeping the queen very active in an opposite-castling middlegame.",
      },
    },
  ],
};

export default meta;
