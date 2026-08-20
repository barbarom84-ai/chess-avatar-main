"use client";

import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import type { LibraryViewMode } from "@/lib/library-view-mode";

type AvatarCardViewToggleProps = {
  mode: LibraryViewMode;
  onChange: (mode: LibraryViewMode) => void;
  className?: string;
};

export default function AvatarCardViewToggle({
  mode,
  onChange,
  className = "",
}: AvatarCardViewToggleProps) {
  const { t } = useLanguage();

  return (
    <div
      className={`inline-flex rounded-md border border-slate-700 bg-slate-900/80 p-0.5 ${className}`}
      role="group"
      aria-label={t.avatarCard.viewCards}
    >
      <Button
        type="button"
        size="sm"
        variant={mode === "list" ? "secondary" : "ghost"}
        className="h-8 px-2.5 gap-1.5"
        onClick={() => onChange("list")}
        aria-pressed={mode === "list"}
      >
        <List className="h-3.5 w-3.5" />
        <span className="text-xs">{t.avatarCard.viewList}</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant={mode === "cards" ? "secondary" : "ghost"}
        className="h-8 px-2.5 gap-1.5"
        onClick={() => onChange("cards")}
        aria-pressed={mode === "cards"}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span className="text-xs">{t.avatarCard.viewCards}</span>
      </Button>
    </div>
  );
}
