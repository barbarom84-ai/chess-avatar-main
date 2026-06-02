"use client";

import { useCallback, useEffect } from "react";
import Image from "next/image";
import type { NavItemDef } from "@/lib/nav-items";
import {
  RADIAL_PRIMARY_HREFS,
  RADIAL_SECONDARY_HREFS,
} from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import RadialNavSlot from "./RadialNavSlot";
import { useRadialNavPositions } from "./useRadialNavPositions";
import type { NavCommonProps } from "./NavShared";

export default function RadialNavMenu({
  open,
  onOpenChange,
  items,
  pathname,
  pieceSet,
  lang,
  t,
  navConfig,
  anchor = "header",
}: NavCommonProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor?: "header" | "fab";
}) {
  const primaryItems = RADIAL_PRIMARY_HREFS.map((href) =>
    items.find((item) => item.href === href)
  ).filter((item): item is NavItemDef => Boolean(item));

  const secondaryItems = RADIAL_SECONDARY_HREFS.map((href) =>
    items.find((item) => item.href === href)
  ).filter((item): item is NavItemDef => Boolean(item));

  const { outer, inner } = useRadialNavPositions(primaryItems.length, secondaryItems.length);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label={t.navigation.radial.openMenu[lang === "fr" ? "fr" : "en"]}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        aria-label={t.navigation.radial.closeMenu[lang === "fr" ? "fr" : "en"]}
        onClick={close}
      />

      <div
        className={cn(
          "absolute",
          anchor === "fab"
            ? "bottom-20 right-6 md:bottom-auto md:right-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
            : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
        style={{ width: 320, height: 320 }}
      >
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <button
            type="button"
            onClick={close}
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-cyan-500/50 bg-slate-900 glow-cyan shadow-xl transition-transform hover:scale-105"
            aria-label={t.navigation.radial.closeMenu[lang === "fr" ? "fr" : "en"]}
          >
            <Image
              src="/knight-logo.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9"
              unoptimized
            />
          </button>
        </div>

        {primaryItems.map((item, i) => (
          <RadialNavSlot
            key={item.href}
            item={item}
            position={outer[i]}
            pieceSet={pieceSet}
            lang={lang}
            t={t}
            navConfig={navConfig}
            pathname={pathname}
            delayMs={i * 40}
            onNavigate={close}
          />
        ))}

        {secondaryItems.length > 0 && (
          <p
            className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-8 text-[9px] uppercase tracking-widest text-slate-500 pointer-events-none"
            aria-hidden
          >
            {t.navigation.radial.accountRing[lang === "fr" ? "fr" : "en"]}
          </p>
        )}

        {secondaryItems.map((item, i) => (
          <RadialNavSlot
            key={item.href}
            item={item}
            position={inner[i]}
            pieceSet={pieceSet}
            lang={lang}
            t={t}
            navConfig={navConfig}
            pathname={pathname}
            delayMs={80 + i * 40}
            onNavigate={close}
          />
        ))}
      </div>
    </div>
  );
}
