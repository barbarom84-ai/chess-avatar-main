"use client";

import { ArrowUpDown, Filter, Search } from "lucide-react";
import type { EngineConfig } from "@/lib/analysis";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import type {
  AvatarLibraryPlatformFilter,
  AvatarLibraryPlayStyleFilter,
  AvatarLibrarySort,
  AvatarLibraryVisibilityFilter,
} from "@/lib/avatar-library-filters";

type AvatarLibrarySearchFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  platform: AvatarLibraryPlatformFilter;
  onPlatformChange: (value: AvatarLibraryPlatformFilter) => void;
  playStyle: AvatarLibraryPlayStyleFilter;
  onPlayStyleChange: (value: AvatarLibraryPlayStyleFilter) => void;
  sort: AvatarLibrarySort;
  onSortChange: (value: AvatarLibrarySort) => void;
  visibility?: AvatarLibraryVisibilityFilter;
  onVisibilityChange?: (value: AvatarLibraryVisibilityFilter) => void;
  resultCount?: number;
  className?: string;
};

const PLAY_STYLES: EngineConfig["playStyle"][] = [
  "agressif",
  "solide",
  "équilibré",
  "positionnel",
  "tactique",
];

export default function AvatarLibrarySearchFilters({
  search,
  onSearchChange,
  platform,
  onPlatformChange,
  playStyle,
  onPlayStyleChange,
  sort,
  onSortChange,
  visibility = "all",
  onVisibilityChange,
  resultCount,
  className = "",
}: AvatarLibrarySearchFiltersProps) {
  const { t } = useLanguage();

  const playStyleLabel = (key: AvatarLibraryPlayStyleFilter): string => {
    if (key === "all") return t.library.all;
    const map: Record<string, string> = {
      agressif: t.engineConfig.playStyleAggressive,
      solide: t.engineConfig.playStyleSolid,
      équilibré: t.engineConfig.playStyleBalanced,
      positionnel: t.engineConfig.playStylePositional,
      tactique: t.engineConfig.playStyleTactical,
    };
    return map[key] ?? key;
  };

  const chipClass = (active: boolean) =>
    active
      ? "bg-amber-600/90 text-white border-amber-500"
      : "bg-slate-950 border-slate-700 text-slate-300 hover:border-amber-500/50";

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.library.searchPlaceholder}
          className="pl-9 bg-slate-950 border-slate-700 text-slate-100"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3 text-slate-400" />
            <span className="text-xs text-slate-400">{t.library.platformFilter}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["all", t.library.platformAll],
                ["lichess", t.library.platformLichess],
                ["chesscom", t.library.platformChesscom],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant="outline"
                className={`h-8 text-xs ${chipClass(platform === value)}`}
                onClick={() => onPlatformChange(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1 flex-1 min-w-[140px]">
          <span className="text-xs text-slate-400 block">{t.library.style}</span>
          <select
            value={playStyle}
            onChange={(e) =>
              onPlayStyleChange(e.target.value as AvatarLibraryPlayStyleFilter)
            }
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-200"
          >
            <option value="all">{t.library.all}</option>
            {PLAY_STYLES.map((style) => (
              <option key={style} value={style}>
                {playStyleLabel(style)}
              </option>
            ))}
          </select>
        </div>

        {onVisibilityChange && (
          <div className="space-y-1 flex-1 min-w-[140px]">
            <span className="text-xs text-slate-400 block">{t.library.visibility}</span>
            <select
              value={visibility}
              onChange={(e) =>
                onVisibilityChange(e.target.value as AvatarLibraryVisibilityFilter)
              }
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-200"
            >
              <option value="all">{t.library.all}</option>
              <option value="public">{t.library.public}</option>
              <option value="private">{t.library.private}</option>
            </select>
          </div>
        )}

        <div className="space-y-1 flex-1 min-w-[140px]">
          <div className="flex items-center gap-1">
            <ArrowUpDown className="h-3 w-3 text-slate-400" />
            <span className="text-xs text-slate-400">{t.library.sortBy}</span>
          </div>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as AvatarLibrarySort)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-200"
          >
            <option value="elo_desc">{t.library.elo} ↓</option>
            <option value="elo_asc">{t.library.elo} ↑</option>
            <option value="name_asc">{t.library.name}</option>
            <option value="difficulty_desc">{t.library.difficulty}</option>
          </select>
        </div>
      </div>

      {resultCount != null && (
        <p className="text-xs text-slate-500">
          {t.library.profilesShown.replace("{count}", String(resultCount))}
        </p>
      )}
    </div>
  );
}
