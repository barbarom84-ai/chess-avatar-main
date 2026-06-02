"use client";

import Image from "next/image";
import type { NavItemDef } from "@/lib/nav-items";
import type { Language, TranslationKey } from "@/lib/i18n";
import type { PieceSet } from "@/contexts/ChessboardSettingsContext";
import { getPieceImagePath } from "@/contexts/ChessboardSettingsContext";
import type { NavPageBadge } from "@/lib/site-config";
import { navBadgeLabel } from "@/lib/nav-utils";

type Translations = TranslationKey;

export function NavPieceIcon({
  item,
  pieceSet,
  size = 20,
  className,
}: {
  item: NavItemDef;
  pieceSet: PieceSet;
  size?: number;
  className?: string;
}) {
  const pieceSrc = getPieceImagePath(pieceSet, item.navPieceColor, item.piece);
  return (
    <Image
      src={pieceSrc}
      alt=""
      width={size}
      height={size}
      className={className ?? "inline-block shrink-0"}
      style={{ width: size, height: size }}
      unoptimized
    />
  );
}

export function NavItemBadges({
  item,
  badge,
  lang,
}: {
  item: NavItemDef;
  badge: NavPageBadge;
  lang: Language;
}) {
  const badgeText = navBadgeLabel(badge, lang);
  return (
    <>
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
    </>
  );
}

export type NavCommonProps = {
  items: NavItemDef[];
  pathname: string;
  pieceSet: PieceSet;
  lang: Language;
  t: Translations;
  navConfig: Record<string, { hidden?: boolean; badge?: NavPageBadge }>;
};
