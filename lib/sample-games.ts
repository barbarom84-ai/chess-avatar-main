/**
 * Curated historical PGNs that double as smoke-test fixtures and as a
 * "try without an account" entry point for the Game Review.
 */

export interface SampleGame {
  id: string;
  white: string;
  black: string;
  event: string;
  year: number;
  /** Short tagline shown under the title. */
  blurb: { fr: string; en: string };
  pgn: string;
}

const MORPHY_OPERA: SampleGame = {
  id: "morphy-opera-1858",
  white: "Paul Morphy",
  black: "Duke Karl / Count Isouard",
  event: "Paris Opera",
  year: 1858,
  blurb: {
    fr: "Mat de l'Opéra — chef-d'œuvre de développement et de sacrifice.",
    en: "The Opera Mate — masterclass in development and sacrifice.",
  },
  pgn: `[Event "Paris"]
[Site "Paris FRA"]
[Date "1858.??.??"]
[White "Morphy, Paul"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1.e4 e5 2.Nf3 d6 3.d4 Bg4 4.dxe5 Bxf3 5.Qxf3 dxe5 6.Bc4 Nf6 7.Qb3 Qe7
8.Nc3 c6 9.Bg5 b5 10.Nxb5 cxb5 11.Bxb5+ Nbd7 12.O-O-O Rd8 13.Rxd7 Rxd7
14.Rd1 Qe6 15.Bxd7+ Nxd7 16.Qb8+ Nxb8 17.Rd8# 1-0`,
};

const KASPAROV_TOPALOV: SampleGame = {
  id: "kasparov-topalov-1999",
  white: "Garry Kasparov",
  black: "Veselin Topalov",
  event: "Wijk aan Zee",
  year: 1999,
  blurb: {
    fr: "« Kasparov's Immortal » — sacrifice de tour à 24.Rxd4 et combinaison à long terme.",
    en: "Kasparov's Immortal — rook sacrifice on 24.Rxd4 and a long-term combination.",
  },
  pgn: `[Event "Hoogovens A Tournament"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[Round "4"]
[White "Kasparov, Garry"]
[Black "Topalov, Veselin"]
[Result "1-0"]

1.e4 d6 2.d4 Nf6 3.Nc3 g6 4.Be3 Bg7 5.Qd2 c6 6.f3 b5 7.Nge2 Nbd7 8.Bh6
Bxh6 9.Qxh6 Bb7 10.a3 e5 11.O-O-O Qe7 12.Kb1 a6 13.Nc1 O-O-O 14.Nb3 exd4
15.Rxd4 c5 16.Rd1 Nb6 17.g3 Kb8 18.Na5 Ba8 19.Bh3 d5 20.Qf4+ Ka7 21.Rhe1
d4 22.Nd5 Nbxd5 23.exd5 Qd6 24.Rxd4 cxd4 25.Re7+ Kb6 26.Qxd4+ Kxa5
27.b4+ Ka4 28.Qc3 Qxd5 29.Ra7 Bb7 30.Rxb7 Qc4 31.Qxf6 Kxa3 32.Qxa6+ Kxb4
33.c3+ Kxc3 34.Qa1+ Kd2 35.Qb2+ Kd1 36.Bf1 Rd2 37.Rd7 Rxd7 38.Bxc4 bxc4
39.Qxh8 Rd3 40.Qa8 c3 41.Qa4+ Ke1 42.f4 f5 43.Kc1 Rd2 44.Qa7 1-0`,
};

const FISCHER_BYRNE: SampleGame = {
  id: "fischer-byrne-1956",
  white: "Donald Byrne",
  black: "Bobby Fischer",
  event: "Rosenwald Memorial",
  year: 1956,
  blurb: {
    fr: "« The Game of the Century » — Fischer à 13 ans sacrifie sa dame.",
    en: "The Game of the Century — 13-year-old Fischer sacrifices his queen.",
  },
  pgn: `[Event "Third Rosenwald Trophy"]
[Site "New York, NY USA"]
[Date "1956.10.17"]
[White "Donald Byrne"]
[Black "Robert James Fischer"]
[Result "0-1"]

1.Nf3 Nf6 2.c4 g6 3.Nc3 Bg7 4.d4 O-O 5.Bf4 d5 6.Qb3 dxc4 7.Qxc4 c6
8.e4 Nbd7 9.Rd1 Nb6 10.Qc5 Bg4 11.Bg5 Na4 12.Qa3 Nxc3 13.bxc3 Nxe4
14.Bxe7 Qb6 15.Bc4 Nxc3 16.Bc5 Rfe8+ 17.Kf1 Be6 18.Bxb6 Bxc4+ 19.Kg1
Ne2+ 20.Kf1 Nxd4+ 21.Kg1 Ne2+ 22.Kf1 Nc3+ 23.Kg1 axb6 24.Qb4 Ra4
25.Qxb6 Nxd1 26.h3 Rxa2 27.Kh2 Nxf2 28.Re1 Rxe1 29.Qd8+ Bf8 30.Nxe1 Bd5
31.Nf3 Ne4 32.Qb8 b5 33.h4 h5 34.Ne5 Kg7 35.Kg1 Bc5+ 36.Kf1 Ng3+
37.Ke1 Bb4+ 38.Kd1 Bb3+ 39.Kc1 Ne2+ 40.Kb1 Nc3+ 41.Kc1 Rc2# 0-1`,
};

const ANDERSSEN_KIESERITZKY: SampleGame = {
  id: "anderssen-kieseritzky-1851",
  white: "Adolf Anderssen",
  black: "Lionel Kieseritzky",
  event: "Casual game, London",
  year: 1851,
  blurb: {
    fr: "« Immortal Game » — sacrifice des deux tours et de la dame pour mater.",
    en: "The Immortal Game — both rooks and the queen sacrificed for mate.",
  },
  pgn: `[Event "Casual Game"]
[Site "London ENG"]
[Date "1851.06.21"]
[White "Anderssen, Adolf"]
[Black "Kieseritzky, Lionel"]
[Result "1-0"]

1.e4 e5 2.f4 exf4 3.Bc4 Qh4+ 4.Kf1 b5 5.Bxb5 Nf6 6.Nf3 Qh6 7.d3 Nh5
8.Nh4 Qg5 9.Nf5 c6 10.g4 Nf6 11.Rg1 cxb5 12.h4 Qg6 13.h5 Qg5 14.Qf3 Ng8
15.Bxf4 Qf6 16.Nc3 Bc5 17.Nd5 Qxb2 18.Bd6 Bxg1 19.e5 Qxa1+ 20.Ke2 Na6
21.Nxg7+ Kd8 22.Qf6+ Nxf6 23.Be7# 1-0`,
};

export const SAMPLE_GAMES: SampleGame[] = [
  MORPHY_OPERA,
  ANDERSSEN_KIESERITZKY,
  FISCHER_BYRNE,
  KASPAROV_TOPALOV,
];
