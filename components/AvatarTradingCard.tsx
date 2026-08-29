"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  Bot,
  Flame,
  Mountain,
  Droplets,
  Wind,
  Circle,
  Shield,
  Swords,
  Sparkles,
  Cpu,
  Clock,
  ImageDown,
  RotateCw,
  ScrollText,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportCardAsPng } from "@/lib/export-card-image";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import type { AvatarCardModel } from "@/lib/avatar-card-model";
import type { AvatarCardLabels } from "@/lib/avatar-card-model";
import { shortOpeningName } from "@/lib/avatar-card-model";
import { useLanguage } from "@/lib/language-context";
import { getAvatarCardLabels } from "@/lib/avatar-card-labels";

const ELEMENT_ICONS = {
  fire: Flame,
  earth: Mountain,
  water: Droplets,
  air: Wind,
  neutral: Circle,
} as const;

const SIZE_CLASSES = {
  xs: {
    root: "w-[88px]",
    title: "text-[10px]",
    cost: "h-5 w-5 text-[8px]",
    pad: "p-1 gap-0.5",
    artMin: "min-h-[2.75rem]",
    badge: "text-[9px]",
    hideAbility: true,
    hideBadges: true,
    hideElementBadge: true,
  },
  sm: {
    root: "w-[160px]",
    title: "text-xs",
    cost: "h-7 w-7 text-xs",
    pad: "p-1.5 gap-1",
    artMin: "min-h-[6rem]",
    badge: "text-[10px]",
    hideAbility: true,
    hideBadges: false,
    hideElementBadge: false,
  },
  md: {
    root: "w-full",
    title: "text-base",
    cost: "h-10 w-10 text-sm",
    pad: "p-2.5 gap-2",
    artMin: "min-h-[11rem]",
    badge: "text-[11px]",
    hideAbility: false,
    hideBadges: false,
    hideElementBadge: false,
  },
  lg: {
    root: "w-full",
    title: "text-lg",
    cost: "h-11 w-11 text-sm",
    pad: "p-3 gap-2",
    artMin: "min-h-[13rem]",
    badge: "text-xs",
    hideAbility: false,
    hideBadges: false,
    hideElementBadge: false,
  },
} as const;

export type AvatarTradingCardProps = {
  model: AvatarCardModel;
  labels?: AvatarCardLabels;
  size?: keyof typeof SIZE_CLASSES;
  flippable?: boolean;
  interactive?: boolean;
  footer?: ReactNode;
  onClick?: () => void;
  className?: string;
  /** Contenu verso personnalisé (même cadre que le recto). */
  backContent?: ReactNode;
  /** Bouton export PNG */
  exportable?: boolean;
  /** Ouvre la fiche détaillée (bibliothèque). Sinon, dialogue interne. */
  onDetails?: () => void;
};

function TraitList({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: "strength" | "weakness";
}) {
  if (!items.length) return null;
  const Icon = variant === "strength" ? Sparkles : Shield;
  const color =
    variant === "strength" ? "text-emerald-400" : "text-rose-400";

  return (
    <div className="space-y-0.5 min-w-0">
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${color}`}>
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-1 text-slate-300 leading-tight text-xs"
          >
            <Icon className={`h-3 w-3 shrink-0 mt-0.5 ${color}`} aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StyleMeter({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const v = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between gap-1 text-[10px]">
        <span className="text-slate-500 truncate">{label}</span>
        <span className="text-slate-200 font-medium tabular-nums">{v}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-600/90 to-cyan-400/80"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

function FlipAffordance({
  hint,
  shortHint,
}: {
  hint: string;
  shortHint: string;
}) {
  return (
    <p
      className="flex items-center justify-center gap-1 text-[9px] text-slate-500 shrink-0"
      title={hint}
    >
      <RotateCw className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      <span className="truncate">{shortHint}</span>
    </p>
  );
}

function CardFace({
  model,
  labels,
  sizeKey,
  showFlipHint,
}: {
  model: AvatarCardModel;
  labels: AvatarCardLabels;
  sizeKey: keyof typeof SIZE_CLASSES;
  showFlipHint?: boolean;
}) {
  const sz = SIZE_CLASSES[sizeKey];
  const ElementIcon = ELEMENT_ICONS[model.element];
  const classLabel = labels.playStyles[model.classKey] ?? model.classKey;
  const rarityLabel = labels.rarities[model.rarity];
  const elementLabel = labels.elements[model.element];

  return (
    <div className={`flex h-full min-h-0 w-full flex-col overflow-hidden ${sz.pad}`}>
      <div
        className={`avatar-card-art relative w-full ${sz.artMin} rounded-md overflow-hidden border border-slate-700/80 bg-slate-950`}
      >
        {model.avatarUrl ? (
          <Image
            src={model.avatarUrl}
            alt={model.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
            <Bot
              className={`${sizeKey === "xs" ? "h-6 w-6" : "h-10 w-10"} text-slate-500`}
            />
          </div>
        )}
        {!sz.hideElementBadge ? (
          <Badge
            variant="outline"
            className={`absolute top-1 left-1 ${sz.badge} px-1.5 py-0 border-[var(--avatar-card-accent,#94a3b8)] text-[var(--avatar-card-accent,#94a3b8)] bg-slate-950/70`}
          >
            {elementLabel}
          </Badge>
        ) : null}
        <div
          className={`absolute top-1 right-1 ${sz.cost} rounded-full bg-amber-500/95 border-2 border-amber-200 flex items-center justify-center font-bold text-slate-950 shadow-md`}
          title="ELO"
        >
          {model.elo}
        </div>
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent ${
            sizeKey === "xs" ? "px-1 py-0.5" : "px-2 py-1.5"
          }`}
        >
          <p
            className={`font-serif font-bold text-amber-100 leading-tight line-clamp-2 break-words ${sz.title}`}
          >
            {model.name}
          </p>
        </div>
      </div>

      {!sz.hideBadges ? (
        <div className="flex flex-wrap items-center gap-1 shrink-0">
          <Badge
            variant="outline"
            className={`${sz.badge} capitalize border-slate-600 text-slate-300`}
          >
            <ElementIcon className="h-3.5 w-3.5 mr-0.5" />
            {classLabel}
          </Badge>
          <Badge
            variant="outline"
            className={`${sz.badge} avatar-card-rarity-${model.rarity}`}
          >
            {rarityLabel}
          </Badge>
        </div>
      ) : null}

      {!sz.hideAbility && (
        <div className="shrink-0 space-y-0.5" title={model.abilityText}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-500/90">
            {labels.ability}
          </p>
          <p className="text-slate-200 text-sm leading-snug line-clamp-2">
            {model.abilityText}
          </p>
        </div>
      )}

      {showFlipHint && (
        <FlipAffordance hint={labels.flipHint} shortHint={labels.flipHintShort} />
      )}
    </div>
  );
}

function DefaultCardBack({
  model,
  labels,
  sizeKey,
  onOpenDetails,
}: {
  model: AvatarCardModel;
  labels: AvatarCardLabels;
  sizeKey: keyof typeof SIZE_CLASSES;
  onOpenDetails?: () => void;
}) {
  const { t } = useLanguage();
  const sz = SIZE_CLASSES[sizeKey];
  const classLabel = labels.playStyles[model.classKey] ?? model.classKey;
  const compact = sizeKey === "xs" || sizeKey === "sm";
  const fourth =
    model.winRate != null
      ? {
          label: t.personaCard.winsPercent,
          value: `${model.winRate}%`,
          icon: Sparkles,
        }
      : {
          label: labels.timeControl,
          value:
            model.timeControl != null ? `${model.timeControl} ms` : "—",
          icon: Clock,
        };
  const FourthIcon = fourth.icon;

  return (
    <div
      className={`avatar-card-back-inner flex h-full min-h-0 flex-col overflow-hidden ${sz.pad} text-xs text-slate-300`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-700/60 pb-1.5 shrink-0">
        <div className="min-w-0">
          <p className={`font-serif font-bold text-amber-100 truncate ${sz.title}`}>
            {model.name}
          </p>
          <p className="text-[10px] text-slate-500 capitalize truncate">
            {classLabel}
          </p>
        </div>
        <div
          className={`${sz.cost} shrink-0 rounded-full bg-amber-500/90 border-2 border-amber-200 flex items-center justify-center font-bold text-slate-950`}
          title="ELO"
        >
          {model.elo}
        </div>
      </div>

      <div className={`grid grid-cols-2 ${compact ? "gap-1 mt-1" : "gap-1.5 mt-1.5"} shrink-0`}>
        <div className="bg-slate-950/80 rounded p-1.5 border border-slate-800">
          <Swords className="h-3 w-3 text-red-400 mb-0.5" />
          <span className="text-slate-500 text-[10px] block">
            {t.personaCard.aggressiveness}
          </span>
          <p className="font-bold text-sm tabular-nums">{model.aggressiveness}%</p>
        </div>
        <div className="bg-slate-950/80 rounded p-1.5 border border-slate-800">
          <TrendingUp className="h-3 w-3 text-purple-400 mb-0.5" />
          <span className="text-slate-500 text-[10px] block">
            {t.personaCard.depth}
          </span>
          <p className="font-bold text-sm tabular-nums">
            {t.personaCard.depthLevel} {model.depth}
          </p>
        </div>
        <div className="bg-slate-950/80 rounded p-1.5 border border-slate-800">
          <Cpu className="h-3 w-3 text-cyan-400 mb-0.5" />
          <span className="text-slate-500 text-[10px] block">
            {labels.difficultyShort}
          </span>
          <p className="font-bold text-sm tabular-nums">{model.difficulty}/5</p>
        </div>
        <div className="bg-slate-950/80 rounded p-1.5 border border-slate-800">
          <FourthIcon className="h-3 w-3 text-emerald-400 mb-0.5" />
          <span className="text-slate-500 text-[10px] block">
            {fourth.label}
          </span>
          <p className="font-bold text-sm tabular-nums">{fourth.value}</p>
        </div>
      </div>

      {model.topOpening && !compact && (
        <p className="mt-1.5 text-xs text-slate-300 leading-snug line-clamp-2 shrink-0">
          <span className="text-slate-500 uppercase font-semibold mr-1">
            {labels.backOpening}
          </span>
          {shortOpeningName(model.topOpening)}
        </p>
      )}

      <div className="flex-1 min-h-0" />

      {onOpenDetails && sizeKey !== "xs" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-card-action
          className="w-full h-8 shrink-0 border-cyan-700/70 text-cyan-200 hover:bg-cyan-950/50 text-[11px] gap-1"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails();
          }}
          title={labels.fullProfileHint}
        >
          <ScrollText className="h-3.5 w-3.5" />
          {labels.fullProfile}
        </Button>
      )}

      <FlipAffordance hint={labels.flipHint} shortHint={labels.flipHintShort} />
    </div>
  );
}

function CardDetailsDialog({
  open,
  onOpenChange,
  model,
  labels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: AvatarCardModel;
  labels: AvatarCardLabels;
}) {
  const { t } = useLanguage();
  const classLabel = labels.playStyles[model.classKey] ?? model.classKey;
  const hasStyleMeters =
    model.styleTactical != null ||
    model.stylePositional != null ||
    model.styleEndgame != null ||
    model.styleOpening != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="theme-bg-secondary max-w-md border-slate-700 max-h-[85vh] overflow-y-auto"
        data-card-action
      >
        <DialogHeader>
          <DialogTitle className="text-cyan-300">{model.name}</DialogTitle>
          <DialogDescription>
            {classLabel} · ELO {model.elo} · {labels.difficultyShort}{" "}
            {model.difficulty}/5
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-slate-300">
          <section className="space-y-1.5">
            <p className="font-semibold text-amber-400/90 uppercase text-[10px] tracking-wide">
              {labels.backEngine}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <p>
                {t.personaCard.aggressiveness}:{" "}
                <span className="font-medium text-slate-100">
                  {model.aggressiveness}%
                </span>
              </p>
              <p>
                {t.personaCard.depth}:{" "}
                <span className="font-medium text-slate-100">{model.depth}</span>
              </p>
              <p>
                {labels.timeControl}:{" "}
                <span className="font-medium text-slate-100">
                  {model.timeControl != null ? `${model.timeControl} ms` : "—"}
                </span>
              </p>
              <p>
                {labels.threads}:{" "}
                <span className="font-medium text-slate-100">
                  {model.threads ?? "—"}
                </span>
              </p>
            </div>
          </section>

          {(model.winRate != null ||
            (model.gameCount != null && model.gameCount > 0)) && (
            <section className="space-y-1">
              <p className="font-semibold text-slate-400 uppercase text-[10px] tracking-wide">
                {labels.backRecord}
              </p>
              {model.winRate != null && (
                <div className="flex h-2 rounded-full overflow-hidden bg-slate-800">
                  <div
                    className="bg-emerald-500/90"
                    style={{ width: `${model.winRate}%` }}
                  />
                  <div
                    className="bg-slate-500/80"
                    style={{ width: `${model.drawRate ?? 0}%` }}
                  />
                  <div
                    className="bg-rose-500/80"
                    style={{ width: `${model.lossRate ?? 0}%` }}
                  />
                </div>
              )}
              <p className="text-xs text-slate-400 tabular-nums">
                {t.personaCard.winsPercent} {model.winRate ?? 0}% ·{" "}
                {t.personaCard.drawsPercent} {model.drawRate ?? 0}% ·{" "}
                {t.personaCard.lossesPercent} {model.lossRate ?? 0}%
                {model.gameCount != null && model.gameCount > 0
                  ? ` · ${model.gameCount} ${labels.games}`
                  : ""}
              </p>
            </section>
          )}

          {hasStyleMeters && (
            <section className="space-y-1.5">
              <p className="font-semibold text-slate-400 uppercase text-[10px] tracking-wide">
                {labels.backStyle}
              </p>
              {model.styleTactical != null && (
                <StyleMeter label={labels.tactical} value={model.styleTactical} />
              )}
              {model.stylePositional != null && (
                <StyleMeter
                  label={labels.positional}
                  value={model.stylePositional}
                />
              )}
              {model.styleEndgame != null && (
                <StyleMeter label={labels.endgame} value={model.styleEndgame} />
              )}
              {model.styleOpening != null && (
                <StyleMeter
                  label={labels.openingTheory}
                  value={model.styleOpening}
                />
              )}
            </section>
          )}

          {(model.strengths.length > 0 || model.weaknesses.length > 0) && (
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TraitList
                title={labels.strengths}
                items={model.strengths}
                variant="strength"
              />
              <TraitList
                title={labels.weaknesses}
                items={model.weaknesses}
                variant="weakness"
              />
            </section>
          )}

          {model.topOpening && (
            <section>
              <p className="font-semibold text-slate-400 uppercase text-[10px] tracking-wide mb-1">
                {labels.backOpening}
              </p>
              <p className="text-slate-300">{model.topOpening}</p>
            </section>
          )}

          {model.tags && model.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {model.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[9px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AvatarTradingCard({
  model,
  labels: labelsProp,
  size = "md",
  flippable = false,
  interactive = true,
  footer,
  onClick,
  className = "",
  backContent,
  exportable = false,
  onDetails,
}: AvatarTradingCardProps) {
  const { t } = useLanguage();
  const labels = labelsProp ?? getAvatarCardLabels(t);
  const [flipped, setFlipped] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const sz = SIZE_CLASSES[size];

  const handleExport = useCallback(async () => {
    const el = exportRef.current;
    if (!el || exporting) return;
    setExporting(true);
    try {
      const safeName = model.name.replace(/[^\w.-]+/g, "_").slice(0, 40);
      await exportCardAsPng(el, `avatar-${safeName}.png`);
      toast.success(t.avatarCard.exportImageSuccess);
    } catch {
      toast.error(t.avatarCard.exportImageError);
    } finally {
      setExporting(false);
    }
  }, [
    exporting,
    model.name,
    t.avatarCard.exportImageError,
    t.avatarCard.exportImageSuccess,
  ]);

  const toggleFlip = useCallback(() => {
    if (flippable) setFlipped((f) => !f);
  }, [flippable]);

  const openDetails = useCallback(() => {
    if (onDetails) {
      onDetails();
      return;
    }
    setShowDetails(true);
  }, [onDetails]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!flippable) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleFlip();
      }
    },
    [flippable, toggleFlip]
  );

  const cardClasses = [
    "avatar-card",
    `avatar-card--${model.rarity}`,
    `avatar-card--element-${model.element}`,
    flippable ? "avatar-card--flippable" : "",
    interactive ? "avatar-card-interactive avatar-card-foil" : "",
    sz.root,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const faceBlock = (
    <CardFace
      model={model}
      labels={labels}
      sizeKey={size}
      showFlipHint={flippable}
    />
  );

  const inner = (
    <>
      <div className="avatar-card-flip-scene">
        {flippable ? (
          <div
            className={`avatar-card-flip-inner ${flipped ? "is-flipped" : ""}`}
          >
            <div className="avatar-card-face avatar-card-face--front">
              {faceBlock}
            </div>
            <div className="avatar-card-face avatar-card-back">
              {backContent ?? (
                <DefaultCardBack
                  model={model}
                  labels={labels}
                  sizeKey={size}
                  onOpenDetails={openDetails}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="avatar-card-face avatar-card-face--static">
            {faceBlock}
          </div>
        )}
      </div>
      {footer ? (
        <div
          className="border-t border-slate-700/50 p-1.5 bg-slate-950/50 rounded-b-[0.5rem]"
          data-card-action
        >
          {footer}
        </div>
      ) : null}
    </>
  );

  const shell = (
    <div ref={exportRef} className="relative">
      {exportable && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute top-1 right-1 z-10 h-7 w-7 bg-slate-900/80"
          data-card-action
          disabled={exporting}
          onClick={(e) => {
            e.stopPropagation();
            void handleExport();
          }}
          title={t.avatarCard.exportImage}
          aria-label={t.avatarCard.exportImage}
        >
          <ImageDown className="h-3.5 w-3.5" />
        </Button>
      )}
      {inner}
      <CardDetailsDialog
        open={showDetails}
        onOpenChange={setShowDetails}
        model={model}
        labels={labels}
      />
    </div>
  );

  if (flippable) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={cardClasses}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("[data-card-action]")) return;
          onClick?.();
          toggleFlip();
        }}
        onKeyDown={handleKeyDown}
        aria-label={`${model.name}. ${labels.flipHint}`}
        title={labels.flipHint}
      >
        {shell}
      </div>
    );
  }

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {shell}
    </div>
  );
}

type AvatarTradingCardGridProps = {
  children: ReactNode;
  className?: string;
};

export function AvatarTradingCardGrid({
  children,
  className = "",
}: AvatarTradingCardGridProps) {
  return (
    <div
      className={`grid w-full gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))] ${className}`}
    >
      {children}
    </div>
  );
}
