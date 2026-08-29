"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Play, Download, Settings, Eye, EyeOff, Trash2, MessageCircle, Star, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AvatarTradingCard from "@/components/AvatarTradingCard";
import type { DbProfile } from "@/lib/supabase";
import type { PersonaStats } from "@/lib/analysis";
import { buildAvatarCardModel } from "@/lib/avatar-card-model";
import { getAvatarCardLabels } from "@/lib/avatar-card-labels";
import { useLanguage } from "@/lib/language-context";
import type { ProfileMetadata } from "@/types/chess";
import type { ProfileCollection } from "@/lib/profile-collections";

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
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  collections?: ProfileCollection[];
  onAddToCollection?: (collectionId: string) => void;
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
  isFavorite = false,
  onToggleFavorite,
  collections,
  onAddToCollection,
}: AvatarLibraryCardProps) {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const labels = useMemo(() => getAvatarCardLabels(t), [t]);

  const cardModel = useMemo(() => {
    const stats = profile.stats as PersonaStats;
    const config = profile.config;
    return buildAvatarCardModel({
      stats,
      config,
      metadata: metadata ?? undefined,
      labels,
      lang,
    });
  }, [profile, metadata, labels, lang]);

  const footer = (
    <div className="flex items-center justify-center gap-0.5" data-card-action>
      {onToggleFavorite && (
        <Button
          size="sm"
          type="button"
          variant="ghost"
          onClick={onToggleFavorite}
          className="h-8 w-8 px-0"
          title={isFavorite ? t.collections.removeFavorite : t.collections.addFavorite}
        >
          <Star
            className={`h-3.5 w-3.5 ${
              isFavorite ? "fill-yellow-400 text-yellow-400" : "text-slate-400"
            }`}
          />
        </Button>
      )}
      <Button
        size="sm"
        type="button"
        onClick={() => onPlay(profile)}
        className="bg-blue-600 hover:bg-blue-500 h-8 w-8 px-0"
        title={t.profile.playAgainst}
      >
        <Play className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        type="button"
        onClick={() => router.push(`/coach/${profile.id}`)}
        className="bg-cyan-700 hover:bg-cyan-600 h-8 w-8 px-0"
        title={t.profileDetails.coach}
      >
        <MessageCircle className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        type="button"
        onClick={() => onDetails(profile)}
        className="bg-purple-600 hover:bg-purple-500 h-8 w-8 px-0"
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
          className="border-green-500/50 h-8 w-8 px-0"
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
          className="h-8 w-8 px-0"
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
      {onAddToCollection && collections && collections.length > 0 && (
        <label className="relative h-8 w-8">
          <FolderPlus className="pointer-events-none absolute inset-0 m-auto h-3.5 w-3.5 text-cyan-300" />
          <select
            aria-label={t.collections.addToCollection}
            className="h-8 w-8 cursor-pointer opacity-0"
            value=""
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const id = e.target.value;
              if (id) onAddToCollection(id);
            }}
          >
            <option value="">{t.collections.addToCollection}</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {onDelete && (
        <Button
          size="sm"
          type="button"
          variant="ghost"
          onClick={() => onDelete(profile.id)}
          className="h-8 w-8 px-0 text-red-400"
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
        size="lg"
        flippable={!compareMode}
        footer={footer}
        onDetails={() => onDetails(profile)}
        className="w-full"
      />
    </div>
  );
}
