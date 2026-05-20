"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, Swords } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { getFilteredProfiles } from "@/lib/supabase-storage";
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
import ProfileDetailsModal from "@/components/ProfileDetailsModal";

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
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
            </div>
          ) : profiles.length === 0 ? (
            <Alert className="bg-slate-950/50 border-slate-700">
              <AlertDescription className="text-sm text-slate-400 space-y-3">
                <p>{t.avatarsPage.championsEmpty}</p>
                <Button size="sm" asChild>
                  <Link href="/analyze">
                    <Search className="h-4 w-4 mr-1" />
                    {t.avatarsPage.championsAnalyzeCta}
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <AvatarTradingCardGrid>
              {profiles.map((p) => (
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
          )}
        </CardContent>
      </Card>

      {selectedProfile && (
        <ProfileDetailsModal
          profile={selectedProfile}
          open={showModal}
          onOpenChange={setShowModal}
          onPlay={(p) => {
            const configParam = encodeURIComponent(JSON.stringify(p.config));
            router.push(`/play?config=${configParam}`);
          }}
        />
      )}
    </>
  );
}
