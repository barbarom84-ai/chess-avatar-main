"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Play, Search, Settings, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import { getFilteredProfiles, updateProfile } from "@/lib/supabase-storage";
import { isSupabaseConfigured, type DbProfile } from "@/lib/supabase";
import { isFeaturedChampionConfig } from "@/lib/arena-featured-persist";
import AvatarLibraryCard from "@/components/AvatarLibraryCard";
import AvatarCardViewToggle from "@/components/AvatarCardViewToggle";
import { AvatarTradingCardGrid } from "@/components/AvatarTradingCard";
import { fetchMetadataForProfiles } from "@/lib/profile-metadata";
import {
  readLibraryViewMode,
  writeLibraryViewMode,
  type LibraryViewMode,
} from "@/lib/library-view-mode";
import type { ProfileMetadata } from "@/types/chess";
import AvatarLibrarySearchFilters from "@/components/AvatarLibrarySearchFilters";
import {
  filterAvatarProfiles,
  type AvatarLibraryPlatformFilter,
  type AvatarLibraryPlayStyleFilter,
  type AvatarLibrarySort,
} from "@/lib/avatar-library-filters";
import ProfileDetailsModal from "@/components/ProfileDetailsModal";
import { toast } from "sonner";

export default function ArenaChampionsLibrary() {
  const { t } = useLanguage();
  const router = useRouter();
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<LibraryViewMode>("cards");
  const [metadataMap, setMetadataMap] = useState<
    Map<string, ProfileMetadata>
  >(new Map());
  const [selectedProfile, setSelectedProfile] = useState<DbProfile | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] =
    useState<AvatarLibraryPlatformFilter>("all");
  const [playStyleFilter, setPlayStyleFilter] =
    useState<AvatarLibraryPlayStyleFilter>("all");
  const [sort, setSort] = useState<AvatarLibrarySort>("elo_desc");

  const filteredProfiles = useMemo(
    () =>
      filterAvatarProfiles(profiles, {
        search,
        platform: platformFilter,
        playStyle: playStyleFilter,
        sort,
      }),
    [profiles, search, platformFilter, playStyleFilter, sort]
  );

  useEffect(() => {
    setViewMode(readLibraryViewMode());
  }, []);

  const loadChampions = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getFilteredProfiles("public", "elo", 80, undefined, {
        platform: "all",
        dedupeByUsernamePlatform: true,
      });
      setProfiles(rows.filter((p) => isFeaturedChampionConfig(p.config)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    void loadChampions();
  }, [loadChampions]);

  useEffect(() => {
    if (profiles.length === 0) {
      setMetadataMap(new Map());
      return;
    }
    void fetchMetadataForProfiles(profiles.map((p) => p.id)).then(
      setMetadataMap
    );
  }, [profiles]);

  if (!isSupabaseConfigured) {
    return null;
  }

  return (
    <>
      <Card className="bg-slate-900/80 border-amber-500/25">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-300">
              <Swords className="h-5 w-5" />
              {t.avatarsPage.championsTitle}
            </CardTitle>
            <AvatarCardViewToggle
              mode={viewMode}
              onChange={(m) => {
                setViewMode(m);
                writeLibraryViewMode(m);
              }}
            />
          </div>
          <p className="text-xs text-slate-400">{t.avatarsPage.championsHint}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!loading && profiles.length > 0 && (
            <AvatarLibrarySearchFilters
              search={search}
              onSearchChange={setSearch}
              platform={platformFilter}
              onPlatformChange={setPlatformFilter}
              playStyle={playStyleFilter}
              onPlayStyleChange={setPlayStyleFilter}
              sort={sort}
              onSortChange={setSort}
              resultCount={filteredProfiles.length}
            />
          )}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
            </div>
          ) : filteredProfiles.length === 0 ? (
            <Alert className="bg-slate-950/50 border-slate-700">
              <AlertDescription className="text-sm text-slate-400">
                {profiles.length === 0
                  ? t.avatarsPage.championsEmpty
                  : t.avatarsPage.noFilterResults}
              </AlertDescription>
              {profiles.length === 0 && (
                <Button size="sm" asChild className="mt-3">
                  <Link href="/analyze">
                    <Search className="h-4 w-4 mr-1" />
                    {t.avatarsPage.championsAnalyzeCta}
                  </Link>
                </Button>
              )}
            </Alert>
          ) : viewMode === "cards" ? (
            <AvatarTradingCardGrid>
              {filteredProfiles.map((p) => (
                <AvatarLibraryCard
                  key={p.id}
                  profile={p}
                  metadata={metadataMap.get(p.id)}
                  onPlay={() => {
                    const configParam = encodeURIComponent(
                      JSON.stringify(p.config)
                    );
                    router.push(`/play?config=${configParam}`);
                  }}
                  onDetails={() => {
                    setSelectedProfile(p);
                    setShowModal(true);
                  }}
                />
              ))}
            </AvatarTradingCardGrid>
          ) : (
            <div className="space-y-2">
              {filteredProfiles.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-950 p-3 rounded border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-semibold text-slate-200 truncate">
                        {p.config.name || p.username}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          p.platform === "chesscom"
                            ? "border-green-500 text-green-300 bg-green-500/10"
                            : "border-blue-500 text-blue-300 bg-blue-500/10"
                        }`}
                      >
                        {p.platform === "chesscom" ? "Chess.com" : "Lichess"}
                      </Badge>
                      <Badge variant="outline" className="text-xs text-amber-300 border-amber-500/40">
                        {p.config.elo} ELO
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-2">
                    <span>
                      {t.profile.level}: {p.config.difficulty}/5
                    </span>
                    <span>
                      {t.profile.style}:{" "}
                      {
                        (
                          {
                            agressif: t.engineConfig.playStyleAggressive,
                            solide: t.engineConfig.playStyleSolid,
                            équilibré: t.engineConfig.playStyleBalanced,
                            positionnel: t.engineConfig.playStylePositional,
                            tactique: t.engineConfig.playStyleTactical,
                          } as Record<string, string>
                        )[p.config.playStyle] || p.config.playStyle
                      }
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const configParam = encodeURIComponent(JSON.stringify(p.config));
                        router.push(`/play?config=${configParam}`);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md border border-blue-700"
                      title={t.profile.playAgainst}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {t.profile.playAgainst}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedProfile(p);
                        setShowModal(true);
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-md border border-purple-700"
                      title={t.profile.viewDetails}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      {t.profile.viewDetails}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProfile && (
        <ProfileDetailsModal
          profile={selectedProfile}
          open={showModal}
          onOpenChange={setShowModal}
          onUpdate={async (id, updates) => {
            const res = await updateProfile(id, updates);
            if (res.success) {
              setSelectedProfile((prev) => {
                if (!prev || prev.id !== id) return prev;
                return {
                  ...prev,
                  ...updates,
                  config: updates.config !== undefined ? updates.config : prev.config,
                  stats: updates.stats !== undefined ? updates.stats : prev.stats,
                  is_public:
                    updates.is_public !== undefined ? updates.is_public : prev.is_public,
                  updated_at: new Date().toISOString(),
                };
              });
              await loadChampions();
              toast.success(t.profile.profileUpdated);
              return true;
            }
            toast.error(res.error || t.profileDetails.ownerOnlyEdit);
            return false;
          }}
          onPlay={(p) => {
            const configParam = encodeURIComponent(JSON.stringify(p.config));
            router.push(`/play?config=${configParam}`);
          }}
        />
      )}
    </>
  );
}
