"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GuideModeRail, {
  type GuideMode,
} from "@/components/guide/GuideModeRail";
import GuideMetaPanel from "@/components/guide/GuideMetaPanel";
import { useLanguage } from "@/lib/language-context";

export default function GuidePage() {
  const { t } = useLanguage();
  const g = t.guide;
  const [mode, setMode] = useState<GuideMode>("fritz");

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-3 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-100">
              {g.title}
            </h1>
            <p className="text-slate-500 text-xs max-w-2xl">{g.subtitle}</p>
          </div>
          <Button asChild size="sm" className="bg-cyan-700 hover:bg-cyan-600 shrink-0">
            <Link href="/analyze" data-testid="guide-header-cta">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {g.ctaGeneratePack}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </header>

        <div className="rounded-lg border border-emerald-700/40 bg-emerald-950/20 px-3 py-2.5">
          <p className="text-sm font-medium text-emerald-200">{g.banner.title}</p>
          <p className="text-xs text-emerald-200/70 mt-0.5 leading-relaxed">
            {g.banner.text}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_220px] xl:grid-cols-[300px_1fr_240px] gap-4">
          <div className="order-1 space-y-3">
            <GuideModeRail
              mode={mode}
              onModeChange={setMode}
              labels={{
                fritz: g.modes.fritz,
                pack: g.modes.pack,
                swap: g.modes.swap,
                help: g.modes.help,
                advanced: g.modes.advanced,
                fritzHint: g.modes.fritzHint,
                packHint: g.modes.packHint,
                swapHint: g.modes.swapHint,
                helpHint: g.modes.helpHint,
                advancedHint: g.modes.advancedHint,
              }}
            />
          </div>

          <div className="order-2 min-w-0" data-testid="guide-center">
            {mode === "fritz" && (
              <Card className="theme-bg-secondary border-cyan-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-100">
                    {g.fritz.title}
                  </CardTitle>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {g.fritz.intro}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border border-amber-700/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/90 leading-relaxed">
                    {g.fritz.adminNote}
                  </div>
                  <div className="rounded-md border border-yellow-700/30 bg-yellow-950/15 px-3 py-2 text-xs text-yellow-100/80 leading-relaxed">
                    {g.fritz.smartScreenNote}
                  </div>
                  <ol className="space-y-3">
                    {g.fritz.steps.map((step, idx) => (
                      <li
                        key={step.title}
                        className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2.5"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-700 text-[11px] font-semibold text-white">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-medium text-slate-100">
                              {step.title}
                            </p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {step.body}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {mode === "pack" && (
              <Card className="theme-bg-secondary border-cyan-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-100">
                    {g.pack.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-300">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {g.pack.description}
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
                    {g.pack.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <p className="text-xs text-cyan-200/80 border border-cyan-800/40 rounded-md px-3 py-2 bg-cyan-950/20 leading-relaxed">
                    {g.pack.contents}
                  </p>
                  <Button asChild size="sm" className="bg-cyan-700 hover:bg-cyan-600">
                    <Link href="/analyze">{g.ctaGeneratePack}</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {mode === "swap" && (
              <Card className="theme-bg-secondary border-cyan-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-100">
                    {g.swap.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {g.swap.description}
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
                    {g.swap.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {mode === "help" && (
              <Card className="theme-bg-secondary border-cyan-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-100">
                    {g.help.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {g.help.problems.map((p) => (
                    <div
                      key={p.title}
                      className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2.5"
                    >
                      <p className="text-sm font-medium text-slate-100">
                        {p.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {p.body}
                      </p>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-800 pt-3">
                    {g.help.arenaNote}
                  </p>
                </CardContent>
              </Card>
            )}

            {mode === "advanced" && (
              <Card className="theme-bg-secondary border-cyan-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-100">
                    {g.advanced.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {g.advanced.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        "/ChessAvatarSetup.exe",
                        "/AvatarEngine.exe",
                        "/install_engine.bat",
                        "/swap_profile.bat",
                        "/AvatarEngine.py",
                      ] as const
                    ).map((href) => (
                      <a key={href} href={href} download>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-cyan-500/40 text-cyan-300/80 hover:bg-cyan-500/10 text-xs"
                        >
                          <Download className="mr-2 h-3 w-3" />
                          {href.slice(1)}
                        </Button>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="order-3 hidden lg:block">
            <GuideMetaPanel
              variant={mode}
              labels={{
                title: g.meta.title,
                pathLabel: g.meta.pathLabel,
                pathValue: g.meta.pathValue,
                filesLabel: g.meta.filesLabel,
                files: g.meta.files,
                cta: g.ctaGeneratePack,
                tipFritz: g.meta.tipFritz,
                tipPack: g.meta.tipPack,
                tipSwap: g.meta.tipSwap,
                tipHelp: g.meta.tipHelp,
                tipAdvanced: g.meta.tipAdvanced,
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
