"use client";

import { useState } from "react";
import ArenaSpectator from "@/components/ArenaSpectator";
import ArenaPlayoffMode from "@/components/ArenaPlayoffMode";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { Eye, Swords } from "lucide-react";

type ArenaTab = "spectator" | "playoff";

export default function ArenaPageShell() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<ArenaTab>("spectator");

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

      {tab === "spectator" ? <ArenaSpectator embedded /> : <ArenaPlayoffMode />}
    </div>
  );
}
