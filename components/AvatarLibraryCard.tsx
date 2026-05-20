"use client";

import { useMemo } from "react";
import { Play, Download, Settings, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AvatarTradingCard from "@/components/AvatarTradingCard";
import type { DbProfile } from "@/lib/supabase";
import type { PersonaStats } from "@/lib/analysis";
import { buildAvatarCardModel } from "@/lib/avatar-card-model";
import { getAvatarCardLabels } from "@/lib/avatar-card-labels";
import { useLanguage } from "@/lib/language-context";
import type { ProfileMetadata } from "@/types/chess";
import { generateAIAnalysis } from "@/lib/ai-analysis";
import { derivePlayingStyle } from "@/lib/avatar-card-model";

type AvatarLibraryCardProps = {
  profile: DbProfile;
  metadata?: ProfileMetadata | null;
  onPlay: (profile: DbProfile) => void;
  onDetails: (profile: DbProfile) => void;
  onDownload?: (profile: DbProfile) => void;
  onTogglePublic?: (profile: DbProfile) => void;
  onDelete?: (id: string) => void;
  selected?: boolean;
  compareMode?: boolean;
  onSelectCompare?: (profile: DbProfile) => void;
};

export default function AvatarLibraryCard({
  profile,
  metadata,
  onPlay,
  onDetails,
  onDownload,
  onTogglePublic,
  onDelete,
  selected = false,
  compareMode = false,
  onSelectCompare,
}: AvatarLibraryCardProps) {
  const { t } = useLanguage();
  const labels = useMemo(() => getAvatarCardLabels(t), [t]);

  const cardModel = useMemo(() => {
    const stats = profile.stats as PersonaStats;
    const config = profile.config;
    const playingStyle = derivePlayingStyle(config, metadata);
    const analysis = generateAIAnalysis(
      playingStyle,
      stats,
      metadata?.gamesPlayed ?? stats.gameCount
    );
    return buildAvatarCardModel({
      stats,
      config,
      metadata: metadata ?? undefined,
      analysis,
      labels,
    });
  }, [profile, metadata, labels]);

  const footer = (
    <div className="grid grid-cols-3 gap-1" data-card-action>
      <Button
        size="sm"
        type="button"
        onClick={() => onPlay(profile)}
        className="bg-blue-600 hover:bg-blue-500 h-8 px-1"
        title={t.profile.playAgainst}
      >
        <Play className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        type="button"
        onClick={() => onDetails(profile)}
        className="bg-purple-600 hover:bg-purple-500 h-8 px-1"
        title={t.profile.viewDetails}
      >
        <Settings className="h-3.5 w-3.5" />
      </Button>
      {onDownload && (
        <Button
          size="sm"
          type="button"
          variant="outline"
          onClick={() => onDownload(profile)}
          className="border-green-500/50 h-8 px-1"
          title={t.profile.exportJson}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      )}
      {onTogglePublic && (
        <Button
          size="sm"
          type="button"
          variant="ghost"
          onClick={() => onTogglePublic(profile)}
          className="h-8 px-1 col-span-1"
          aria-label={
            profile.is_public ? t.profile.makePrivate : t.profile.makePublic
          }
        >
          {profile.is_public ? (
            <Eye className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <EyeOff className="h-3.5 w-3.5 text-slate-500" />
          )}
        </Button>
      )}
      {onDelete && (
        <Button
          size="sm"
          type="button"
          variant="ghost"
          onClick={() => onDelete(profile.id)}
          className="h-8 px-1 text-red-400"
          aria-label={t.profile.deleteProfile}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );

  return (
    <div
      className={
        selected
          ? "ring-2 ring-cyan-400 rounded-xl"
          : compareMode
            ? "cursor-pointer"
            : ""
      }
      onClick={
        compareMode && onSelectCompare
          ? () => onSelectCompare(profile)
          : undefined
      }
      role={compareMode ? "button" : undefined}
      tabIndex={compareMode ? 0 : undefined}
      onKeyDown={
        compareMode && onSelectCompare
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectCompare(profile);
              }
            }
          : undefined
      }
    >
      <AvatarTradingCard
        model={cardModel}
        labels={labels}
        size="md"
        flippable={!compareMode}
        footer={footer}
        className="w-full"
      />
    </div>
  );
}
