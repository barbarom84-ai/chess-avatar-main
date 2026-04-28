import { getOpeningById, type Opening } from "@/lib/openings-library";
import { attachStaticGames, loadHistoricalGames } from "@/lib/historical-games-loader";

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

/**
 * Lessons defined inline in this file. Historical games that come from
 * `data/historical-games/*.pgn` (with a `*.meta.ts` companion) are auto-attached
 * by `attachStaticGames(...)` at the bottom of this module — see `OPENING_LESSONS`.
 */
const BASE_LESSONS: OpeningLesson[] = [
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
    // Historical games (bird-anderssen-1851-london, steinitz-zukertort-1886-wch-r14)
    // are auto-loaded from data/historical-games/*.meta.ts.
    historicalGames: [],
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
    // anderssen-suhle-1864 is auto-loaded from data/historical-games/*.meta.ts.
    historicalGames: [
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
    // hebert-seirawan-1982-luzern is auto-loaded from data/historical-games/*.meta.ts.
    historicalGames: [],
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
    // Alekhine games (bogoljubow-alekhine-karlsbad-1923, dovliatov-mamedyarov-baku-2006,
    // donchenko-bortnyk-tt-chesscom-2024) are auto-loaded from data/historical-games/*.meta.ts.
    historicalGames: [],
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
    // maroczy-spielmann-prague-1908 is auto-loaded from data/historical-games/*.meta.ts.
    historicalGames: [],
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
    openingId: "four-knights-scotch",
    hook: {
      fr: "Après 1.e4 e5 2.Cf3 Cc6 3.Cc3 Cf6, 4.d4 transpose souvent vers une partie écossaise dynamique.",
      en: "After 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6, 4.d4 often transposes into a sharp Scotch-type battle.",
    },
    recommendedFor: {
      fr: "Joueur de club qui veut sortir des lignes les plus mainlines du quatre cavaliers tout en gardant une structure familière.",
      en: "Club players who want to sidestep the quietest Four Knights lines while keeping familiar structures.",
    },
    overview: {
      fr: "La variante écossaise du quatre cavaliers centre le jeu plus vite qu’une ligne purement fermée : la poussée d4 change la nature tactique du milieu de partie.",
      en: "The Scotch branch of the Four Knights speeds things up compared with purely closed lines: d4 changes the middlegame character.",
    },
    mainIdeas: [
      {
        fr: "Ouvrir le centre avec d4 quand la structure le permet ; surveiller les tactiques sur e5 et les colonnes.",
        en: "Open with d4 when the structure allows; watch tactics around e5 and open files.",
      },
      {
        fr: "Les transpositions vers Écossaise ou autres quatre cavaliers sont fréquentes — nomme la structure après 6–8 coups.",
        en: "Transpositions to Scotch or other Four Knights schemes are common — name the structure after 6–8 moves.",
      },
    ],
    typicalPlans: [
      {
        fr: "Blancs : pression centrale, développement des fianchetti ou pièces vers le roi noir selon la ligne.",
        en: "White: central pressure, development toward fianchetto structures or kingside pressure depending on the line.",
      },
      {
        fr: "Noirs : contre-jeu …d5 ou jeu solide avec …F7 ; éviter les temps perdus en ouverture.",
        en: "Black: …d5 counterplay or solid …Be7 setups; avoid wasting tempi early.",
      },
    ],
    traps: [
      {
        fr: "Ne pas jouer mécaniquement : la colonne d ouverte peut favoriser les tactiques pour les deux camps.",
        en: "Don’t play on autopilot: an open d-file can fuel tactics for both sides.",
      },
    ],
    whatToRemember: [
      {
        fr: "Quatre cavaliers + d4 : prépare-toi à une partie plus ouverte qu’un quatre cavaliers « tranquille ».",
        en: "Four Knights with d4: expect a more open game than the quietest Four Knights paths.",
      },
    ],
    modelLine: [
      { uci: "e2e4", comment: { fr: "1.e4", en: "1.e4" } },
      { uci: "e7e5", comment: { fr: "1…e5", en: "1…e5" } },
      { uci: "g1f3", comment: { fr: "2.Cf3", en: "2.Nf3" } },
      { uci: "b8c6", comment: { fr: "2…Cc6", en: "2…Nc6" } },
      { uci: "b1c3", comment: { fr: "3.Cc3", en: "3.Nc3" } },
      { uci: "g8f6", comment: { fr: "3…Cf6", en: "3…Nf6" } },
      { uci: "d2d4", comment: { fr: "4.d4 variante écossaise.", en: "4.d4 Scotch branch." } },
    ],
    historicalGames: [],
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

/**
 * Final lessons array exposed to the app: inline `BASE_LESSONS` augmented with the
 * historical games auto-discovered from `data/historical-games/*.meta.ts`.
 */
export const OPENING_LESSONS: OpeningLesson[] = attachStaticGames(
  BASE_LESSONS,
  loadHistoricalGames(),
);

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
