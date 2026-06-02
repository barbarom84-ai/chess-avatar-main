export type NavPieceColor = "w" | "b";

export type NavFamily = "play" | "learn" | "account";

export type NavItemDef = {
  href: string;
  piece: string;
  navPieceColor: NavPieceColor;
  label: { fr: string; en: string };
  family: NavFamily;
  /** Fixed product rule: show a Premium badge in navigation (not configurable in site admin). */
  premium?: boolean;
};

export const NAV_FAMILIES: NavFamily[] = ["play", "learn", "account"];

/** Canonical site navigation pages (used by Navigation + site admin). */
export const NAV_ITEMS: NavItemDef[] = [
  {
    href: "/analyze",
    piece: "Q",
    navPieceColor: "w",
    label: { fr: "Créer", en: "Build" },
    family: "play",
  },
  {
    href: "/play",
    piece: "N",
    navPieceColor: "w",
    label: { fr: "Jouer", en: "Play" },
    family: "play",
  },
  {
    href: "/online",
    piece: "P",
    navPieceColor: "b",
    label: { fr: "PvP", en: "PvP" },
    family: "play",
  },
  {
    href: "/arena",
    piece: "R",
    navPieceColor: "w",
    label: { fr: "Arène", en: "Arena" },
    family: "play",
  },
  {
    href: "/learn",
    piece: "B",
    navPieceColor: "w",
    label: { fr: "Ouvertures", en: "Openings" },
    family: "learn",
  },
  {
    href: "/puzzles",
    piece: "P",
    navPieceColor: "w",
    label: { fr: "Puzzles", en: "Puzzles" },
    family: "learn",
  },
  {
    href: "/ascension",
    piece: "Q",
    navPieceColor: "w",
    label: { fr: "Ascension", en: "Ascension" },
    family: "learn",
    premium: true,
  },
  {
    href: "/profile",
    piece: "K",
    navPieceColor: "w",
    label: { fr: "Compte", en: "Account" },
    family: "account",
  },
  {
    href: "/avatars",
    piece: "B",
    navPieceColor: "b",
    label: { fr: "Avatars", en: "Avatars" },
    family: "account",
  },
  {
    href: "/games",
    piece: "Q",
    navPieceColor: "b",
    label: { fr: "Parties", en: "Games" },
    family: "account",
  },
  {
    href: "/guide",
    piece: "R",
    navPieceColor: "b",
    label: { fr: "Guide", en: "Guide" },
    family: "account",
  },
];

export const NAV_HREFS = NAV_ITEMS.map((item) => item.href);

export function groupNavItemsByFamily(items: NavItemDef[]): Record<NavFamily, NavItemDef[]> {
  return NAV_FAMILIES.reduce(
    (acc, family) => {
      acc[family] = items.filter((item) => item.family === family);
      return acc;
    },
    {} as Record<NavFamily, NavItemDef[]>
  );
}

/** Primary radial slots (outer ring) — most-used destinations. */
export const RADIAL_PRIMARY_HREFS = [
  "/analyze",
  "/play",
  "/online",
  "/arena",
  "/learn",
  "/puzzles",
  "/ascension",
] as const;

/** Secondary radial slots (inner ring) — account section. */
export const RADIAL_SECONDARY_HREFS = [
  "/profile",
  "/avatars",
  "/games",
  "/guide",
] as const;
