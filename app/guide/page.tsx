"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, BookOpen, Sparkles, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function GuidePage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-8">

        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="h-12 w-12 text-cyan-400" />
            <h1 className="text-4xl font-bold neon-cyan">{t.pages.guide.title}</h1>
          </div>
          <p className="text-cyan-400/70">{t.guide.subtitle}</p>

          <div className="flex justify-center mt-6">
            <Link href="/">
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg glow-cyan text-lg px-8 py-6">
                <Sparkles className="mr-2 h-5 w-5" />
                {t.guide.ctaGeneratePack}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        <Card className="theme-bg-secondary theme-border bg-green-900/10 border-green-700/40">
          <CardContent className="p-4 text-green-200">
            <p className="font-semibold text-green-300 mb-1">
              {t.guide.banner.title}
            </p>
            <p className="text-sm">{t.guide.banner.text}</p>
          </CardContent>
        </Card>

        <div className="grid gap-6">

          <Card className="theme-bg-secondary theme-border backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-600 text-white text-sm font-bold glow-cyan">1</span>
                {t.guide.step1.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 theme-text-secondary">
              <p>{t.guide.step1.description}</p>
              <ol className="list-decimal list-inside space-y-2 ml-4 theme-text-primary">
                {t.guide.step1.steps.map((step: string, idx: number) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>

              <div className="bg-cyan-900/20 border border-cyan-700 p-3 rounded mt-4">
                <p className="text-cyan-200 text-sm">
                  {t.guide.step1.contents}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="theme-bg-secondary theme-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-600 text-white text-sm font-bold">2</span>
                {t.guide.step2.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 theme-text-secondary">
              <p>{t.guide.step2.description}</p>

              <div className="bg-red-900/30 border-2 border-red-500 p-4 rounded-lg shadow-lg shadow-red-900/30">
                <p className="text-red-100 text-sm font-semibold leading-relaxed">
                  {t.guide.step2.adminNote}
                </p>
              </div>

              <ol className="list-decimal list-inside space-y-2 ml-4 theme-text-primary">
                {t.guide.step2.steps.map((step: string, idx: number) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
              <div className="bg-yellow-900/20 border border-yellow-700 p-3 rounded mt-2">
                <p className="text-yellow-200 text-sm">
                  {t.guide.step2.smartScreenNote}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="theme-bg-secondary theme-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-600 text-white text-sm font-bold">3</span>
                {t.guide.step3.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 theme-text-secondary">
              <div className="border border-cyan-500/30 rounded p-4">
                <p className="font-semibold text-cyan-300 mb-3">{t.guide.step3.fritzTitle}</p>
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  {t.guide.step3.fritzSteps.map((step: string, idx: number) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="border border-blue-500/30 rounded p-4">
                <p className="font-semibold text-blue-300 mb-3">{t.guide.step3.arenaTitle}</p>
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  {t.guide.step3.arenaSteps.map((step: string, idx: number) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card className="theme-bg-secondary theme-border bg-purple-900/10 border-purple-700/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <span className="text-xl">🔄</span>
                {t.guide.swap.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 theme-text-secondary">
              <p>{t.guide.swap.description}</p>
              <ol className="list-decimal list-inside space-y-2 ml-4 theme-text-primary">
                {t.guide.swap.steps.map((step: string, idx: number) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="theme-bg-secondary theme-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <span className="text-xl">⚠️</span>
                {t.guide.troubleshooting}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 theme-text-secondary">
              <div className="theme-bg-primary p-3 rounded">
                <p className="font-semibold text-yellow-400">{t.guide.problems.windowsBlocking}</p>
                <p className="text-sm">{t.guide.problems.windowsBlockingSolution}</p>
              </div>

              <div className="theme-bg-primary p-3 rounded">
                <p className="font-semibold text-cyan-400">{t.guide.problems.stockfishDownload}</p>
                <p className="text-sm">{t.guide.problems.stockfishDownloadSolution}</p>
              </div>

              <div className="theme-bg-primary p-3 rounded">
                <p className="font-semibold text-red-400">{t.guide.problems.engineNotWorking}</p>
                <p className="text-sm">{t.guide.problems.engineNotWorkingSolution}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="theme-bg-secondary theme-border opacity-80">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-base">
                <span className="text-base">🛠️</span>
                {t.guide.advanced.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 theme-text-secondary text-sm">
              <p>{t.guide.advanced.description}</p>
              <div className="flex flex-wrap gap-2">
                <a href="/install_engine.bat" download>
                  <Button variant="outline" size="sm" className="border-cyan-500/40 text-cyan-300/80 hover:bg-cyan-500/10 text-xs">
                    <Download className="mr-2 h-3 w-3" />
                    install_engine.bat
                  </Button>
                </a>
                <a href="/swap_profile.bat" download>
                  <Button variant="outline" size="sm" className="border-cyan-500/40 text-cyan-300/80 hover:bg-cyan-500/10 text-xs">
                    <Download className="mr-2 h-3 w-3" />
                    swap_profile.bat
                  </Button>
                </a>
                <a href="/AvatarEngine.exe" download>
                  <Button variant="outline" size="sm" className="border-cyan-500/40 text-cyan-300/80 hover:bg-cyan-500/10 text-xs">
                    <Download className="mr-2 h-3 w-3" />
                    AvatarEngine.exe
                  </Button>
                </a>
                <a href="/AvatarEngine.py" download>
                  <Button variant="outline" size="sm" className="border-cyan-500/40 text-cyan-300/80 hover:bg-cyan-500/10 text-xs">
                    <Download className="mr-2 h-3 w-3" />
                    AvatarEngine.py
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </main>
  );
}
