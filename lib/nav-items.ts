export type NavPieceColor = "w" | "b";

export type NavItemDef = {
  href: string;
  piece: string;
  navPieceColor: NavPieceColor;
  label: { fr: string; en: string };
  /** Fixed product rule: show a Premium badge in navigation (not configurable in site admin). */
  premium?: boolean;
};

/** Canonical site navigation pages (used by Navigation + site admin). */
export const NAV_ITEMS: NavItemDef[] = [
  { href: "/analyze", piece: "Q", navPieceColor: "w", label: { fr: "Créer", en: "Build" } },
  { href: "/play", piece: "N", navPieceColor: "w", label: { fr: "Jouer", en: "Play" } },
  { href: "/online", piece: "P", navPieceColor: "b", label: { fr: "PvP", en: "PvP" } },
  { href: "/arena", piece: "R", navPieceColor: "w", label: { fr: "Arène", en: "Arena" } },
  { href: "/learn", piece: "B", navPieceColor: "w", label: { fr: "Ouvertures", en: "Openings" } },
  { href: "/puzzles", piece: "P", navPieceColor: "w", label: { fr: "Puzzles", en: "Puzzles" } },
  {
    href: "/ascension",
    piece: "Q",
    navPieceColor: "w",
    label: { fr: "Ascension", en: "Ascension" },
    premium: true,
  },
  { href: "/profile", piece: "K", navPieceColor: "w", label: { fr: "Compte", en: "Account" } },
  { href: "/avatars", piece: "B", navPieceColor: "b", label: { fr: "Avatars", en: "Avatars" } },
  { href: "/games", piece: "Q", navPieceColor: "b", label: { fr: "Parties", en: "Games" } },
  { href: "/guide", piece: "R", navPieceColor: "b", label: { fr: "Guide", en: "Guide" } },
];

export const NAV_HREFS = NAV_ITEMS.map((item) => item.href);
