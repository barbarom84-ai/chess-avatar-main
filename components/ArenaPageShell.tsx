"use client";

import { useEffect, useState } from "react";
import ArenaSpectator from "@/components/ArenaSpectator";
import ArenaPlayoffMode from "@/components/ArenaPlayoffMode";
import ArenaForcedOpeningPicker from "@/components/ArenaForcedOpeningPicker";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { ARENA_FORCED_OPENING_STORAGE } from "@/lib/arena-forced-opening";
import { Eye, Swords } from "lucide-react";

type ArenaTab = "spectator" | "playoff";

export default function ArenaPageShell() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<ArenaTab>("spectator");
  const [forcedOpeningId, setForcedOpeningId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(ARENA_FORCED_OPENING_STORAGE);
      if (stored?.trim()) setForcedOpeningId(stored.trim());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (forcedOpeningId) {
        localStorage.setItem(ARENA_FORCED_OPENING_STORAGE, forcedOpeningId);
      } else {
        localStorage.removeItem(ARENA_FORCED_OPENING_STORAGE);
      }
    } catch {
      /* ignore */
    }
  }, [forcedOpeningId]);

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-4 md:p-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-cyan-400">
          {t.pages.arena.title}
        </h1>
        <p className="text-xs text-slate-500 max-w-xl mx-auto">
          {tab === "playoff"
            ? t.arenaPlayoff.subtitle
            : t.pages.arena.subtitle}
        </p>
      </div>

      <div className="flex justify-center gap-2">
        <Button
          variant={tab === "spectator" ? "default" : "outline"}
          className={
            tab === "spectator"
              ? "bg-cyan-700 hover:bg-cyan-600"
              : "border-slate-600"
          }
          onClick={() => setTab("spectator")}
        >
          <Eye className="h-4 w-4 mr-1.5" />
          {t.arenaPlayoff.tabSpectator}
        </Button>
        <Button
          variant={tab === "playoff" ? "default" : "outline"}
          className={
            tab === "playoff"
              ? "bg-amber-700 hover:bg-amber-600"
              : "border-slate-600"
          }
          onClick={() => setTab("playoff")}
        >
          <Swords className="h-4 w-4 mr-1.5" />
          {t.arenaPlayoff.tabPlayoff}
        </Button>
      </div>

      <ArenaForcedOpeningPicker
        value={forcedOpeningId}
        onChange={setForcedOpeningId}
      />

      {tab === "spectator" ? (
        <ArenaSpectator embedded forcedOpeningId={forcedOpeningId} />
      ) : (
        <ArenaPlayoffMode forcedOpeningId={forcedOpeningId} />
      )}
    </div>
  );
}
