"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { NavItemDef } from "@/lib/nav-items";
import type { Language, TranslationKey } from "@/lib/i18n";
import type { PieceSet } from "@/contexts/ChessboardSettingsContext";
import { getPieceImagePath } from "@/contexts/ChessboardSettingsContext";
import type { NavPageBadge } from "@/lib/site-config";

type Translations = TranslationKey;

function navBadgeLabel(badge: NavPageBadge, lang: Language): string | null {
  if (badge === "beta") return lang === "fr" ? "Bêta" : "Beta";
  if (badge === "maintenance") return lang === "fr" ? "Maintenance" : "Maintenance";
  return null;
}

function isNavItemActive(pathname: string, href: string): boolean {
  return (
    pathname === href ||
    (href === "/learn" && pathname.startsWith("/learn")) ||
    (href === "/puzzles" && pathname.startsWith("/puzzles")) ||
    (href === "/ascension" && pathname.startsWith("/ascension")) ||
    (href === "/arena" && pathname.startsWith("/arena")) ||
    (href === "/play" && pathname.startsWith("/play")) ||
    (href === "/online" && pathname.startsWith("/online")) ||
    (href === "/admin/ops" && pathname.startsWith("/admin/ops"))
  );
}

function navItemLabel(item: NavItemDef, lang: Language, t: Translations): string {
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

export default function NavItemLinks({
  items,
  pathname,
  pieceSet,
  lang,
  t,
  compact,
  navConfig,
}: {
  items: NavItemDef[];
  pathname: string;
  pieceSet: PieceSet;
  lang: Language;
  t: Translations;
  compact: boolean;
  navConfig: Record<string, { hidden?: boolean; badge?: NavPageBadge }>;
}) {
  return (
    <>
      {items.map((item) => {
        const isActive = isNavItemActive(pathname, item.href);
        const pieceSrc = getPieceImagePath(
          pieceSet,
          item.navPieceColor,
          item.piece
        );
        const label = navItemLabel(item, lang, t);
        const badge = navConfig[item.href]?.badge ?? "none";
        const badgeText = navBadgeLabel(badge, lang);
        const inactiveClass = compact
          ? "text-slate-300 hover:text-cyan-300"
          : "text-slate-300 hover:text-cyan-300 hover:bg-slate-800";

        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className={`${
                isActive ? "bg-cyan-600 text-white" : inactiveClass
              } whitespace-normal leading-tight text-center`}
            >
              <Image
                src={pieceSrc}
                alt={item.piece}
                width={20}
                height={20}
                className="inline-block w-5 h-5"
                unoptimized
              />
              <span className={compact ? "ml-1 text-xs" : "ml-2"}>
                {label}
                {item.premium && (
                  <span className="ml-1.5 inline-block rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-amber-500/25 text-amber-200">
                    Premium
                  </span>
                )}
                {badgeText && (
                  <span
                    className={`ml-1.5 inline-block rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                      badge === "beta"
                        ? "bg-purple-500/25 text-purple-200"
                        : "bg-amber-500/25 text-amber-200"
                    }`}
                  >
                    {badgeText}
                  </span>
                )}
              </span>
            </Button>
          </Link>
        );
      })}
    </>
  );
}
