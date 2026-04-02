"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileJson, BookOpen } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function GuidePage() {
  const { lang, t } = useLanguage();
  
  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-8">

        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="h-12 w-12 text-cyan-400" />
            <h1 className="text-4xl font-bold neon-cyan">{t.guide.title}</h1>
          </div>
          <p className="text-cyan-400/70">{t.guide.subtitle}</p>
          
          {/* Téléchargement principal */}
          <div className="flex justify-center mt-6">
            <a href="/install_engine.bat" download>
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg glow-cyan text-lg px-8 py-6">
                <Download className="mr-2 h-5 w-5" />
                {t.guide.download} install_engine.bat
              </Button>
            </a>
          </div>
        </div>

        <div className="grid gap-6">
          
          {/* ÉTAPE 1 */}
          <Card className="theme-bg-secondary theme-border backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-600 text-white text-sm font-bold glow-cyan">1</span>
                {t.guide.step1.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 theme-text-secondary">
              <p>{t.guide.step1.description}</p>
              <ol className="list-decimal list-inside space-y-3 ml-4 theme-text-primary">
                {t.guide.step1.files.map((file: string, idx: number) => (
                  <li key={idx}>
                    <strong>{file}</strong>
                    {idx === 0 && <a href="/AvatarEngine.py" download className="ml-2 text-cyan-400 hover:underline">📥 {t.guide.download}</a>}
                    {idx === 1 && <a href="/install_engine.bat" download className="ml-2 text-cyan-400 hover:underline">📥 {t.guide.download}</a>}
                    {idx === 2 && <a href="https://stockfishchess.org/download/" target="_blank" rel="noopener noreferrer" className="ml-2 text-cyan-400 hover:underline">🔗 stockfishchess.org</a>}
                  </li>
                ))}
              </ol>
              
              <div className="bg-yellow-900/20 border border-yellow-700 p-3 rounded mt-4">
                <p className="text-yellow-300 text-sm">
                  <strong>⚠️ {t.guide.step1.warning}</strong>
                </p>
                <p className="text-yellow-200 text-sm mt-2">
                  {t.guide.step1.warningText}
                </p>
                <p className="text-yellow-200 text-sm mt-2">
                  💡 {t.guide.step1.tip}
                </p>
              </div>
              
              <div className="bg-green-900/20 border border-green-700 p-3 rounded mt-4">
                <p className="text-green-300 text-sm font-semibold">
                  ✨ {lang === 'fr' ? 'Le script détecte automatiquement votre fichier JSON, gardez son nom d\'origine !' : 'The script automatically detects your JSON file, keep its original name!'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ÉTAPE 2 */}
          <Card className="theme-bg-secondary theme-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-600 text-white text-sm font-bold">2</span>
                {t.guide.step3.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 theme-text-secondary">
              <p className="text-xl font-semibold text-green-400">{t.guide.step3.description}</p>
            </CardContent>
          </Card>

          {/* ÉTAPE 3 */}
          <Card className="theme-bg-secondary theme-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-600 text-white text-sm font-bold">3</span>
                {t.guide.step4.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 theme-text-secondary">
              <div className="border border-cyan-500/30 rounded p-4">
                <p className="font-semibold text-cyan-300 mb-3">{t.guide.step4.fritzTitle}</p>
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  {t.guide.step4.fritzSteps.map((step: string, idx: number) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="border border-blue-500/30 rounded p-4">
                <p className="font-semibold text-blue-300 mb-3">{t.guide.step4.arenaTitle}</p>
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  {t.guide.step4.arenaSteps.map((step: string, idx: number) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* PROBLÈMES */}
          <Card className="theme-bg-secondary theme-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <span className="text-xl">⚠️</span>
                {t.guide.troubleshooting}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 theme-text-secondary">
              <div className="theme-bg-primary p-3 rounded">
                <p className="font-semibold text-cyan-400">{t.guide.problems.pipBlocked}</p>
                <p className="text-sm">{t.guide.problems.pipBlockedSolution}</p>
              </div>

              <div className="theme-bg-primary p-3 rounded">
                <p className="font-semibold text-yellow-400">{t.guide.problems.windowsBlocking}</p>
                <p className="text-sm">{t.guide.problems.windowsBlockingSolution}</p>
              </div>

              <div className="theme-bg-primary p-3 rounded">
                <p className="font-semibold text-red-400">{t.guide.problems.pythonNotFound}</p>
                <p className="text-sm">{t.guide.problems.pythonNotFoundSolution}</p>
              </div>

              <div className="theme-bg-primary p-3 rounded">
                <p className="font-semibold text-red-400">{t.guide.problems.engineNotWorking}</p>
                <p className="text-sm">{t.guide.problems.engineNotWorkingSolution}</p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </main>
  );
}
