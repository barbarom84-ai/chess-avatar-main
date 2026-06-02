import type { NavFamily, NavItemDef } from "@/lib/nav-items";
import type { Language, TranslationKey } from "@/lib/i18n";
import type { NavPageBadge } from "@/lib/site-config";

type Translations = TranslationKey;

export function isNavItemActive(pathname: string, href: string): boolean {
  return (
    pathname === href ||
    (href === "/learn" && pathname.startsWith("/learn")) ||
    (href === "/puzzles" && pathname.startsWith("/puzzles")) ||
    (href === "/ascension" && pathname.startsWith("/ascension")) ||
    (href === "/arena" && pathname.startsWith("/arena")) ||
    (href === "/play" && pathname.startsWith("/play")) ||
    (href === "/online" && pathname.startsWith("/online")) ||
    (href === "/admin/ops" && pathname.startsWith("/admin/ops")) ||
    (href === "/admin/site" && pathname.startsWith("/admin/site"))
  );
}

export function isNavFamilyActive(pathname: string, items: NavItemDef[]): boolean {
  return items.some((item) => isNavItemActive(pathname, item.href));
}

export function navItemLabel(item: NavItemDef, lang: Language, t: Translations): string {
  if (item.href === "/analyze") return t.pages.analyze.nav;
  if (item.href === "/play") return t.pages.play.nav;
  if (item.href === "/online") return t.pages.online.nav;
  if (item.href === "/arena") return t.pages.arena.nav;
  if (item.href === "/learn") return t.pages.learn.nav;
  if (item.href === "/puzzles") return t.pages.puzzles.nav;
  if (item.href === "/ascension") return t.pages.ascension.nav;
  if (item.href === "/profile") return t.pages.profile.nav;
  if (item.href === "/avatars") return t.pages.avatars.nav;
  if (item.href === "/games") return t.pages.games.nav;
  if (item.href === "/guide") return t.pages.guide.nav;
  return item.label[lang];
}

export function navItemDescription(item: NavItemDef, t: Translations): string {
  const desc = t.navigation.pageDesc;
  if (item.href === "/analyze") return desc.analyze;
  if (item.href === "/play") return desc.play;
  if (item.href === "/online") return desc.online;
  if (item.href === "/arena") return desc.arena;
  if (item.href === "/learn") return desc.learn;
  if (item.href === "/puzzles") return desc.puzzles;
  if (item.href === "/ascension") return desc.ascension;
  if (item.href === "/profile") return desc.profile;
  if (item.href === "/avatars") return desc.avatars;
  if (item.href === "/games") return desc.games;
  if (item.href === "/guide") return desc.guide;
  return item.label.en;
}

export function navFamilyLabel(family: NavFamily, lang: Language, t: Translations): string {
  return t.navigation.families[family].label[lang === "fr" ? "fr" : "en"];
}

export function navFamilyDescription(family: NavFamily, lang: Language, t: Translations): string {
  return t.navigation.families[family].desc[lang === "fr" ? "fr" : "en"];
}

export function navBadgeLabel(badge: NavPageBadge, lang: Language): string | null {
  if (badge === "beta") return lang === "fr" ? "Bêta" : "Beta";
  if (badge === "maintenance") return lang === "fr" ? "Maintenance" : "Maintenance";
  return null;
}

export function navDockGroupLabel(
  family: NavFamily,
  lang: Language,
  t: Translations
): string {
  if (family === "play") return t.navigation.dock.groups.play[lang === "fr" ? "fr" : "en"];
  if (family === "learn") return t.navigation.dock.groups.train[lang === "fr" ? "fr" : "en"];
  return t.navigation.dock.groups.account[lang === "fr" ? "fr" : "en"];
}
