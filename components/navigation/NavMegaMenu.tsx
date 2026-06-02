"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_FAMILIES, groupNavItemsByFamily, type NavFamily } from "@/lib/nav-items";
import {
  isNavFamilyActive,
  navFamilyLabel,
} from "@/lib/nav-utils";
import { cn } from "@/lib/utils";
import NavMegaMenuPanel from "./NavMegaMenuPanel";
import NavMobileSheet from "./NavMobileSheet";
import type { NavCommonProps } from "./NavShared";

const FAMILY_PIECES: Record<NavFamily, { piece: string; color: "w" | "b" }> = {
  play: { piece: "N", color: "w" },
  learn: { piece: "B", color: "w" },
  account: { piece: "K", color: "w" },
};

export default function NavMegaMenu(props: NavCommonProps) {
  const { items, pathname, lang, t } = props;
  const grouped = groupNavItemsByFamily(items);
  const [openFamily, setOpenFamily] = useState<NavFamily | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const closeDropdown = useCallback(() => setOpenFamily(null), []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") closeDropdown();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeDropdown]);

  const renderFamilyTrigger = (family: NavFamily, mobile = false) => {
    const familyItems = grouped[family];
    if (familyItems.length === 0) return null;
    const isActive = isNavFamilyActive(pathname, familyItems);
    const isOpen = openFamily === family;
    const label = navFamilyLabel(family, lang, t);

    return (
      <div key={family} className="relative">
        <Button
          type="button"
          variant={isActive ? "default" : "ghost"}
          size="sm"
          aria-expanded={mobile ? undefined : isOpen}
          aria-haspopup="menu"
          aria-controls={mobile ? undefined : `nav-mega-${family}`}
          onClick={() => {
            if (mobile) {
              setMobileOpen(true);
              setOpenFamily(family);
            } else {
              setOpenFamily(isOpen ? null : family);
            }
          }}
          className={cn(
            isActive ? "bg-cyan-600 text-white" : "text-slate-300 hover:text-cyan-300 hover:bg-slate-800",
            mobile && "w-full justify-between"
          )}
        >
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs opacity-70" aria-hidden>
              {FAMILY_PIECES[family].piece}
            </span>
            {label}
          </span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", isOpen && !mobile && "rotate-180")}
            aria-hidden
          />
        </Button>
        {!mobile && isOpen && (
          <div id={`nav-mega-${family}`}>
            <NavMegaMenuPanel
              {...props}
              family={family}
              items={familyItems}
              onNavigate={closeDropdown}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div ref={containerRef} className="hidden md:flex items-center gap-1">
        {NAV_FAMILIES.map((family) => renderFamilyTrigger(family))}
      </div>

      <div className="md:hidden">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-slate-700 bg-slate-900 text-cyan-300"
          onClick={() => setMobileOpen(true)}
          aria-haspopup="dialog"
        >
          {t.navigation.mega.mobileTitle[lang === "fr" ? "fr" : "en"]}
          <ChevronDown className="ml-1 h-4 w-4" aria-hidden />
        </Button>
        <NavMobileSheet
          open={mobileOpen}
          onOpenChange={setMobileOpen}
          title={t.navigation.mega.mobileTitle[lang === "fr" ? "fr" : "en"]}
        >
          <div className="space-y-4">
            {NAV_FAMILIES.map((family) => {
              const familyItems = grouped[family];
              if (familyItems.length === 0) return null;
              return (
                <section key={family}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-500/80">
                    {navFamilyLabel(family, lang, t)}
                  </h3>
                  <NavMegaMenuPanel
                    {...props}
                    family={family}
                    items={familyItems}
                    variant="sheet"
                    onNavigate={() => setMobileOpen(false)}
                  />
                </section>
              );
            })}
          </div>
        </NavMobileSheet>
      </div>
    </>
  );
}
