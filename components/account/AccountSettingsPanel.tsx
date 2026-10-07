"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Check, Cpu, Eye, Languages, Lock, Palette, Settings2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  BOARD_THEMES,
  PIECE_SETS,
  useChessboardSettings,
  type BoardThemeWithPremium,
  type ChessboardSettings,
  type PieceSet,
} from "@/contexts/ChessboardSettingsContext";
import { useBotEnginePreference } from "@/hooks/useBotEnginePreference";
import type { BotEngineId } from "@/lib/bot-engine-preference";
import { useLanguage } from "@/lib/language-context";
import type { Language } from "@/lib/i18n";
import type { AccountCopy } from "./types";

const ChessboardSettingsModal = dynamic(() => import("@/components/ChessboardSettingsModal"), { ssr: false });

type AccountSettingsPanelProps = {
  copy: AccountCopy;
  isPremium: boolean;
  onUpgrade: () => void;
};

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AccountSettingsPanel({ copy, isPremium, onUpgrade }: AccountSettingsPanelProps) {
  const { t, lang, setLang } = useLanguage();
  const { settings, updateSettings } = useChessboardSettings();
  const [botEngine, setBotEngine] = useBotEnginePreference();
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const cb = t.chessboardSettings;
  const engine = t.play.botEngine;

  const localized = (item: { name: string; nameEn?: string }) => (lang === "en" && item.nameEn ? item.nameEn : item.name);

  const pickTheme = (theme: BoardThemeWithPremium) => {
    if (theme.premium && !isPremium) return onUpgrade();
    updateSettings({ boardTheme: theme });
  };

  const pickPieces = (pieceSet: PieceSet) => {
    if (pieceSet.premium && !isPremium) return onUpgrade();
    updateSettings({ pieceSet });
  };

  const toggles: { key: keyof Pick<ChessboardSettings, "soundEnabled" | "showCoordinates" | "showLegalMoves" | "highlightLastMove">; label: string; desc: string }[] = [
    { key: "soundEnabled", label: cb.soundEffects, desc: cb.soundEffectsDesc },
    { key: "showCoordinates", label: cb.showCoordinates, desc: cb.showCoordinatesDesc },
    { key: "showLegalMoves", label: cb.showLegalMoves, desc: cb.showLegalMovesDescription },
    { key: "highlightLastMove", label: cb.highlightLastMove, desc: cb.highlightLastMoveDesc },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="account-card">
        <h3 className="account-card-title">
          <Languages aria-hidden />
          {copy.settings.generalTitle}
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-slate-300">{copy.settings.language}</p>
            <Segmented<Language>
              label={copy.settings.language}
              value={lang}
              onChange={setLang}
              options={[
                { value: "fr", label: "Français" },
                { value: "en", label: "English" },
              ]}
            />
          </div>
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm text-slate-300">
              <Cpu className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
              {copy.settings.botEngine}
            </p>
            <Segmented<BotEngineId>
              label={copy.settings.botEngine}
              value={botEngine}
              onChange={setBotEngine}
              options={[
                { value: "auto", label: "Auto" },
                { value: "chessavatar", label: engine.chessavatar },
                { value: "stockfish", label: engine.stockfish },
              ]}
            />
            <p className="text-[11px] text-slate-400 leading-relaxed">{engine.auto}</p>
          </div>
        </div>
      </section>

      <section className="account-card">
        <h3 className="account-card-title">
          <Volume2 aria-hidden />
          {copy.settings.displayTitle}
        </h3>
        <div>
          {toggles.map(({ key, label, desc }) => (
            <label key={key} className="setting-row cursor-pointer">
              <span className="min-w-0">
                <span className="block text-sm text-slate-200">{label}</span>
                <span className="block text-[11px] text-slate-400">{desc}</span>
              </span>
              <Switch checked={settings[key]} onCheckedChange={(checked) => updateSettings({ [key]: checked })} />
            </label>
          ))}
          <div className="setting-row flex-wrap">
            <span className="flex items-center gap-1.5 text-sm text-slate-200">
              <Eye className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
              {cb.animationSpeed}
            </span>
            <Segmented<ChessboardSettings["animationSpeed"]>
              label={cb.animationSpeed}
              value={settings.animationSpeed}
              onChange={(animationSpeed) => updateSettings({ animationSpeed })}
              options={[
                { value: "none", label: cb.animNone },
                { value: "fast", label: cb.animFast },
                { value: "normal", label: cb.animNormal },
                { value: "slow", label: cb.animSlow },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="account-card lg:col-span-2">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="account-card-title !mb-0">
            <Palette aria-hidden />
            {copy.settings.boardTitle}
          </h3>
          <Button type="button" size="sm" variant="ghost" className="min-h-10 text-cyan-300" onClick={() => setBoardModalOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1" />
            {copy.settings.moreBoardOptions}
          </Button>
        </div>

        <p className="text-sm text-slate-300 mb-2">
          {copy.settings.boardTheme} · <span className="text-cyan-200">{localized(settings.boardTheme)}</span>
        </p>
        <div className="h-scroll">
          {BOARD_THEMES.map((theme) => {
            const locked = theme.premium && !isPremium;
            const selected = settings.boardTheme.id === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                className="swatch-option"
                aria-pressed={selected}
                aria-label={locked ? `${localized(theme)} · ${copy.settings.premiumLocked}` : localized(theme)}
                title={localized(theme)}
                onClick={() => pickTheme(theme)}
              >
                <span className="grid grid-cols-4 overflow-hidden rounded-md">
                  {Array.from({ length: 16 }, (_, i) => (
                    <span
                      key={i}
                      className="aspect-square"
                      style={{ backgroundColor: (Math.floor(i / 4) + i) % 2 === 0 ? theme.lightSquare : theme.darkSquare }}
                    />
                  ))}
                </span>
                {selected && (
                  <span className="absolute -top-1.5 -right-1.5 rounded-full bg-cyan-400 p-0.5 text-slate-950">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                {locked && (
                  <span className="absolute -top-1.5 -left-1.5 rounded-full bg-amber-500 p-0.5 text-slate-950">
                    <Lock className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-sm text-slate-300 mt-4 mb-2">
          {copy.settings.pieceSet} · <span className="text-cyan-200">{localized(settings.pieceSet)}</span>
        </p>
        <div className="h-scroll">
          {PIECE_SETS.map((pieceSet) => {
            const locked = pieceSet.premium && !isPremium;
            const selected = settings.pieceSet.id === pieceSet.id;
            return (
              <button
                key={pieceSet.id}
                type="button"
                className="swatch-option flex flex-col items-center gap-1 py-1.5"
                aria-pressed={selected}
                aria-label={locked ? `${localized(pieceSet)} · ${copy.settings.premiumLocked}` : localized(pieceSet)}
                title={localized(pieceSet)}
                onClick={() => pickPieces(pieceSet)}
              >
                <span className="flex items-center justify-center gap-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${pieceSet.path}/wN.${pieceSet.ext}`} alt="" width={26} height={26} className="h-6.5 w-6.5 object-contain" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${pieceSet.path}/bQ.${pieceSet.ext}`} alt="" width={26} height={26} className="h-6.5 w-6.5 object-contain" />
                </span>
                <span className="block w-full truncate text-[10px] text-slate-300">{localized(pieceSet)}</span>
                {selected && (
                  <span className="absolute -top-1.5 -right-1.5 rounded-full bg-cyan-400 p-0.5 text-slate-950">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                {locked && (
                  <span className="absolute -top-1.5 -left-1.5 rounded-full bg-amber-500 p-0.5 text-slate-950">
                    <Lock className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {boardModalOpen && <ChessboardSettingsModal open={boardModalOpen} onOpenChange={setBoardModalOpen} />}
    </div>
  );
}
