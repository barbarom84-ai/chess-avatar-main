import { getOpeningById, type Opening } from "@/lib/openings-library";

export type LocalizedString = { fr: string; en: string };

export interface ModelMoveComment {
  uci: string;
  comment: LocalizedString;
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
        uciMoves: [
          "e2e4", "e7e5", "g1f3", "d7d6", "d2d4", "c8g4", "d4e5", "g4f3",
          "d1f3", "d6e5", "f1c4", "g8f6", "f3b3", "d8e7", "b1c3", "c7c6",
          "c1g5", "b7b5",
        ],
        annotations: [
          {
            afterMoveIndex: 3,
            text: {
              fr: "Les noirs affaiblissent la grande diagonale avec …d6 plutôt que …Cc6.",
              en: "Black weakens the long diagonal with …d6 instead of …Nc6.",
            },
          },
          {
            afterMoveIndex: 7,
            text: {
              fr: "Les blancs récupèrent un pion avec la dame en f3 — développement supérieur.",
              en: "White regains a pawn with Qf3 — superior development.",
            },
          },
          {
            afterMoveIndex: 15,
            text: {
              fr: "Fc4 et Fg5 : pièces actives avant le mat final célèbre.",
              en: "Bc4 and Bg5: active pieces before the famous mate.",
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
        id: "zukertort-steinitz-wch",
        white: "Johannes Zukertort",
        black: "Wilhelm Steinitz",
        result: "0-1",
        date: "1886",
        event: {
          fr: "Championnat du monde (extrait thématique)",
          en: "World Championship (thematic excerpt)",
        },
        uciMoves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "g8f6", "e1g1", "f6e4"],
        annotations: [
          {
            afterMoveIndex: 6,
            text: {
              fr: "Roc court blanc : sécurité du roi avant combat central.",
              en: "White castles: king safety before central combat.",
            },
          },
          {
            afterMoveIndex: 7,
            text: {
              fr: "Variante avec …Cxe4 : les noirs gagnent un pion au prix de la structure.",
              en: "…Nxe4 line: Black wins a pawn at a structural cost.",
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
    historicalGames: [],
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
