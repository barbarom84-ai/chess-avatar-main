"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ArenaSpectator from "@/components/ArenaSpectator";
import ArenaPlayoffMode from "@/components/ArenaPlayoffMode";
import ArenaHumanPlayers from "@/components/arena/ArenaHumanPlayers";
import ArenaLeaderboard from "@/components/arena/ArenaLeaderboard";
import ArenaSettingsBar from "@/components/arena/ArenaSettingsBar";
import { useArenaEngine } from "@/hooks/useArenaEngine";
import { useArenaHumans } from "@/hooks/useArenaHumans";
import { useArenaProfilePool, type ArenaProfilePool } from "@/hooks/useArenaProfilePool";
import { useLanguage } from "@/lib/language-context";
import {
  ARENA_DEFAULT_FORCED_OPENING_ID,
  ARENA_FORCED_OPENING_STORAGE,
} from "@/lib/arena-forced-opening";
import {
  ARENA_DEFAULT_SPEED,
  ARENA_SPEED_STORAGE,
  isArenaSpeed,
  type ArenaSpeed,
} from "@/lib/arena-move-timing";
import {
  ARENA_DEFAULT_TIME_PRESET_ID,
  ARENA_TIME_PRESET_STORAGE,
  isValidArenaTimePresetId,
} from "@/lib/arena-time-controls";
import { Eye, Swords, Users } from "lucide-react";

type ArenaTab = "spectator" | "playoff" | "humans";

function isArenaTab(value: unknown): value is ArenaTab {
  return value === "spectator" || value === "playoff" || value === "humans";
}

const TAB_QUERY_KEY = "mode";

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export default function ArenaPageShell() {
  const { t } = useLanguage();
  const engine = useArenaEngine();
  const avatarPool = useArenaProfilePool();
  const { humans, options: humanOptions } = useArenaHumans();
  const mixedPool = useMemo<ArenaProfilePool>(
    () => ({ ...avatarPool, options: [...humanOptions, ...avatarPool.options] }),
    [avatarPool, humanOptions]
  );
  const humansPool = useMemo<ArenaProfilePool>(
    () => ({ ...avatarPool, options: humanOptions, loading: false }),
    [avatarPool, humanOptions]
  );
  const [tab, setTab] = useState<ArenaTab>("spectator");
  const [forcedOpeningId, setForcedOpeningId] = useState<string | null>(
    ARENA_DEFAULT_FORCED_OPENING_ID
  );
  const [timePresetId, setTimePresetId] = useState(ARENA_DEFAULT_TIME_PRESET_ID);
  const [speed, setSpeed] = useState<ArenaSpeed>(ARENA_DEFAULT_SPEED);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const storedOpening = readStorage(ARENA_FORCED_OPENING_STORAGE);
    if (storedOpening !== null) {
      setForcedOpeningId(storedOpening.trim() || null);
    }
    const storedTc = readStorage(ARENA_TIME_PRESET_STORAGE)?.trim();
    if (storedTc && isValidArenaTimePresetId(storedTc)) setTimePresetId(storedTc);
    const storedSpeed = readStorage(ARENA_SPEED_STORAGE);
    if (isArenaSpeed(storedSpeed)) setSpeed(storedSpeed);
    const mode = new URLSearchParams(window.location.search).get(TAB_QUERY_KEY);
    if (isArenaTab(mode)) setTab(mode);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStorage(ARENA_FORCED_OPENING_STORAGE, forcedOpeningId ?? "");
    writeStorage(ARENA_TIME_PRESET_STORAGE, timePresetId);
    writeStorage(ARENA_SPEED_STORAGE, speed);
  }, [hydrated, forcedOpeningId, timePresetId, speed]);

  const selectTab = useCallback((next: ArenaTab) => {
    setTab(next);
    setBusy(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set(TAB_QUERY_KEY, next);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* ignore */
    }
  }, []);

  const tabs: { id: ArenaTab; label: string; icon: typeof Eye; active: string }[] = [
    {
      id: "spectator",
      label: t.arenaPlayoff.tabSpectator,
      icon: Eye,
      active: "bg-cyan-700 text-white",
    },
    {
      id: "playoff",
      label: t.arenaPlayoff.tabPlayoff,
      icon: Swords,
      active: "bg-amber-700 text-white",
    },
    {
      id: "humans",
      label: t.arenaPlayoff.tabHumans,
      icon: Users,
      active: "bg-emerald-700 text-white",
    },
  ];
  const subtitle =
    tab === "playoff"
      ? t.arenaPlayoff.subtitle
      : tab === "humans"
        ? t.arenaPlayoff.humansSubtitle
        : t.pages.arena.subtitle;

  // Humans roster is only relevant in Spectator (mixed seats) and the Humans tab.
  const showHumansPanel = tab === "spectator" || tab === "humans";

  return (
    <div className="max-w-7xl mx-auto space-y-3 p-3 md:p-6">
      <header className="flex flex-col items-center gap-2 text-center md:flex-row md:justify-between md:text-left">
        <div className="space-y-0.5">
          <h1 className="text-2xl md:text-3xl font-bold text-cyan-400">
            {t.pages.arena.title}
          </h1>
          <p className="text-xs text-slate-500 max-w-xl">{subtitle}</p>
        </div>
        <div
          role="tablist"
          aria-label={t.pages.arena.title}
          className="inline-flex max-w-full rounded-lg border border-slate-700 bg-slate-950 p-1"
        >
          {tabs.map(({ id, label, icon: Icon, active }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`arena-tab-${id}`}
              aria-selected={tab === id}
              aria-controls="arena-tabpanel"
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
                tab === id ? active : "text-slate-400 hover:text-slate-100"
              }`}
              onClick={() => selectTab(id)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <ArenaSettingsBar
        timePresetId={timePresetId}
        onTimePresetChange={setTimePresetId}
        speed={speed}
        onSpeedChange={setSpeed}
        forcedOpeningId={forcedOpeningId}
        onForcedOpeningChange={setForcedOpeningId}
        locked={busy}
        collapseOnMobile
      />

      {showHumansPanel && (
        <ArenaHumanPlayers
          key={`humans-panel-${tab}`}
          humans={humans}
          locked={busy}
          defaultOpen={tab === "humans"}
        />
      )}

      <div
        role="tabpanel"
        id="arena-tabpanel"
        aria-labelledby={`arena-tab-${tab}`}
      >
        {tab === "spectator" ? (
          <ArenaSpectator
            pool={mixedPool}
            engine={engine}
            forcedOpeningId={forcedOpeningId}
            timePresetId={timePresetId}
            speed={speed}
            onBusyChange={setBusy}
          />
        ) : (
          <ArenaPlayoffMode
            key={tab}
            pool={tab === "humans" ? humansPool : mixedPool}
            engine={engine}
            humansOnly={tab === "humans"}
            forcedOpeningId={forcedOpeningId}
            timePresetId={timePresetId}
            speed={speed}
            onBusyChange={setBusy}
          />
        )}
      </div>

      <ArenaLeaderboard
        key={tab === "humans" ? "leaderboard-humans" : "leaderboard-all"}
        locked={busy}
        humansOnly={tab === "humans"}
      />
    </div>
  );
}
