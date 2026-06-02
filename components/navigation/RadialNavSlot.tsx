"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NavItemDef } from "@/lib/nav-items";
import {
  isNavItemActive,
  navItemLabel,
} from "@/lib/nav-utils";
import type { Language, TranslationKey } from "@/lib/i18n";
import type { PieceSet } from "@/contexts/ChessboardSettingsContext";
import type { NavPageBadge } from "@/lib/site-config";
import { NavItemBadges, NavPieceIcon } from "./NavShared";
import type { RadialSlotPosition } from "./useRadialNavPositions";

type Translations = TranslationKey;

export default function RadialNavSlot({
  item,
  position,
  pieceSet,
  lang,
  t,
  navConfig,
  pathname,
  delayMs,
  onNavigate,
}: {
  item: NavItemDef;
  position: RadialSlotPosition;
  pieceSet: PieceSet;
  lang: Language;
  t: Translations;
  navConfig: Record<string, { hidden?: boolean; badge?: NavPageBadge }>;
  pathname: string;
  delayMs: number;
  onNavigate?: () => void;
}) {
  const isActive = isNavItemActive(pathname, item.href);
  const label = navItemLabel(item, lang, t);
  const badge = navConfig[item.href]?.badge ?? "none";

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "absolute flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition-all duration-300",
        "animate-in fade-in zoom-in-95",
        isActive
          ? "border-cyan-400/60 bg-cyan-600/25 text-cyan-100 glow-cyan"
          : "border-slate-700/80 bg-slate-900/90 text-slate-200 hover:border-cyan-500/40 hover:bg-slate-800/95 hover:text-cyan-200"
      )}
      style={{
        left: `calc(50% + ${position.x}px)`,
        top: `calc(50% + ${position.y}px)`,
        transform: "translate(-50%, -50%)",
        animationDelay: `${delayMs}ms`,
        animationFillMode: "backwards",
        minWidth: "4.5rem",
      }}
    >
      <NavPieceIcon item={item} pieceSet={pieceSet} size={24} />
      <span className="text-[10px] font-medium leading-tight max-w-[5rem]">
        {label}
        <NavItemBadges item={item} badge={badge} lang={lang} />
      </span>
    </Link>
  );
}
