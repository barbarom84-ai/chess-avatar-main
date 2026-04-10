import { getOpeningById, type Opening } from "@/lib/openings-library";
import steinitzZukertort1886R14Pgn from "@/data/historical-games/steinitz-zukertort-1886-wch-r14.pgn";
import birdAnderssen1851LondonPgn from "@/data/historical-games/bird-anderssen-1851-london.pgn";
import anderssenSuhle1864Pgn from "@/data/historical-games/anderssen-suhle-1864.pgn";
import hebertSeirawan1982LuzernPgn from "@/data/historical-games/hebert-seirawan-1982-luzern.pgn";
import bogoljubowAlekhineKarlsbad1923Pgn from "@/data/historical-games/bogoljubow-alekhine-karlsbad-1923.pgn";
import dovliatovMamedyarovBaku2006Pgn from "@/data/historical-games/dovliatov-mamedyarov-baku-2006.pgn";
import donchenkoBortnykTtChesscom2024Pgn from "@/data/historical-games/donchenko-bortnyk-tt-chesscom-2024.pgn";
import maroczySpielmannPrague1908Pgn from "@/data/historical-games/maroczy-spielmann-prague-1908.pgn";
import { pgnBlockToUciMoves } from "@/lib/pgn-to-uci";

const STEINITZ_ZUKERTORT_1886_R14_UCI: string[] = (() => {
  const u = pgnBlockToUciMoves(steinitzZukertort1886R14Pgn);
  if (!u) {
    throw new Error("PGN invalide : data/historical-games/steinitz-zukertort-1886-wch-r14.pgn");
  }
  return u;
})();

const BIRD_ANDERSSEN_1851_LONDON_UCI: string[] = (() => {
  const u = pgnBlockToUciMoves(birdAnderssen1851LondonPgn);
  if (!u) {
    throw new Error("PGN invalide : data/historical-games/bird-anderssen-1851-london.pgn");
  }
  return u;
})();

const ANDERSSEN_SUHLE_1864_UCI: string[] = (() => {
  const u = pgnBlockToUciMoves(anderssenSuhle1864Pgn);
  if (!u) {
    throw new Error("PGN invalide : data/historical-games/anderssen-suhle-1864.pgn");
  }
  return u;
})();

const HEBERT_SEIRAWAN_1982_LUZERN_UCI: string[] = (() => {
  const u = pgnBlockToUciMoves(hebertSeirawan1982LuzernPgn);
  if (!u) {
    throw new Error("PGN invalide : data/historical-games/hebert-seirawan-1982-luzern.pgn");
  }
  return u;
})();

const BOGOLJUBOW_ALEKHINE_KARLSBAD_1923_UCI: string[] = (() => {
  const u = pgnBlockToUciMoves(bogoljubowAlekhineKarlsbad1923Pgn);
  if (!u) {
    throw new Error("PGN invalide : data/historical-games/bogoljubow-alekhine-karlsbad-1923.pgn");
  }
  return u;
})();

const DOVLIATOV_MAMEDYAROV_BAKU_2006_UCI: string[] = (() => {
  const u = pgnBlockToUciMoves(dovliatovMamedyarovBaku2006Pgn);
  if (!u) {
    throw new Error("PGN invalide : data/historical-games/dovliatov-mamedyarov-baku-2006.pgn");
  }
  return u;
})();

const DONCHENKO_BORTNYK_TT_CHESSCOM_2024_UCI: string[] = (() => {
  const u = pgnBlockToUciMoves(donchenkoBortnykTtChesscom2024Pgn);
  if (!u) {
    throw new Error("PGN invalide : data/historical-games/donchenko-bortnyk-tt-chesscom-2024.pgn");
  }
  return u;
})();

const MAROCZY_SPIELMANN_PRAGUE_1908_UCI: string[] = (() => {
  const u = pgnBlockToUciMoves(maroczySpielmannPrague1908Pgn);
  if (!u) {
    throw new Error("PGN invalide : data/historical-games/maroczy-spielmann-prague-1908.pgn");
  }
  return u;
})();

export type LocalizedString = { fr: string; en: string };

export interface ModelMoveComment {
  uci: string;
  comment: LocalizedString;
}

/** Coup à deviner : position après uciMoves[0..afterMoveCount-1], le coup joué dans la partie est uciMoves[afterMoveCount]. */
export interface MoveChallenge {
  id: string;
  afterMoveCount: number;
  prompt: LocalizedString;
  correctUci: string;
  wrongChoices: string[];
  hints: LocalizedString[];
  insight: LocalizedString;
}

export interface HistoricalGame {
  id: string;
  white: string;
  black: string;
  result: string;
  date: string;
  event: LocalizedString;
  uciMoves: string[];
  annotations: { afterMoveIndex: number; text: LocalizedString }[];
  /** Contexte ou anecdote sur le cadre de la partie. */
  anecdote?: LocalizedString;
  challenges?: MoveChallenge[];
}

export interface OpeningVariant {
  id: string;
  title: LocalizedString;
  description?: LocalizedString;
  line: ModelMoveComment[];
}

export interface OpeningLesson {
  openingId: string;
  hook: LocalizedString;
  recommendedFor: LocalizedString;
  overview: LocalizedString;
  mainIdeas: LocalizedString[];
  typicalPlans: LocalizedString[];
  traps: LocalizedString[];
  whatToRemember: LocalizedString[];
  modelLine: ModelMoveComment[];
  /** Branches nommées (Giuoco Piano, Evans, etc.). */
  variants?: OpeningVariant[];
  historicalGames: HistoricalGame[];
}

export const OPENING_LESSONS: OpeningLesson[] = [
  {
    openingId: "italian-game",
    hook: {
      fr: "Développement logique et combat central — idéal pour comprendre les fondamentaux.",
      en: "Sound development and central tension — ideal for learning fundamentals.",
    },
    recommendedFor: {
      fr: "Débutants à joueurs de club (~800–1800). La théorie reste abordable ; la compréhension positionnelle prime.",
      en: "Beginners through club players (~800–1800). Theory stays manageable; positional understanding matters most.",
    },
    overview: {
      fr: "Après 1.e4 e5 2.Cf3 Cc6, le fou en c4 vise f7 et appuie le centre. Les blancs cherchent souvent d3 puis le roc court, parfois c3 et d4 pour ouvrir le centre. Les noirs réagissent par …F6, …d5 tactique, ou défense à deux fianchetti.",
      en: "After 1.e4 e5 2.Nf3 Nc6, Bc4 eyes f7 and supports the center. White often plays d3 and short castle, sometimes c3 and d4 to open the center. Black answers with …Bc5, …Nf6, a timely …d5, or double fianchetto systems.",
    },
    mainIdeas: [
      {
        fr: "Contrôler le centre et développer sans perdre de temps.",
        en: "Control the center and develop without wasting time.",
      },
      {
        fr: "La case f7 (et f2 côté noir) reste une cible tactique classique.",
        en: "The f7 square (and f2 for Black) remains a classic tactical target.",
      },
      {
        fr: "Selon la variante, viser d2–d4 ou au contraire garder la tension avec d3.",
        en: "Depending on the line, aim for d2–d4 or keep tension with d3.",
      },
    ],
    typicalPlans: [
      {
        fr: "Blancs : c3, d4, ou Je2–g3 avec roc et pression sur le roi noir.",
        en: "White: c3 and d4, or Ng2–g3 with castling and kingside pressure.",
      },
      {
        fr: "Noirs : …F5 actif, …d5 central, ou jeu solide …F6 / …d6.",
        en: "Black: active …Bc5, central …d5, or solid …Be7 / …d6.",
      },
    ],
    traps: [
      {
        fr: "Ne pas jouer mécaniquement Cg5 si les noirs peuvent répondre …Cxe4 avec tempo (selon position).",
        en: "Do not blindly play Bg5 if Black can answer …Nxe4 with tempo (position-dependent).",
      },
      {
        fr: "Attention aux fourchettes Cd4–c2+ après coups trop lents en développement.",
        en: "Watch for Nd4–Nc2+ forks after slow development.",
      },
    ],
    whatToRemember: [
      {
        fr: "La partie italienne enseigne les plans plus que la mémorisation de coups.",
        en: "The Italian teaches plans more than rote memorization.",
      },
    ],
    modelLine: [
      { uci: "e2e4", comment: { fr: "Ouverture du centre.", en: "Open the center." } },
      { uci: "e7e5", comment: { fr: "Réponse symétrique classique.", en: "Classical symmetrical reply." } },
      { uci: "g1f3", comment: { fr: "Développement du cavalier vers le centre.", en: "Develop the knight toward the center." } },
      { uci: "b8c6", comment: { fr: "Défend e5 et développe.", en: "Defends e5 and develops." } },
      { uci: "f1c4", comment: { fr: "Fou actif, pression latente sur f7.", en: "Active bishop, latent pressure on f7." } },
      { uci: "f8c5", comment: { fr: "Contre-attaque naturelle sur f2.", en: "Natural counterplay against f2." } },
      { uci: "c2c3", comment: { fr: "Prépare d4 avec solidité.", en: "Prepares d4 on solid footing." } },
      { uci: "g8f6", comment: { fr: "Développement et attaque sur e4.", en: "Development and pressure on e4." } },
    ],
    variants: [
      {
        id: "giuoco-piano",
        title: { fr: "Giuoco Piano (calme)", en: "Giuoco Piano (quiet)" },
        description: {
          fr: "…Fc5 puis c3 et d3 : jeu positionnel, souvent roc court des deux côtés.",
          en: "…Bc5 then c3 and d3: positional play, often both sides castle short.",
        },
        line: [
          { uci: "e2e4", comment: { fr: "1.e4", en: "1.e4" } },
          { uci: "e7e5", comment: { fr: "1…e5", en: "1…e5" } },
          { uci: "g1f3", comment: { fr: "2.Cf3", en: "2.Nf3" } },
          { uci: "b8c6", comment: { fr: "2…Cc6", en: "2…Nc6" } },
          { uci: "f1c4", comment: { fr: "3.Fc4", en: "3.Bc4" } },
          { uci: "f8c5", comment: { fr: "3…Fc5 Giuoco Piano.", en: "3…Bc5 Giuoco Piano." } },
          { uci: "c2c3", comment: { fr: "4.c3 : prépare d4 sans affaiblir d3.", en: "4.c3: prepares d4 without weakening d3." } },
          { uci: "g8f6", comment: { fr: "4…Cf6", en: "4…Nf6" } },
          { uci: "d2d3", comment: { fr: "5.d3 : ligne tranquille, idées d’a3–b4 ou Fg5.", en: "5.d3: quiet line, ideas of a3–b4 or Bg5." } },
        ],
      },
      {
        id: "evans-branch",
        title: { fr: "Branche Gambit Evans (aperçu)", en: "Evans Gambit branch (preview)" },
        description: {
          fr: "Après 4.c3 les blancs peuvent jouer 5.b4 — sacrifice de pion pour initiative (fiche dédiée : Gambit Evans).",
          en: "After 4.c3 White may play 5.b4 — pawn sacrifice for initiative (see Evans Gambit lesson).",
        },
        line: [
          { uci: "e2e4", comment: { fr: "1.e4", en: "1.e4" } },
          { uci: "e7e5", comment: { fr: "1…e5", en: "1…e5" } },
          { uci: "g1f3", comment: { fr: "2.Cf3", en: "2.Nf3" } },
          { uci: "b8c6", comment: { fr: "2…Cc6", en: "2…Nc6" } },
          { uci: "f1c4", comment: { fr: "3.Fc4", en: "3.Bc4" } },
          { uci: "f8c5", comment: { fr: "3…Fc5", en: "3…Bc5" } },
          { uci: "b2b4", comment: { fr: "4.b4 ! Gambit Evans (transposition si …Fxb4).", en: "4.b4 Evans Gambit (transposes if …Bxb4)." } },
        ],
      },
    ],
    historicalGames: [
      {
        id: "opera-1858",
        white: "Paul Morphy",
        black: "Duke Karl / Count Isouard",
        result: "1-0",
        date: "1858",
        event: {
          fr: "Partie d’opéra (Paris)",
          en: "Opera Game (Paris)",
        },
        anecdote: {
          fr: "On raconte que la consultation noire jouait depuis une loge du théâtre pendant une représentation — d’où le nom. Morphy illustre développement rapide et combinaison finale spectaculaire.",
          en: "Legend says Black’s team played from a theatre box during a performance — hence the name. Morphy shows rapid development and a spectacular mating combination.",
        },
        uciMoves: [
          "e2e4",
          "e7e5",
          "g1f3",
          "d7d6",
          "d2d4",
          "c8g4",
          "d4e5",
          "g4f3",
          "d1f3",
          "d6e5",
          "f1c4",
          "g8f6",
          "f3b3",
          "d8e7",
          "b1c3",
          "c7c6",
          "c1g5",
          "b7b5",
          "c3b5",
          "c6b5",
          "c4b5",
          "b8d7",
          "e1c1",
          "a8d8",
          "d1d7",
          "d8d7",
          "h1d1",
          "e7e6",
          "b5d7",
          "f6d7",
          "b3b8",
          "d7b8",
          "d1d8",
        ],
        annotations: [
          {
            afterMoveIndex: 3,
            text: {
              fr: "Philidor …d6 : solide mais la case d4 reste faible ; …Fg4 se révèle fragile.",
              en: "Philidor …d6: solid but d4 remains weak; …Bg4 proves loose.",
            },
          },
          {
            afterMoveIndex: 7,
            text: {
              fr: "Les blancs récupèrent un pion avec la dame en f3 — avance au développement.",
              en: "White regains a pawn with Qf3 — ahead in development.",
            },
          },
          {
            afterMoveIndex: 15,
            text: {
              fr: "Fc4 et Fg5 : pièces actives ; …b5 cherche de la tactique mais affaiblit la structure.",
              en: "Bc4 and Bg5: active pieces; …b5 seeks tactics but weakens the structure.",
            },
          },
          {
            afterMoveIndex: 25,
            text: {
              fr: "Tdxd7 : les tours et le fou créent une attaque de batterie sur la colonne d.",
              en: "Rxd7: rooks and bishop build a battery on the d-file.",
            },
          },
          {
            afterMoveIndex: 27,
            text: {
              fr: "…Fe6 : dernier espoir d’échanger dames ; Morphy préfère le coup d’éclat.",
              en: "…Qe6: last hope to trade queens; Morphy prefers the brilliancy.",
            },
          },
          {
            afterMoveIndex: 30,
            text: {
              fr: "Dxb8+ ! sacrifice de dame pour le mat à la tour — le « mat de l’opéra ».",
              en: "Qxb8+! queen sacrifice for rook mate — the “Opera mate”.",
            },
          },
        ],
        challenges: [
          {
            id: "opera-nxb5",
            afterMoveCount: 17,
            correctUci: "c3b5",
            prompt: {
              fr: "Les noirs viennent de pousser …b5. Quel coup joua Morphy au lieu de reculer le fou ?",
              en: "Black just pushed …b5. What did Morphy play instead of retreating the bishop?",
            },
            wrongChoices: ["c4b5", "g5f6", "c4d3"],
            hints: [
              {
                fr: "Le fou en c4 est attaqué, mais une pièce peut prendre en b5 avec fourchette sur c7 et e8.",
                en: "The c4 bishop is attacked, but a piece can take on b5 with a fork motif.",
              },
              {
                fr: "C’est un sacrifice de cavalier pour ouvrir lignes vers le roi noir.",
                en: "It’s a knight sacrifice to open lines toward the black king.",
              },
            ],
            insight: {
              fr: "10.Cxb5 ! : les blancs acceptent de perdre un cavalier pour garder l’initiative et viser le roi.",
              en: "10.Nxb5!: White sacrifices the knight to keep the initiative and target the king.",
            },
          },
          {
            id: "opera-qb8",
            afterMoveCount: 30,
            correctUci: "b3b8",
            prompt: {
              fr: "Après Fxd7+ Cxd7, comment Morphy termine la partie en beauté ?",
              en: "After Bxd7+ Nxd7, how did Morphy finish in style?",
            },
            wrongChoices: ["b3e6", "b3b5", "d1d5"],
            hints: [
              {
                fr: "Pense « sacrifice de la dame » pour dévier une pièce noire et livrer mat à la tour.",
                en: "Think “queen sacrifice” to deflect a black piece and mate with the rook.",
              },
              {
                fr: "La case b8 est la clé : la dame se laisse prendre par le cavalier.",
                en: "b8 is the key square: the queen allows herself to be taken by the knight.",
              },
            ],
            insight: {
              fr: "16.Dxb8+ ! Cxb8 17.Td8# : le roi est maté par la tour seule après la déviation du cavalier.",
              en: "16.Qxb8+! Nxb8 17.Rd8#: mate by the rook alone after the knight is deflected.",
            },
          },
        ],
      },
    ],
  },
  {
    openingId: "spanish-opening",
    hook: {
      fr: "La ligne la plus étudiée au monde — structure riche et plans de longue haleine.",
      en: "The most analyzed opening in the world — rich structure and long-term plans.",
    },
    recommendedFor: {
      fr: "Joueur de club confirmé à fort niveau (~1400+). Beaucoup de théorie possible ; commencer par la variante antirey (…a6).",
      en: "Serious club players upward (~1400+). Heavy theory possible; start with the Morphy …a6 line.",
    },
    overview: {
      fr: "Le Fb5 épinglette le cavalier c6 et demande aux noirs de montrer leur plan : …a6, défense steinitz, berlinese, ou structures fermées. Les blancs visent souvent le jeu positionnel ou l’attaque des rocs opposés.",
      en: "The Ruy Lopez Bb5 pins the Nc6 and asks Black to show their plan: …a6, Steinitz, Berlin, or closed setups. White often aims for positional play or opposite-side castling attacks.",
    },
    mainIdeas: [
      {
        fr: "Maintenir la tension centrale plutôt que tout échanger trop tôt.",
        en: "Maintain central tension rather than exchanging everything early.",
      },
      {
        fr: "Les noirs peuvent accepter une structure avec pion double pour l’activité.",
        en: "Black may accept doubled pawns for piece activity.",
      },
    ],
    typicalPlans: [
      {
        fr: "Blancs : d4 ou c3/d4 selon variante ; tour e1 ; parfois a4 contre …b5.",
        en: "White: d4 or c3/d4 by line; Re1; sometimes a4 against …b5.",
      },
      {
        fr: "Noirs : …a6, …F7, …b5, jeu sur la colonne e ou contre-jeu …d5.",
        en: "Black: …a6, …b5, play on the e-file or counter with …d5.",
      },
    ],
    traps: [
      {
        fr: "Ne pas sous-estimer la défense berlinoise (parties échangées et finales).",
        en: "Do not underestimate the Berlin (exchanged pieces and endings).",
      },
    ],
    whatToRemember: [
      {
        fr: "L’Espagnole est un marathon : apprends les idées par familles de variantes.",
        en: "The Spanish is a marathon: learn ideas by family of variations.",
      },
    ],
    modelLine: [
      { uci: "e2e4", comment: { fr: "Contrôle central.", en: "Central control." } },
      { uci: "e7e5", comment: { fr: "Réponse classique.", en: "Classical reply." } },
      { uci: "g1f3", comment: { fr: "Développement.", en: "Development." } },
      { uci: "b8c6", comment: { fr: "Défense du pion e5.", en: "Defends the e5 pawn." } },
      { uci: "f1b5", comment: { fr: "Ruy Lopez : pression sur la structure noire.", en: "Ruy Lopez: pressure on Black’s structure." } },
      { uci: "a7a6", comment: { fr: "Morphy : force le fou à décider.", en: "Morphy: forces the bishop to decide." } },
      { uci: "b5a4", comment: { fr: "Maintien de l’épinglette latérale.", en: "Keeps the lateral pin idea." } },
    ],
    historicalGames: [
      {
        id: "bird-anderssen-1851-london",
        white: "Henry Edward Bird",
        black: "Adolf Anderssen",
        result: "1-0",
        date: "1851",
        event: {
          fr: "Tournoi international de Londres (London2)",
          en: "London international tournament (London2)",
        },
        anecdote: {
          fr: "Lors du premier grand tournoi international à Londres en 1851, Bird bat Anderssen dans une Espagnole fougueuse (ECO C65) : roques opposés et finale où les blancs convertissent l’avantage.",
          en: "At the first major international tournament in London, 1851, Bird defeated Anderssen in a sharp Spanish (ECO C65): opposite-side castling and a finish where White converts the edge.",
        },
        uciMoves: BIRD_ANDERSSEN_1851_LONDON_UCI,
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
      },
      {
        id: "steinitz-zukertort-1886-wch-r14",
        white: "William Steinitz",
        black: "Johannes Zukertort",
        result: "1/2-1/2",
        date: "1886-03-12",
        event: {
          fr: "Championnat du monde 1886 (États-Unis), 14ᵉ partie — nulle",
          en: "1886 World Championship (USA), game 14 — draw",
        },
        anecdote: {
          fr: "Partie réelle de la première finale du championnat du monde : ouverture espagnole, variante berlinoise (C67), comme dans le fichier PGN du dépôt.",
          en: "From the first official world championship match: Spanish Opening, Berlin Defense (C67), matching the bundled PGN in the repo.",
        },
        uciMoves: STEINITZ_ZUKERTORT_1886_R14_UCI,
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
      },
    ],
  },
  {
    openingId: "sicilian-defense",
    hook: {
      fr: "Réponse asymétrique et combative aux blancs — asymétrie = chances des deux côtés.",
      en: "Asymmetrical, fighting reply to 1.e4 — imbalance gives both sides chances.",
    },
    recommendedFor: {
      fr: "Intermédiaire (~1200+) : nécessite de connaître quelques idées contre le coup d’aile (a2–a4, structures de pions).",
      en: "Intermediate (~1200+): you need ideas vs the wing pawn (a2–a4, pawn structures).",
    },
    overview: {
      fr: "Après 1.e4 c5, les noirs contrôlent d4 sans verrouiller le centre. Les variantes Najdorf, Dragon, Sveshnikov offrent des profils très différents (tactique, attaque de rois, pions compensés).",
      en: "After 1.e4 c5, Black controls d4 without locking the center. Najdorf, Dragon, and Sveshnikov offer very different profiles.",
    },
    mainIdeas: [
      {
        fr: "Les noirs acceptent souvent un retard de développement pour une structure de pions dynamique.",
        en: "Black often accepts lagging development for a dynamic pawn structure.",
      },
      {
        fr: "Les blancs exploitent souvent l’avance d’espace à l’aile dame.",
        en: "White often exploits extra queenside space.",
      },
    ],
    typicalPlans: [
      {
        fr: "Noirs : …d6, …Cf6, parfois …a6 / …e5 selon système.",
        en: "Black: …d6, …Nf6, sometimes …a6 / …e5 by system.",
      },
    ],
    traps: [
      {
        fr: "Attention aux sacrifices typiques sur d5 ou f7 dans les lignes ouvertes.",
        en: "Watch typical sacrifices on d5 or f7 in open lines.",
      },
    ],
    whatToRemember: [
      {
        fr: "Choisis une famille (Najdorf, Dragon…) et étudie ses plans avant d’élargir.",
        en: "Pick one family (Najdorf, Dragon…) and study its plans before branching out.",
      },
    ],
    modelLine: [
      { uci: "e2e4", comment: { fr: "1.e4", en: "1.e4" } },
      { uci: "c7c5", comment: { fr: "Sicilienne : asymétrie immédiate.", en: "Sicilian: immediate imbalance." } },
      { uci: "g1f3", comment: { fr: "Développement naturel.", en: "Natural development." } },
      { uci: "d7d6", comment: { fr: "Variante « ancienne » solide.", en: "Solid ‘old’ Scheveningen-style setup." } },
      { uci: "d2d4", comment: { fr: "Les blancs attaquent le centre.", en: "White strikes at the center." } },
      { uci: "c5d4", comment: { fr: "Prise en passant structurel.", en: "Structural capture." } },
    ],
    variants: [
      {
        id: "najdorf-slice",
        title: { fr: "Aperçu Najdorf (…a6)", en: "Najdorf preview (…a6)" },
        description: {
          fr: "Après 2…d6 3.d4 cxd4 4.Cxd4 les noirs jouent …a6 pour contrôler b5.",
          en: "After 2…d6 3.d4 cxd4 4.Nxd4 Black plays …a6 to control b5.",
        },
        line: [
          { uci: "e2e4", comment: { fr: "1.e4", en: "1.e4" } },
          { uci: "c7c5", comment: { fr: "1…c5", en: "1…c5" } },
          { uci: "g1f3", comment: { fr: "2.Cf3", en: "2.Nf3" } },
          { uci: "d7d6", comment: { fr: "2…d6", en: "2…d6" } },
          { uci: "d2d4", comment: { fr: "3.d4", en: "3.d4" } },
          { uci: "c5d4", comment: { fr: "3…cxd4", en: "3…cxd4" } },
          { uci: "f3d4", comment: { fr: "4.Cxd4", en: "4.Nxd4" } },
          { uci: "g8f6", comment: { fr: "4…Cf6", en: "4…Nf6" } },
          { uci: "b1c3", comment: { fr: "5.Cc3", en: "5.Nc3" } },
          { uci: "a7a6", comment: { fr: "5…a6 Najdorf.", en: "5…a6 Najdorf." } },
        ],
      },
    ],
    historicalGames: [
      {
        id: "anderssen-suhle-1864",
        white: "Adolf Anderssen",
        black: "Berthold Suhle",
        result: "1-0",
        date: "1864",
        event: {
          fr: "Match de parties amicales, Berlin (ronde 3)",
          en: "Casual match, Berlin (round 3)",
        },
        anecdote: {
          fr: "Série de parties à Berlin en 1864 entre Anderssen et Suhle ; cette Sicilienne (ECO B20) montre 2.Fc4 puis un milieu de jeu tactique où les blancs exploitent la colonne ouverte.",
          en: "A 1864 Berlin match between Anderssen and Suhle; this Sicilian (ECO B20) features 2.Bc4 and a tactical middlegame where White exploits the open lines.",
        },
        uciMoves: ANDERSSEN_SUHLE_1864_UCI,
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
      },
      {
        id: "fischer-petrosian-1971",
        white: "Bobby Fischer",
        black: "Tigran Petrosian",
        result: "1-0",
        date: "1971",
        event: {
          fr: "Candidats (extrait thématique sicilienne)",
          en: "Candidates (Sicilian thematic excerpt)",
        },
        anecdote: {
          fr: "Lors du match des Candidats, Fischer affichait une préparation redoutable en Sicilienne ; la série de victoires a marqué l’histoire du championnat du monde.",
          en: "In the Candidates, Fischer’s Sicilian prep was fearsome; the run of wins became world-championship lore.",
        },
        uciMoves: [
          "e2e4",
          "c7c5",
          "g1f3",
          "d7d6",
          "d2d4",
          "c5d4",
          "f3d4",
          "g8f6",
          "b1c3",
          "a7a6",
          "f2f4",
        ],
        annotations: [
          {
            afterMoveIndex: 9,
            text: {
              fr: "…a6 Najdorf : les noirs gardent la tension ; les blancs poussent f4 pour l’attaque.",
              en: "…a6 Najdorf: Black keeps tension; White pushes f4 for attack.",
            },
          },
        ],
        challenges: [
          {
            id: "sic-f4",
            afterMoveCount: 10,
            correctUci: "f2f4",
            prompt: {
              fr: "Dans ce type de Najdorf, quel coup typique des blancs lance l’assaut sur l’aile roi ?",
              en: "In this Najdorf type, which typical White move starts the kingside attack?",
            },
            wrongChoices: ["f1c4", "d4b5", "e4e5"],
            hints: [
              {
                fr: "C’est une avance de pion sur l’aile roi, souvent liée à f5 ou g4 plus tard.",
                en: "It’s a kingside pawn advance, often related to f5 or g4 later.",
              },
            ],
            insight: {
              fr: "f4 : les blancs gagnent de l’espace et préparent des pièces vers g2 ou e3 selon les variantes.",
              en: "f4: White gains space and prepares pieces toward g2 or e3 depending on lines.",
            },
          },
        ],
      },
    ],
  },
  {
    openingId: "french-defense",
    hook: {
      fr: "Structure e6–d5 solide ; les noirs acceptent un cavalier parfois passif pour un centre compact.",
      en: "Solid e6–d5 structure; Black may accept a passive knight for a compact center.",
    },
    recommendedFor: {
      fr: "Débutant intermédiaire à club (~1000–2000). Comprendre les fermetures e5 est essentiel.",
      en: "Lower intermediate to club (~1000–2000). Understanding e5 closures is key.",
    },
    overview: {
      fr: "1.e4 e6 mène souvent à des positions fermées après …d5. Les plans blancs incluent e5, ed, ou Tg1 avec f4. Les noirs cherchent contre-jeu …c5 ou …f6 selon les variantes.",
      en: "1.e4 e6 often leads to closed positions after …d5. White plans include e5, exd5, or Rg1 with f4. Black seeks …c5 or …f6 counterplay.",
    },
    mainIdeas: [
      {
        fr: "La chaîne de pions d5–e6 peut être solide mais passive ; cherche les ruptures …c5, …f6.",
        en: "The d5–e6 chain can be solid but passive; look for …c5, …f6 breaks.",
      },
    ],
    typicalPlans: [
      {
        fr: "Noirs : Cd7–f6, Fd6 ou Fe7, roque court, puis …c5.",
        en: "Black: Nd7–f6, Bd6 or Be7, short castle, then …c5.",
      },
    ],
    traps: [
      {
        fr: "Ne pas jouer …d5 trop tôt sans préparer le développement (selon sous-variante).",
        en: "Do not rush …d5 without preparation (subvariation-dependent).",
      },
    ],
    whatToRemember: [
      {
        fr: "La française enseigne la patience et les ruptures de milieu de partie.",
        en: "The French teaches patience and middlegame breaks.",
      },
    ],
    modelLine: [
      { uci: "e2e4", comment: { fr: "1.e4", en: "1.e4" } },
      { uci: "e7e6", comment: { fr: "Française.", en: "French Defense." } },
      { uci: "d2d4", comment: { fr: "Prise d’espace.", en: "Grabs space." } },
      { uci: "d7d5", comment: { fr: "Challenge central.", en: "Central challenge." } },
      { uci: "e4e5", comment: { fr: "Avance : espace mais cases claires pour Cd7.", en: "Advance: space but holes for Nd7." } },
      { uci: "c7c5", comment: { fr: "Rupture classique contre la chaîne.", en: "Classic break vs the chain." } },
    ],
    historicalGames: [
      {
        id: "hebert-seirawan-1982-luzern",
        white: "Jean Hebert",
        black: "Yasser Seirawan",
        result: "0-1",
        date: "1982-11-08",
        event: {
          fr: "Olympiade de Lucerne 1982 — ronde 9 (Canada – États-Unis)",
          en: "1982 Lucerne Olympiad — round 9 (Canada vs United States)",
        },
        anecdote: {
          fr: "Partie d’équipe au plus haut niveau : une française avec 2.d3 (ligne C00) où les noirs échangent les dames tôt puis imposent un jeu de positions et de finale à la Seirawan.",
          en: "A top-team board: a French with 2.d3 (C00) where Black trades queens early and outplays White in the middlegame and ending.",
        },
        uciMoves: HEBERT_SEIRAWAN_1982_LUZERN_UCI,
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
      },
    ],
  },
  {
    openingId: "alekhine-defense",
    hook: {
      fr: "Défense hypermoderne : les noirs incitent e4–e5 pour attaquer la chaîne de pions plus tard.",
      en: "Hypermodern defense: Black tempts e4–e5 to attack the pawn chain later.",
    },
    recommendedFor: {
      fr: "Joueur tactique intermédiaire (~1300+). Il faut connaître quelques coups contre la variante « quatre pions ».",
      en: "Tactical intermediate (~1300+). Know basics vs the Four Pawns Attack.",
    },
    overview: {
      fr: "1.e4 Cf6 provoque 2.e5. Les noirs reculent le cavalier et cherchent des cases d5 et b6 affaiblies. Les blancs peuvent jouer solide (d4, f4) ou tactique.",
      en: "1.e4 Nf6 provokes 2.e5. Black retreats the knight and targets weak d5/b6 squares. White can play solidly (d4, f4) or sharply.",
    },
    mainIdeas: [
      {
        fr: "Les pions blancs avancés peuvent devenir des cibles après …d6 / …d5.",
        en: "White’s advanced pawns can become targets after …d6 / …d5.",
      },
    ],
    typicalPlans: [
      {
        fr: "Noirs : …d6, …g6, Fg7, roque long parfois.",
        en: "Black: …d6, …g6, Bg7, sometimes long castle.",
      },
    ],
    traps: [
      {
        fr: "Ne pas se faire mater sur e1–a5 diagonale si le roi reste au centre trop longtemps.",
        en: "Don’t get mated on the e1–a5 diagonal if the king lingers in the center.",
      },
    ],
    whatToRemember: [
      {
        fr: "Alekhine = provocation puis contre-attaque sur le centre avancé.",
        en: "Alekhine = provocation then counterattack on the advanced center.",
      },
    ],
    modelLine: [
      { uci: "e2e4", comment: { fr: "1.e4", en: "1.e4" } },
      { uci: "g8f6", comment: { fr: "Alekhine : attaque immédiate sur e4.", en: "Alekhine: immediate hit on e4." } },
      { uci: "e4e5", comment: { fr: "Gain de temps et d’espace.", en: "Gains time and space." } },
      { uci: "f6d5", comment: { fr: "Cavalier central flexible.", en: "Flexible central knight." } },
      { uci: "d2d4", comment: { fr: "Soutien de e5 et ouverture lignes.", en: "Supports e5 and opens lines." } },
    ],
    historicalGames: [
      {
        id: "bogoljubow-alekhine-karlsbad-1923",
        white: "Efim Bogoljubow",
        black: "Alexander Alekhine",
        result: "0-1",
        date: "1923-05-10",
        event: {
          fr: "Tournoi international de maîtres, Karlsbad 1923 — ronde 10",
          en: "Karlsbad 1923 International Masters — round 10",
        },
        anecdote: {
          fr: "Une Alekhine (ECO B02) où les blancs choisissent 2.Cc3 au lieu de 2.e5 : la partie reste tranchante et Alekhine convertit une attaque de roi.",
          en: "An Alekhine (ECO B02) where White opts for 2.Nc3 instead of 2.e5: the game stays sharp and Alekhine converts a kingside attack.",
        },
        uciMoves: BOGOLJUBOW_ALEKHINE_KARLSBAD_1923_UCI,
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
      },
      {
        id: "dovliatov-mamedyarov-baku-2006",
        white: "Sanan Dovliatov",
        black: "Shakhriyar Mamedyarov",
        result: "0-1",
        date: "2006-05-08",
        event: {
          fr: "President’s Cup de Bakou 2006 — ronde 5",
          en: "2006 Baku President’s Cup — round 5",
        },
        anecdote: {
          fr: "Alekhine moderne (2.e5 Cd5, fianchetto roi) : Mamedyarov accepte une structure avec pions c doublés et un jeu tactique où la dame et le fou g7 décident vite.",
          en: "Modern Alekhine (2.e5 Nd5, kingside fianchetto): Mamedyarov accepts doubled c-pawns and sharp play where the queen and Bg7 decide quickly.",
        },
        uciMoves: DOVLIATOV_MAMEDYAROV_BAKU_2006_UCI,
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
      },
      {
        id: "donchenko-bortnyk-tt-chesscom-2024",
        white: "Alexander Donchenko",
        black: "Olexandr Bortnyk",
        result: "0-1",
        date: "2024-03-26",
        event: {
          fr: "Titled Tuesday (Chess.com), session internationale — ronde 9",
          en: "Titled Tuesday (Chess.com), international late — round 9",
        },
        anecdote: {
          fr: "Même famille B02 (2.Cc3 d5) que Karlsbad 1923 : une partie de blitz moderne où les blancs tentent le jeu d’attaque au roi, mais les noirs terminent par un mat de dame sur c1.",
          en: "Same B02 family (2.Nc3 d5) as Karlsbad 1923: a modern blitz game where White goes for a king attack, but Black finishes with a queen mate on c1.",
        },
        uciMoves: DONCHENKO_BORTNYK_TT_CHESSCOM_2024_UCI,
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
      },
    ],
  },
  {
    openingId: "london-system",
    hook: {
      fr: "Structure blanche flexible (d4, Ff4, e3, Cf3) — populaire en blitz et pour éviter la grosse théorie.",
      en: "Flexible White setup (d4, Bf4, e3, Nf3) — popular in blitz and to avoid heavy theory.",
    },
    recommendedFor: {
      fr: "Débutant à club (~800–2000). Peu de mémorisation ; focus sur les plans.",
      en: "Beginner to club (~800–2000). Low memorization; focus on plans.",
    },
    overview: {
      fr: "Les blancs développent sans engagement précoce en e4. Le fou f4 évite souvent le blocage e3–Ff1. Les noirs peuvent opposer …d5, …e6, ou un fianchetto roi.",
      en: "White develops without early e4 commitment. Bf4 often avoids e3–Bf1 blockage. Black can meet with …d5, …e6, or a kingside fianchetto.",
    },
    mainIdeas: [
      {
        fr: "Contrôle e5 et cases claires ; parfois c3 puis e4 en milieu de partie.",
        en: "Control e5 and light squares; sometimes c3 then e4 later.",
      },
    ],
    typicalPlans: [
      {
        fr: "Blancs : h3 pour soutenir Fg5 ou préparer le roc ; Cc3 et e3 solides.",
        en: "White: h3 to support Bg5 or prepare castling; Nc3 and e3 solid.",
      },
    ],
    traps: [
      {
        fr: "Méfie-toi de …Dh4+ si tu joues trop vite h3 sans développement.",
        en: "Beware …Qh4+ if you rush h3 without development.",
      },
    ],
    whatToRemember: [
      {
        fr: "Londres = système : transpose souvent ; apprends les idées contre …d5 et …g6.",
        en: "London = system: often transposes; learn ideas vs …d5 and …g6.",
      },
    ],
    modelLine: [
      { uci: "d2d4", comment: { fr: "Contrôle central.", en: "Central control." } },
      { uci: "d7d5", comment: { fr: "Réponse solide.", en: "Solid reply." } },
      { uci: "c1f4", comment: { fr: "Londres : fou actif avant e3.", en: "London: active bishop before e3." } },
      { uci: "e7e6", comment: { fr: "Structure solide noire.", en: "Solid Black structure." } },
      { uci: "e2e3", comment: { fr: "Soutien du centre et Fc1–d3 possible.", en: "Supports center; Bd3 possible." } },
      { uci: "c7c5", comment: { fr: "Rupture classique.", en: "Classic break." } },
    ],
    historicalGames: [
      {
        id: "maroczy-spielmann-prague-1908",
        white: "Geza Maroczy",
        black: "Rudolf Spielmann",
        result: "1-0",
        date: "1908-06-05",
        event: {
          fr: "Tournoi international de maîtres, Prague 1908 — ronde 14",
          en: "Prague 1908 International Masters — round 14",
        },
        anecdote: {
          fr: "Une ligne D02 (d4, Ff4, e3) typique de la « Londres » du tournage : structure avec pions c et jeu de tours sur la colonne c avant la finale gagnante.",
          en: "A D02 London-style line (d4, Bf4, e3): c-pawn structure and rook play on the c-file before a winning ending.",
        },
        uciMoves: MAROCZY_SPIELMANN_PRAGUE_1908_UCI,
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
      },
    ],
  },
  {
    openingId: "queens-gambit",
    hook: {
      fr: "1.d4 d5 2.c4 : les blancs offrent un pion pour ouvrir lignes et pression.",
      en: "1.d4 d5 2.c4: White offers a pawn for lines and pressure.",
    },
    recommendedFor: {
      fr: "Club (~1200+). Comprendre acceptée vs refusée est la base.",
      en: "Club (~1200+). Understanding accepted vs declined is foundational.",
    },
    overview: {
      fr: "Gambit accepté : structure de pions intéressante pour les noirs. Gambit refusé : jeu positionnel classique avec …e6. Les blancs visent souvent e3, Fd3, Cc3.",
      en: "Accepted: interesting pawn structures for Black. Declined: classical positional play with …e6. White often aims for e3, Bd3, Nc3.",
    },
    mainIdeas: [
      {
        fr: "La tension c4–d5 structure beaucoup de plans de milieu de partie.",
        en: "The c4–d5 tension structures many middlegame plans.",
      },
    ],
    typicalPlans: [
      {
        fr: "Blancs : développement léger, parfois a4 contre …b5 en certaines lignes.",
        en: "White: smooth development, sometimes a4 vs …b5 in some lines.",
      },
    ],
    traps: [
      {
        fr: "En acceptée, ne pas se faire enfermer sans contre-jeu sur l’aile dame.",
        en: "In the Accepted, avoid getting squeezed without queenside counterplay.",
      },
    ],
    whatToRemember: [
      {
        fr: "Gambit dame = famille : choisis une réponse noire et étudie ses plans.",
        en: "Queen’s Gambit family: pick a Black response and study its plans.",
      },
    ],
    modelLine: [
      { uci: "d2d4", comment: { fr: "1.d4", en: "1.d4" } },
      { uci: "d7d5", comment: { fr: "Symétrie centrale.", en: "Central symmetry." } },
      { uci: "c2c4", comment: { fr: "Gambit dame.", en: "Queen’s Gambit." } },
      { uci: "e7e6", comment: { fr: "Refusée : structure solide.", en: "Declined: solid structure." } },
      { uci: "b1c3", comment: { fr: "Développement et pression.", en: "Development and pressure." } },
    ],
    historicalGames: [],
  },
  {
    openingId: "kings-indian-defense",
    hook: {
      fr: "Fianchetto roi, …d6, …e5 ou …c5 : explosion tactique fréquente sur l’aile roi.",
      en: "Kingside fianchetto, …d6, …e5 or …c5: frequent kingside fireworks.",
    },
    recommendedFor: {
      fr: "Intermédiaire à fort niveau (~1400+). La théorie des variantes classiques est dense.",
      en: "Intermediate to advanced (~1400+). Classical main lines are dense.",
    },
    overview: {
      fr: "Les noirs laissent souvent les blancs former un grand pion central puis attaquent avec …e5 ou …f5. Les blancs peuvent jouer e4 ou fianchetto dame (Fianchetto variation).",
      en: "Black often lets White build a big center then strikes with …e5 or …f5. White may play e4 or a Catalan-style fianchetto.",
    },
    mainIdeas: [
      {
        fr: "Combat typique : expansion blanche au centre vs assaut noir sur le roi.",
        en: "Typical fight: White central expansion vs Black’s kingside assault.",
      },
    ],
    typicalPlans: [
      {
        fr: "Noirs : …g6, …Fg7, …d6, …Cg8–h5 parfois, …f5.",
        en: "Black: …g6, …Bg7, …d6, …Nh5 ideas, …f5.",
      },
    ],
    traps: [
      {
        fr: "Attention aux sacrifices sur e6 ou f7 si le roi noir reste au centre.",
        en: "Watch for sacrifices on e6 or f7 if Black’s king stays central.",
      },
    ],
    whatToRemember: [
      {
        fr: "GIND = patience puis explosion ; connais au moins une ligne anti-Mar del Plata simplifiée.",
        en: "KID = patience then blast; know at least one simplified anti–Mar del Plata idea.",
      },
    ],
    modelLine: [
      { uci: "d2d4", comment: { fr: "1.d4", en: "1.d4" } },
      { uci: "g8f6", comment: { fr: "Développement flexible.", en: "Flexible development." } },
      { uci: "c2c4", comment: { fr: "Grande présence dame.", en: "Big queen’s wing." } },
      { uci: "g7g6", comment: { fr: "Prépare fianchetto.", en: "Prepares fianchetto." } },
      { uci: "b1c3", comment: { fr: "Développement.", en: "Development." } },
      { uci: "f8g7", comment: { fr: "Diagonale longue.", en: "Long diagonal." } },
    ],
    historicalGames: [
      {
        id: "kasparov-karpov-kid",
        white: "Anatoly Karpov",
        black: "Garry Kasparov",
        result: "1/2-1/2",
        date: "1985",
        event: {
          fr: "Match du monde (exemple de structure GIND)",
          en: "World Championship (KID-style structure example)",
        },
        uciMoves: ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4", "d7d6"],
        annotations: [
          {
            afterMoveIndex: 6,
            text: {
              fr: "e4 : les blancs revendiquent le centre classique contre la GIND.",
              en: "e4: White claims the classical center against the KID.",
            },
          },
          {
            afterMoveIndex: 7,
            text: {
              fr: "…d6 : solidité et préparation de …e5 ou …e6 selon les suites.",
              en: "…d6: solidity preparing …e5 or …e6 depending on follow-up.",
            },
          },
        ],
      },
    ],
  },
  {
    openingId: "caro-kann",
    hook: {
      fr: "Défense solide avec …c6 puis …d5 : moins de tactique brute qu’en Sicilienne, très populaire en club.",
      en: "Solid …c6 then …d5: less early fire than the Sicilian, very popular at club level.",
    },
    recommendedFor: {
      fr: "Débutant intermédiaire à club (~1000–2200). Excellente école de structures de pions.",
      en: "Lower intermediate to club (~1000–2200). Great school of pawn structures.",
    },
    overview: {
      fr: "Les noirs repoussent le pion central blanc avec …c6 avant …d5. Variantes classique, avancée, et De Bruycker offrent des profils allant du solide au dynamique.",
      en: "Black meets the central pawn with …c6 before …d5. Classical, Advance, and Tartakower-style setups range from solid to dynamic.",
    },
    mainIdeas: [
      {
        fr: "Souvent une structure avec pion d5 et pions e6/c6 : compact mais il faut du contre-jeu.",
        en: "Often a d5 pawn with e6/c6 support: compact but Black needs counterplay.",
      },
    ],
    typicalPlans: [
      {
        fr: "Noirs : …d5, …Cbd7, …F5 ou …g6 selon variante ; ruptures …c5 ou …e5 au bon moment.",
        en: "Black: …d5, …Nd7, …Bf5 or …g6 by line; …c5 or …e5 breaks when timed well.",
      },
    ],
    traps: [
      {
        fr: "En avancée, surveille les attaques sur l’aile roi si tu retardes le développement.",
        en: "In the Advance, watch for kingside attacks if development lags.",
      },
    ],
    whatToRemember: [
      {
        fr: "Caro-Kann = patience : les blancs ont souvent l’espace, les noirs la solidité.",
        en: "Caro-Kann = patience: White often has space, Black has solidity.",
      },
    ],
    modelLine: [
      { uci: "e2e4", comment: { fr: "1.e4", en: "1.e4" } },
      { uci: "c7c6", comment: { fr: "Caro-Kann.", en: "Caro-Kann Defense." } },
      { uci: "d2d4", comment: { fr: "Espace central.", en: "Central space." } },
      { uci: "d7d5", comment: { fr: "Challenge immédiat.", en: "Immediate challenge." } },
      { uci: "b1c3", comment: { fr: "Développement ; évite la prise tôt si tu préfères la classique.", en: "Development; avoids early exchange if you prefer Classical ideas." } },
    ],
    historicalGames: [
      {
        id: "caro-capablanca",
        white: "José Raúl Capablanca",
        black: "Frank Marshall",
        result: "1-0",
        date: "1909",
        event: {
          fr: "Exemple de jeu positionnel (extrait pédagogique)",
          en: "Positional play example (teaching excerpt)",
        },
        uciMoves: ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "c3e4", "g8f6"],
        annotations: [
          {
            afterMoveIndex: 5,
            text: {
              fr: "Cxe4 : les blancs récupèrent le centre avec pièce active.",
              en: "Nxe4: White regains the center with an active piece.",
            },
          },
          {
            afterMoveIndex: 7,
            text: {
              fr: "…Cf6 : développement naturel ; la partie bascule souvent sur le jeu de cases et de plans.",
              en: "…Nf6: natural development; the game shifts to squares and plans.",
            },
          },
        ],
      },
    ],
  },
  {
    openingId: "nimzo-indian-defense",
    hook: {
      fr: "3.Fb4+ : hypermoderne — les noirs pincent le cavalier tout en contrôlant e4.",
      en: "3.Bb4+: hypermodern — Black pins the knight while controlling e4.",
    },
    recommendedFor: {
      fr: "Intermédiaire (~1400+) : structures de pions riches (c4–d5 ou a3).",
      en: "Intermediate (~1400+): rich pawn structures (c4–d5 or a3 lines).",
    },
    overview: {
      fr: "Après 1.d4 Cf6 2.c4 e6 3.Cc3 Fb4, les noirs évitent …d5 immédiat et visent souvent le bloc est-indien ou la variante Rubinstein.",
      en: "After 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4, Black avoids immediate …d5 and often heads for KID-style or Rubinstein setups.",
    },
    mainIdeas: [
      {
        fr: "Le fou en b4 force les blancs à choisir : a3, e3, ou accepter la structure.",
        en: "The Bb4 bishop forces White to choose: a3, e3, or accept the structure.",
      },
    ],
    typicalPlans: [
      {
        fr: "Noirs : …b6/Fb7, …O-O, parfois …d5 ou …c5 selon la variante.",
        en: "Black: …b6/Bb7, …O-O, sometimes …d5 or …c5 by line.",
      },
    ],
    traps: [
      {
        fr: "Attention au double pion c après Fxc3+ si tu ne connais pas les plans de compensation.",
        en: "Watch the doubled c-pawns after Bxc3+ if you don’t know compensating plans.",
      },
    ],
    whatToRemember: [
      {
        fr: "Nimzo = équilibre entre contrôle et structure ; étudie une ligne entière (Rubinstein, Saemisch…).",
        en: "Nimzo = balance of control and structure; study one full line.",
      },
    ],
    modelLine: [
      { uci: "d2d4", comment: { fr: "1.d4", en: "1.d4" } },
      { uci: "g8f6", comment: { fr: "1…Cf6", en: "1…Nf6" } },
      { uci: "c2c4", comment: { fr: "2.c4", en: "2.c4" } },
      { uci: "e7e6", comment: { fr: "2…e6", en: "2…e6" } },
      { uci: "b1c3", comment: { fr: "3.Cc3", en: "3.Nc3" } },
      { uci: "f8b4", comment: { fr: "3…Fb4+ Nimzo-indienne.", en: "3…Bb4+ Nimzo-Indian." } },
    ],
    variants: [
      {
        id: "rubinstein",
        title: { fr: "Rubinstein (Fxc3+)", en: "Rubinstein (Bxc3+)" },
        description: {
          fr: "Les noirs doublent les pions c pour la paire de fous et le centre.",
          en: "Black doubles c-pawns for the bishop pair and central play.",
        },
        line: [
          { uci: "d2d4", comment: { fr: "1.d4", en: "1.d4" } },
          { uci: "g8f6", comment: { fr: "1…Cf6", en: "1…Nf6" } },
          { uci: "c2c4", comment: { fr: "2.c4", en: "2.c4" } },
          { uci: "e7e6", comment: { fr: "2…e6", en: "2…e6" } },
          { uci: "b1c3", comment: { fr: "3.Cc3", en: "3.Nc3" } },
          { uci: "f8b4", comment: { fr: "3…Fb4+", en: "3…Bb4+" } },
          { uci: "e2e3", comment: { fr: "4.e3 solide.", en: "4.e3 solid." } },
          { uci: "b4c3", comment: { fr: "4…Fxc3+", en: "4…Bxc3+" } },
        ],
      },
    ],
    historicalGames: [
      {
        id: "nimzo-demo",
        white: "Illustration",
        black: "Structure typique",
        result: "*",
        date: "—",
        event: { fr: "Mini-ligne pédagogique", en: "Teaching mini-line" },
        uciMoves: ["d2d4", "g8f6", "c2c4", "e7e6", "b1c3", "f8b4", "c1d2"],
        annotations: [
          {
            afterMoveIndex: 5,
            text: {
              fr: "Fd2 : développement simple ; les blancs gardent le fou paire.",
              en: "Bd2: simple development; White keeps bishop pair options.",
            },
          },
        ],
        challenges: [
          {
            id: "nimzo-bd2",
            afterMoveCount: 6,
            correctUci: "c1d2",
            prompt: {
              fr: "Après …Fb4+, quel développement naturel du fou blanc évite le double pion tout de suite ?",
              en: "After …Bb4+, which natural bishop development avoids doubled pawns for now?",
            },
            wrongChoices: ["a2a3", "d1a4", "g2g3"],
            hints: [
              {
                fr: "Le fou va sur une case où il ne bloque pas le centre et garde la solidité.",
                en: "The bishop goes to a square that doesn’t block the center.",
              },
            ],
            insight: {
              fr: "Fd2 : ligne classique ; a3 est plus agressif mais affaiblit b3.",
              en: "Bd2: classical line; a3 is sharper but weakens b3.",
            },
          },
        ],
      },
    ],
  },
  {
    openingId: "grunfeld-defense",
    hook: {
      fr: "…d5 dynamique contre d4/c4 : les noirs acceptent un centre blanc large pour contre-attaquer.",
      en: "Dynamic …d5 vs d4/c4: Black accepts a wide white center to counterattack.",
    },
    recommendedFor: {
      fr: "Avancé (~1700+) : tactique et finales complexes.",
      en: "Advanced (~1700+): tactics and complex endings.",
    },
    overview: {
      fr: "Après 1.d4 Cf6 2.c4 g6 3.Cc3 d5, les noirs visent …F7 et pression sur d4. Kasparov et nombreux GMI l’ont popularisée.",
      en: "After 1.d4 Nf6 2.c4 g6 3.Nc3 d5, Black aims for …Bg7 and pressure on d4. Kasparov and many GMs championed it.",
    },
    mainIdeas: [
      {
        fr: "Sacrifices de pion ou contre-jeu sur la colonne c selon les variantes.",
        en: "Pawn sacrifices or counterplay on the c-file depending on lines.",
      },
    ],
    typicalPlans: [
      {
        fr: "Noirs : Fg7, roc, …c5 ou …c6 ; blancs : e4, jeu de flanc dame.",
        en: "Black: Bg7, castle, …c5 or …c6; White: e4, queenside play.",
      },
    ],
    traps: [
      {
        fr: "Ne pas oublier que le centre blanc peut devenir écrasant si les noirs restent passifs.",
        en: "Remember White’s center can become crushing if Black stays passive.",
      },
    ],
    whatToRemember: [
      {
        fr: "Grünfeld = contre-attaque : connais au moins une ligne anti-e4 du centre (échange, 7.Fe3…).",
        en: "Grünfeld = counterattack: know one anti-center line (exchange, 7.Be3…).",
      },
    ],
    modelLine: [
      { uci: "d2d4", comment: { fr: "1.d4", en: "1.d4" } },
      { uci: "g8f6", comment: { fr: "1…Cf6", en: "1…Nf6" } },
      { uci: "c2c4", comment: { fr: "2.c4", en: "2.c4" } },
      { uci: "g7g6", comment: { fr: "2…g6", en: "2…g6" } },
      { uci: "b1c3", comment: { fr: "3.Cc3", en: "3.Nc3" } },
      { uci: "d7d5", comment: { fr: "3…d5 Grünfeld.", en: "3…d5 Grünfeld." } },
    ],
    variants: [
      {
        id: "exchange-grunfeld",
        title: { fr: "Variante des échanges (cxd5)", en: "Exchange variation (cxd5)" },
        description: {
          fr: "Structure avec pions isolés ou tension IQP selon les suites.",
          en: "Structures with isolani or IQP tension depending on follow-up.",
        },
        line: [
          { uci: "d2d4", comment: { fr: "1.d4", en: "1.d4" } },
          { uci: "g8f6", comment: { fr: "1…Cf6", en: "1…Nf6" } },
          { uci: "c2c4", comment: { fr: "2.c4", en: "2.c4" } },
          { uci: "g7g6", comment: { fr: "2…g6", en: "2…g6" } },
          { uci: "b1c3", comment: { fr: "3.Cc3", en: "3.Nc3" } },
          { uci: "d7d5", comment: { fr: "3…d5", en: "3…d5" } },
          { uci: "c4d5", comment: { fr: "4.cxd5", en: "4.cxd5" } },
          { uci: "f6d5", comment: { fr: "4…Cxd5", en: "4…Nxd5" } },
        ],
      },
    ],
    historicalGames: [],
  },
  {
    openingId: "english-opening",
    hook: {
      fr: "1.c4 : contrôle du centre par le flanc — transpositions vers des milliers de plans.",
      en: "1.c4: flank central control — transpositions to countless plans.",
    },
    recommendedFor: {
      fr: "Intermédiaire (~1300+) : il faut aimer les structures fermées et les idées de fianchetto.",
      en: "Intermediate (~1300+): enjoy closed structures and fianchetto ideas.",
    },
    overview: {
      fr: "L’anglaise peut mener à réti, catalane, sicilienne inversée, ou hedgehog. Flexibilité maximale pour le joueur de blancs.",
      en: "The English can lead to Réti, Catalan, reversed Sicilian, or hedgehog. Maximum flexibility for White.",
    },
    mainIdeas: [
      {
        fr: "Retarder e4 ou le jouer selon la réponse noire ; souvent g3, Fg2.",
        en: "Delay e4 or play it depending on Black; often g3, Bg2.",
      },
    ],
    typicalPlans: [
      {
        fr: "Blancs : e3/d4, ou a3–b4 ; noirs : e5, e6, ou …c5.",
        en: "White: e3/d4, or a3–b4; Black: e5, e6, or …c5.",
      },
    ],
    traps: [
      {
        fr: "Ne pas se perdre en transpositions : nomme la structure cible après 5–6 coups.",
        en: "Don’t get lost in transpositions: name your target structure after 5–6 moves.",
      },
    ],
    whatToRemember: [
      {
        fr: "Anglaise = boîte à outils : étudie un système (symétrique, quatre cavaliers…).",
        en: "English = toolbox: study one system (symmetrical, four knights…).",
      },
    ],
    modelLine: [
      { uci: "c2c4", comment: { fr: "1.c4", en: "1.c4" } },
      { uci: "e7e5", comment: { fr: "1…e5 symétrique possible.", en: "1…e5 symmetrical possible." } },
      { uci: "g1f3", comment: { fr: "2.Cf3", en: "2.Nf3" } },
      { uci: "b8c6", comment: { fr: "2…Cc6", en: "2…Nc6" } },
    ],
    variants: [
      {
        id: "symmetrical",
        title: { fr: "Anglaise symétrique (…c5)", en: "Symmetrical English (…c5)" },
        description: {
          fr: "Les noirs copient avec …c5 pour une lutte stratégique équilibrée.",
          en: "Black mirrors with …c5 for a balanced strategic fight.",
        },
        line: [
          { uci: "c2c4", comment: { fr: "1.c4", en: "1.c4" } },
          { uci: "c7c5", comment: { fr: "1…c5", en: "1…c5" } },
          { uci: "g1f3", comment: { fr: "2.Cf3", en: "2.Nf3" } },
          { uci: "g8f6", comment: { fr: "2…Cf6", en: "2…Nf6" } },
        ],
      },
    ],
    historicalGames: [],
  },
  {
    openingId: "evans-gambit",
    hook: {
      fr: "4.b4 ! : un pion offert pour lignes ouvertes et initiative — romantique mais encore dangereux.",
      en: "4.b4!: a pawn for open lines and initiative — romantic but still dangerous.",
    },
    recommendedFor: {
      fr: "Joueur de club (~1200–2000) qui aime la tactique.",
      en: "Club players (~1200–2000) who like tactics.",
    },
    overview: {
      fr: "Après 1.e4 e5 2.Cf3 Cc6 3.Fc4 Fc5, 4.b4 vise à dévier le fou noir et accélérer l’attaque. Accepté ou refusé, les positions restent vives.",
      en: "After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5, 4.b4 aims to divert Black’s bishop and speed up the attack.",
    },
    mainIdeas: [
      {
        fr: "Développement rapide, colonnes ouvertes, parfois sacrifice de pièce sur e5 ou f7.",
        en: "Fast development, open files, sometimes piece sacrifices on e5 or f7.",
      },
    ],
    typicalPlans: [
      {
        fr: "Blancs : c3, d4, ou Dd5 selon réponse ; noirs : …Fxb4, …d5 contre-jeu.",
        en: "White: c3, d4, or Qd5 by reply; Black: …Bxb4, …d5 counterplay.",
      },
    ],
    traps: [
      {
        fr: "Si tu acceptes le gambit, connais au moins une ligne jusqu’au milieu de partie.",
        en: "If you accept the gambit, know one line into the middlegame.",
      },
    ],
    whatToRemember: [
      {
        fr: "Evans = rythme : une erreur noire peut coûter vite.",
        en: "Evans = tempo: one Black inaccuracy can cost fast.",
      },
    ],
    modelLine: [
      { uci: "e2e4", comment: { fr: "1.e4", en: "1.e4" } },
      { uci: "e7e5", comment: { fr: "1…e5", en: "1…e5" } },
      { uci: "g1f3", comment: { fr: "2.Cf3", en: "2.Nf3" } },
      { uci: "b8c6", comment: { fr: "2…Cc6", en: "2…Nc6" } },
      { uci: "f1c4", comment: { fr: "3.Fc4", en: "3.Bc4" } },
      { uci: "f8c5", comment: { fr: "3…Fc5", en: "3…Bc5" } },
      { uci: "b2b4", comment: { fr: "4.b4 Gambit Evans.", en: "4.b4 Evans Gambit." } },
    ],
    variants: [
      {
        id: "evans-decline",
        title: { fr: "Refus (…Fa5)", en: "Decline (…Ba5)" },
        description: {
          fr: "Les noirs ne prennent pas en b4 et gardent le fou actif.",
          en: "Black does not capture on b4 and keeps the bishop active.",
        },
        line: [
          { uci: "e2e4", comment: { fr: "1.e4", en: "1.e4" } },
          { uci: "e7e5", comment: { fr: "1…e5", en: "1…e5" } },
          { uci: "g1f3", comment: { fr: "2.Cf3", en: "2.Nf3" } },
          { uci: "b8c6", comment: { fr: "2…Cc6", en: "2…Nc6" } },
          { uci: "f1c4", comment: { fr: "3.Fc4", en: "3.Bc4" } },
          { uci: "f8c5", comment: { fr: "3…Fc5", en: "3…Bc5" } },
          { uci: "b2b4", comment: { fr: "4.b4", en: "4.b4" } },
          { uci: "c5a5", comment: { fr: "4…Fa5", en: "4…Ba5" } },
        ],
      },
    ],
    historicalGames: [
      {
        id: "evans-walker-1850",
        white: "Captain Evans",
        black: "William Walker",
        result: "1-0",
        date: "1850",
        event: {
          fr: "Partie historique (extrait)",
          en: "Historic game (excerpt)",
        },
        anecdote: {
          fr: "Le capitaine Evans popularisa ce gambit à bord des navires ; le coup 4.b4 porte son nom.",
          en: "Captain Evans popularized this gambit at sea; 4.b4 bears his name.",
        },
        uciMoves: [
          "e2e4",
          "e7e5",
          "g1f3",
          "b8c6",
          "f1c4",
          "f8c5",
          "b2b4",
          "c5b4",
          "c2c3",
          "b4a5",
          "d2d4",
        ],
        annotations: [
          {
            afterMoveIndex: 7,
            text: {
              fr: "…Fxb4 : les noirs acceptent ; les blancs récupèrent le centre avec c3 et d4.",
              en: "…Bxb4: Black accepts; White regains the center with c3 and d4.",
            },
          },
        ],
        challenges: [
          {
            id: "evans-d4",
            afterMoveCount: 10,
            correctUci: "d2d4",
            prompt: {
              fr: "Après …Fa5, quel coup central typique ouvre le jeu pour les blancs ?",
              en: "After …Ba5, which central move opens the game for White?",
            },
            wrongChoices: ["d2d3", "e4e5", "f1d3"],
            hints: [
              {
                fr: "Les blancs veulent ouvrir le centre avec prise sur e5 ou pression sur e5.",
                en: "White wants to open the center with play against e5.",
              },
            ],
            insight: {
              fr: "d4 : frappe au centre ; la partie devient tactique avec la colonne d ouverte.",
              en: "d4: strikes the center; the game turns tactical with the d-file.",
            },
          },
        ],
      },
    ],
  },
  {
    openingId: "reti-opening",
    hook: {
      fr: "1.Cf3 : hypermoderne — contrôle central sans pion e4/d4 immédiat, très flexible.",
      en: "1.Nf3: hypermodern — central control without an immediate e4/d4, highly flexible.",
    },
    recommendedFor: {
      fr: "Intermédiaire (~1300+) : il faut comprendre les transpositions vers anglaise, catalane ou roi-indien.",
      en: "Intermediate (~1300+): understand transpositions to English, Catalan, or King’s Indian structures.",
    },
    overview: {
      fr: "Les blancs retardent le choix central. Souvent c4, g3, ou d4 plus tard selon la réponse noire. Idéal pour éviter des masses de théorie sur une seule ligne.",
      en: "White delays the central commitment. Often c4, g3, or d4 later depending on Black. Good for avoiding one huge theoretical line.",
    },
    mainIdeas: [
      {
        fr: "Flexibilité : la même première série de coups peut mener à des plans très différents.",
        en: "Flexibility: the same early moves can lead to very different plans.",
      },
    ],
    typicalPlans: [
      {
        fr: "Blancs : c4 et jeu de flanc, ou d4 avec jeu positionnel ; parfois e3 et Fd3.",
        en: "White: c4 and flank play, or d4 with positional play; sometimes e3 and Bd3.",
      },
    ],
    traps: [
      {
        fr: "Ne pas se laisser enfermer sans case pour les pièces si tu joues trop de coups de pions sur les flancs.",
        en: "Don’t get cramped with no piece squares if you play too many flank pawn moves.",
      },
    ],
    whatToRemember: [
      {
        fr: "Réti = choix reporté : étudie les transpositions comme des ouvertures à part entière.",
        en: "Réti = delayed choice: study transpositions as openings in their own right.",
      },
    ],
    modelLine: [
      { uci: "g1f3", comment: { fr: "Réti / Zukertort.", en: "Réti / Zukertort." } },
      { uci: "d7d5", comment: { fr: "Réponse centrale classique.", en: "Classical central reply." } },
      { uci: "c2c4", comment: { fr: "Anglaise / catalane possible.", en: "English / Catalan possible." } },
      { uci: "d5c4", comment: { fr: "Si les noirs prennent, structure asymétrique.", en: "If Black captures, asymmetrical structure." } },
    ],
    historicalGames: [],
  },
];

const LESSON_BY_ID = new Map(OPENING_LESSONS.map((l) => [l.openingId, l]));

export function getLesson(openingId: string): OpeningLesson | undefined {
  return LESSON_BY_ID.get(openingId);
}

export function getAllLessons(): OpeningLesson[] {
  return OPENING_LESSONS;
}

export function pickLocalized(s: LocalizedString, lang: "fr" | "en"): string {
  return lang === "en" ? s.en : s.fr;
}

export function lessonWithOpening(lesson: OpeningLesson, lang: "fr" | "en"): {
  lesson: OpeningLesson;
  opening: Opening | undefined;
  title: string;
} {
  const opening = getOpeningById(lesson.openingId);
  const title = opening
    ? lang === "en" && opening.nameEn
      ? opening.nameEn
      : opening.name
    : lesson.openingId;
  return { lesson, opening, title };
}
