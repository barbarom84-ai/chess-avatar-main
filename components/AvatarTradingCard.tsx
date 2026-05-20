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
  TrendingUp,
  Cpu,
  Clock,
  ImageDown,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportCardAsPng } from "@/lib/export-card-image";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import type { AvatarCardModel } from "@/lib/avatar-card-model";
import type { AvatarCardLabels } from "@/lib/avatar-card-model";
import { useLanguage } from "@/lib/language-context";
import { getAvatarCardLabels } from "@/lib/avatar-card-labels";

const ELEMENT_ICONS = {
  fire: Flame,
  earth: Mountain,
  water: Droplets,
  air: Wind,
  neutral: Circle,
} as const;

const FLIP_MIN_HEIGHT: Record<keyof typeof SIZE_CLASSES, number> = {
  sm: 220,
  md: 360,
  lg: 440,
};

const SIZE_CLASSES = {
  sm: {
    root: "w-[140px] min-h-[200px] text-[10px]",
    portrait: "h-[72px]",
    title: "text-xs",
    cost: "h-7 w-7 text-xs",
    pad: "p-2 gap-1.5",
    hideMorale: true,
    hideAbility: true,
  },
  md: {
    root: "w-full max-w-[220px] min-h-[360px] text-xs",
    portrait: "h-[120px]",
    title: "text-sm",
    cost: "h-9 w-9 text-sm",
    pad: "p-3 gap-2",
    hideMorale: false,
    hideAbility: false,
  },
  lg: {
    root: "w-full max-w-[280px] min-h-[400px] text-sm",
    portrait: "h-[150px]",
    title: "text-base",
    cost: "h-10 w-10 text-base",
    pad: "p-4 gap-2.5",
    hideMorale: false,
    hideAbility: false,
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
  /** Contenu verso (stats moteur détaillées) */
  backContent?: ReactNode;
  /** Bouton export PNG (phase 2) */
  exportable?: boolean;
};

function TraitList({
  title,
  items,
  variant,
  compact = false,
}: {
  title: string;
  items: string[];
  variant: "strength" | "weakness";
  compact?: boolean;
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
            className="flex items-start gap-1 text-slate-300 leading-tight"
          >
            <Icon className={`h-3 w-3 shrink-0 mt-0.5 ${color}`} aria-hidden />
            <span className={compact ? "line-clamp-3" : "line-clamp-2"}>
              {item}
            </span>
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

function FlipAffordance({ hint }: { hint: string }) {
  return (
    <p className="mt-auto pt-1 flex items-center justify-center gap-1 text-[9px] text-slate-500">
      <RotateCw className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      <span>{hint}</span>
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
    <div className={`avatar-card-face flex flex-col min-h-full ${sz.pad}`}>
      <div className="flex items-start justify-between gap-1">
        <Badge
          variant="outline"
          className="text-[9px] px-1 py-0 border-[var(--avatar-card-accent,#94a3b8)] text-[var(--avatar-card-accent,#94a3b8)]"
        >
          {elementLabel}
        </Badge>
        <div
          className={`${sz.cost} shrink-0 rounded-full bg-amber-500/90 border-2 border-amber-200 flex items-center justify-center font-bold text-slate-950 shadow-md`}
          title="ELO"
        >
          {model.elo}
        </div>
      </div>

      <div
        className={`relative ${sz.portrait} w-full rounded-md overflow-hidden border border-slate-700/80 bg-slate-950`}
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
            <Bot className="h-10 w-10 text-slate-500" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 py-1.5">
          <p
            className={`font-serif font-bold text-amber-100 truncate ${sz.title}`}
          >
            {model.name}
          </p>
        </div>
        {!sz.hideMorale && model.winRate != null && (
          <div
            className="absolute right-1 top-1 bottom-8 w-1.5 rounded-full bg-slate-800/80 overflow-hidden"
            title={`${labels.morale}: ${model.winRate}%`}
          >
            <div
              className="absolute bottom-0 left-0 right-0 bg-emerald-500/90 rounded-full transition-all"
              style={{ height: `${Math.min(100, Math.max(0, model.winRate))}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Badge
          variant="outline"
          className="text-[9px] capitalize border-slate-600 text-slate-300"
        >
          <ElementIcon className="h-3 w-3 mr-0.5" />
          {classLabel}
        </Badge>
        <Badge
          variant="outline"
          className={`text-[9px] avatar-card-rarity-${model.rarity}`}
        >
          {rarityLabel}
        </Badge>
        {model.platform && (
          <Badge variant="outline" className="text-[9px] border-slate-600">
            {model.platform === "chesscom" ? "Chess.com" : "Lichess"}
          </Badge>
        )}
      </div>

      {!sz.hideAbility && (
        <p className="text-slate-400 leading-snug line-clamp-3 italic flex-1 min-h-0">
          <span className="text-amber-500/80 not-italic font-semibold text-[10px] uppercase mr-1">
            {labels.ability}
          </span>
          {model.abilityText}
        </p>
      )}

      {showFlipHint && <FlipAffordance hint={labels.flipHint} />}
    </div>
  );
}

function DefaultCardBack({
  model,
  labels,
}: {
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
    <div className="avatar-card-back-inner flex flex-col gap-2 p-3 text-xs text-slate-300 min-h-full overflow-y-auto">
      <div className="flex items-start justify-between gap-2 border-b border-slate-700/60 pb-2">
        <div className="min-w-0">
          <p className="font-serif font-bold text-amber-100 truncate text-sm">
            {model.name}
          </p>
          <p className="text-[10px] text-slate-500 capitalize">{classLabel}</p>
        </div>
        <div
          className="h-8 w-8 shrink-0 rounded-full bg-amber-500/90 border-2 border-amber-200 flex items-center justify-center font-bold text-slate-950 text-xs"
          title="ELO"
        >
          {model.elo}
        </div>
      </div>

      <section className="space-y-1.5">
        <p className="font-semibold text-amber-400/90 uppercase text-[10px] tracking-wide">
          {labels.backEngine}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-slate-950/80 rounded p-2 border border-slate-800">
            <Swords className="h-3.5 w-3.5 text-red-400 mb-0.5" />
            <span className="text-slate-500 text-[10px] block">
              {t.personaCard.aggressiveness}
            </span>
            <p className="font-bold text-sm">{model.aggressiveness}%</p>
          </div>
          <div className="bg-slate-950/80 rounded p-2 border border-slate-800">
            <TrendingUp className="h-3.5 w-3.5 text-purple-400 mb-0.5" />
            <span className="text-slate-500 text-[10px] block">
              {t.personaCard.depth}
            </span>
            <p className="font-bold text-sm">
              {t.personaCard.depthLevel} {model.depth}
            </p>
          </div>
          <div className="bg-slate-950/80 rounded p-2 border border-slate-800">
            <Cpu className="h-3.5 w-3.5 text-cyan-400 mb-0.5" />
            <span className="text-slate-500 text-[10px] block">Niv.</span>
            <p className="font-bold text-sm">{model.difficulty}/5</p>
          </div>
          <div className="bg-slate-950/80 rounded p-2 border border-slate-800">
            <Clock className="h-3.5 w-3.5 text-blue-400 mb-0.5" />
            <span className="text-slate-500 text-[10px] block">
              {labels.timeControl}
            </span>
            <p className="font-bold text-sm">
              {model.timeControl != null ? `${model.timeControl} ms` : "—"}
            </p>
          </div>
        </div>
        {model.threads != null && (
          <p className="text-[10px] text-slate-500">
            {labels.threads}:{" "}
            <span className="text-slate-300 font-medium">{model.threads}</span>
          </p>
        )}
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
                title={`${labels.morale} ${model.winRate}%`}
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
          <p className="text-[10px] text-slate-400 tabular-nums">
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
        <section className="space-y-1.5">
          <p className="font-semibold text-slate-400 uppercase text-[10px] tracking-wide">
            {labels.backTraits}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <TraitList
              title={labels.strengths}
              items={model.strengths}
              variant="strength"
              compact
            />
            <TraitList
              title={labels.weaknesses}
              items={model.weaknesses}
              variant="weakness"
              compact
            />
          </div>
        </section>
      )}

      {model.topOpening && (
        <section className="space-y-0.5">
          <p className="font-semibold text-slate-400 uppercase text-[10px] tracking-wide">
            {labels.backOpening}
          </p>
          <p className="text-[11px] text-slate-300 leading-snug line-clamp-3">
            {model.topOpening}
          </p>
        </section>
      )}

      {model.tags && model.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {model.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[9px]">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <FlipAffordance hint={labels.flipHint} />
    </div>
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
}: AvatarTradingCardProps) {
  const { t } = useLanguage();
  const labels = labelsProp ?? getAvatarCardLabels(t);
  const [flipped, setFlipped] = useState(false);
  const [exporting, setExporting] = useState(false);
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
  }, [exporting, model.name, t.avatarCard.exportImageError, t.avatarCard.exportImageSuccess]);

  const toggleFlip = useCallback(() => {
    if (flippable) setFlipped((f) => !f);
  }, [flippable]);

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
      {flippable ? (
        <div className="avatar-card-flip-scene">
          <div
            className={`avatar-card-flip-inner ${flipped ? "is-flipped" : ""}`}
            style={{ minHeight: FLIP_MIN_HEIGHT[size] }}
          >
            {faceBlock}
            <div className="avatar-card-back">
              {backContent ?? (
                <DefaultCardBack model={model} labels={labels} />
              )}
            </div>
          </div>
        </div>
      ) : (
        faceBlock
      )}
      {footer ? (
        <div
          className="border-t border-slate-700/50 p-2 bg-slate-950/50 rounded-b-[0.5rem]"
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
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 justify-items-center ${className}`}
    >
      {children}
    </div>
  );
}
