"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { NavItemDef } from "@/lib/nav-items";
import type { Language, TranslationKey } from "@/lib/i18n";
import type { PieceSet } from "@/contexts/ChessboardSettingsContext";
import type { NavPageBadge } from "@/lib/site-config";
import { isNavItemActive, navItemLabel } from "@/lib/nav-utils";
import { NavItemBadges, NavPieceIcon } from "./NavShared";

type Translations = TranslationKey;

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
        const label = navItemLabel(item, lang, t);
        const badge = navConfig[item.href]?.badge ?? "none";
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
              <NavPieceIcon item={item} pieceSet={pieceSet} />
              <span className={compact ? "ml-1 text-xs" : "ml-2"}>
                {label}
                <NavItemBadges item={item} badge={badge} lang={lang} />
              </span>
            </Button>
          </Link>
        );
      })}
    </>
  );
}
