"use client";

import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Lock } from "lucide-react";
import ArenaForcedOpeningPicker from "@/components/ArenaForcedOpeningPicker";
import ArenaTimeControlPicker from "@/components/ArenaTimeControlPicker";
import ArenaSpeedPicker from "@/components/arena/ArenaSpeedPicker";
import { useLanguage } from "@/lib/language-context";
import type { ArenaSpeed } from "@/lib/arena-move-timing";
import {
  ensureOpeningsPartitionsLoaded,
  getOpeningById,
} from "@/lib/openings-registry";
import { getOpeningName } from "@/lib/openings-library";

export default function ArenaSettingsBar({
  timePresetId,
  onTimePresetChange,
  speed,
  onSpeedChange,
  forcedOpeningId,
  onForcedOpeningChange,
  locked,
  collapseOnMobile = false,
}: {
  timePresetId: string;
  onTimePresetChange: (id: string) => void;
  speed: ArenaSpeed;
  onSpeedChange: (speed: ArenaSpeed) => void;
  forcedOpeningId: string | null;
  onForcedOpeningChange: (id: string | null) => void;
  locked: boolean;
  /** Start collapsed under `md` so the board stays above the fold on phones. */
  collapseOnMobile?: boolean;
}) {
  const { t, lang } = useLanguage();
  const ap = t.arenaPage;
  const [openingOpen, setOpeningOpen] = useState(false);
  const [openingsLoaded, setOpeningsLoaded] = useState(false);
  const [bodyOpen, setBodyOpen] = useState(!collapseOnMobile);

  useEffect(() => {
    if (!collapseOnMobile) return;
    try {
      setBodyOpen(!window.matchMedia("(max-width: 767px)").matches);
    } catch {
      setBodyOpen(true);
    }
  }, [collapseOnMobile]);

  // Forced lines from partitions are only resolvable once partitions are loaded.
  useEffect(() => {
    let cancelled = false;
    void ensureOpeningsPartitionsLoaded()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setOpeningsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected =
    openingsLoaded && forcedOpeningId ? getOpeningById(forcedOpeningId) : undefined;
  const openingLabel = forcedOpeningId
    ? selected
      ? `${getOpeningName(selected, lang)} (${selected.eco})`
      : forcedOpeningId
    : ap.forcedOpeningNone;

  return (
    <section
      aria-label={ap.gameSettings}
      className="arena-panel overflow-hidden"
      data-testid="arena-settings-bar"
    >
      {collapseOnMobile && (
        <button
          type="button"
          className="arena-collapsible-trigger md:hidden"
          aria-expanded={bodyOpen}
          aria-controls="arena-settings-body"
          onClick={() => setBodyOpen((v) => !v)}
        >
          {ap.globalSettings}
          {bodyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      )}
      <div
        id="arena-settings-body"
        className={`space-y-2 px-3 py-2.5 ${collapseOnMobile && !bodyOpen ? "hidden md:block" : ""}`}
      >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <ArenaTimeControlPicker
          value={timePresetId}
          onChange={onTimePresetChange}
          disabled={locked}
        />
        <ArenaSpeedPicker value={speed} onChange={onSpeedChange} disabled={locked} />
        <div className="arena-setting min-w-0 basis-full sm:basis-auto sm:flex-1">
          <span className="arena-setting__label whitespace-normal sm:whitespace-nowrap">
            <BookOpen className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            {ap.forcedOpeningLabel}
          </span>
          <span
            className="truncate text-sm text-slate-200 min-w-0 max-w-[16rem]"
            title={openingLabel}
          >
            {openingLabel}
          </span>
          <button
            type="button"
            className="arena-icon-btn"
            aria-expanded={openingOpen}
            aria-controls="arena-opening-picker"
            disabled={locked}
            onClick={() => setOpeningOpen((v) => !v)}
          >
            {ap.forcedOpeningChange}
            {openingOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {locked ? (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Lock className="h-3 w-3" />
          {ap.lockedDuringGame}
        </p>
      ) : (
        <p className="text-[11px] text-slate-500 leading-snug">
          {ap.adaptiveTimingHint}
        </p>
      )}

      {openingOpen && !locked && (
        <div id="arena-opening-picker" className="border-t border-slate-800 pt-2">
          <ArenaForcedOpeningPicker
            value={forcedOpeningId}
            onChange={(id) => {
              onForcedOpeningChange(id);
              setOpeningOpen(false);
            }}
          />
        </div>
      )}
      </div>
    </section>
  );
}
