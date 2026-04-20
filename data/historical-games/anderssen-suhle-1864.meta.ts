import pgn from "./anderssen-suhle-1864.pgn";
import type { HistoricalGameMeta } from "@/lib/historical-games-loader";

const meta: HistoricalGameMeta = {
  openingId: "sicilian-defense",
  pgn,
  event: {
    fr: "Match de parties amicales, Berlin (ronde 3)",
    en: "Casual match, Berlin (round 3)",
  },
  anecdote: {
    fr: "Série de parties à Berlin en 1864 entre Anderssen et Suhle ; cette Sicilienne (ECO B20) montre 2.Fc4 puis un milieu de jeu tactique où les blancs exploitent la colonne ouverte.",
    en: "A 1864 Berlin match between Anderssen and Suhle; this Sicilian (ECO B20) features 2.Bc4 and a tactical middlegame where White exploits the open lines.",
  },
  annotations: [
    {
      afterMoveIndex: 1,
      text: {
        fr: "1…c5 : la défense sicilienne — les noirs évitent la symétrie e5 et visent un jeu dynamique.",
        en: "1…c5: the Sicilian — Black avoids the e5 symmetry and aims for dynamic play.",
      },
    },
    {
      afterMoveIndex: 2,
      text: {
        fr: "2.Fc4 : variante rare (au lieu de 2.Cf3 ou 2.c3) — développement du fou vers la grande diagonale avant le choc central.",
        en: "2.Bc4: a rare line (instead of 2.Nf3 or 2.c3) — developing the bishop toward the long diagonal before central tension.",
      },
    },
    {
      afterMoveIndex: 21,
      text: {
        fr: "…O-O : les noirs roquent ; la structure e6–d5 échangée laisse des cases claires pour les pièces.",
        en: "…O-O: Black castles; the traded e6/d5 center leaves light-square play for the pieces.",
      },
    },
    {
      afterMoveIndex: 44,
      text: {
        fr: "Fd3 : le fou revient en diagonale active vers le roi noir, coordonné avec les tours sur la colonne d.",
        en: "Bd3: the bishop returns on an active diagonal toward the Black king, coordinated with rooks on the d-file.",
      },
    },
    {
      afterMoveIndex: 45,
      text: {
        fr: "…c4 : rupture à l’aile dame ; les noirs cherchent du contre-jeu mais la position reste tendue.",
        en: "…c4: queenside break; Black seeks counterplay but the position stays sharp.",
      },
    },
    {
      afterMoveIndex: 62,
      text: {
        fr: "Cxh5+ ! : le cavalier prend en h5 avec échec — les blancs ramassent un pion et gardent l’attaque.",
        en: "Nxh5+!: the knight snaps on h5 with check — White picks up a pawn and keeps the initiative.",
      },
    },
  ],
  challenges: [
    {
      id: "anderssen-1864-nxh5",
      afterMoveCount: 62,
      correctUci: "f6h5",
      prompt: {
        fr: "Les noirs viennent de jouer …Fe3. Comment Anderssen continue-t-il immédiatement avec le cavalier en f6 ?",
        en: "Black has just played …Be3. How does Anderssen continue immediately with the knight on f6?",
      },
      wrongChoices: ["f6h7", "f6g4", "f6e4"],
      hints: [
        {
          fr: "Le cavalier peut donner échec tout en prenant un pion avancé sur l’aile roi.",
          en: "The knight can give check while capturing an advanced pawn on the kingside.",
        },
        {
          fr: "Pense à une case sur la colonne h, pas à un recul défensif.",
          en: "Think of a square on the h-file, not a defensive retreat.",
        },
      ],
      insight: {
        fr: "Cxh5+ : fourchette tactique typique — échec et gain de matériel avant de reprendre l’initiative sur le roi noir.",
        en: "Nxh5+: a typical tactical fork — check and material gain while keeping pressure on the black king.",
      },
    },
  ],
};

export default meta;
