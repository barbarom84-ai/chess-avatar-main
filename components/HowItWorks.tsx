"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Download, Rocket, Save, PlayCircle } from "lucide-react";
import type { TranslationKey } from "@/lib/translations";

interface HowItWorksProps {
  t: TranslationKey;
}

export default function HowItWorks({ t }: HowItWorksProps) {
  return (
    <div className="w-full max-w-6xl mx-auto mb-12">
      <h2 className="text-3xl font-bold text-center mb-8 neon-cyan">
        {t.howItWorks.title}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Étape 1 */}
        <Card className="bg-slate-900/50 border-cyan-500/20 backdrop-blur-sm hover:border-cyan-500/40 transition-all">
          <CardHeader className="pb-3">
            <div className="w-12 h-12 rounded-full bg-cyan-600 flex items-center justify-center mb-2 glow-cyan">
              <Search className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-lg text-cyan-400">{t.howItWorks.step1.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            {t.howItWorks.step1.description}
          </CardContent>
        </Card>

        {/* Étape 2 */}
        <Card className="bg-slate-900/50 border-green-500/20 backdrop-blur-sm hover:border-green-500/40 transition-all">
          <CardHeader className="pb-3">
            <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center mb-2">
              <Rocket className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-lg text-green-400">{t.howItWorks.step2.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            {t.howItWorks.step2.description}
          </CardContent>
        </Card>

        {/* Étape 3 */}
        <Card className="bg-slate-900/50 border-purple-500/20 backdrop-blur-sm hover:border-purple-500/40 transition-all">
          <CardHeader className="pb-3">
            <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center mb-2">
              <Save className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-lg text-purple-400">{t.howItWorks.step3.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            {t.howItWorks.step3.description}
          </CardContent>
        </Card>

        {/* Étape 4 */}
        <Card className="bg-slate-900/50 border-amber-500/20 backdrop-blur-sm hover:border-amber-500/40 transition-all">
          <CardHeader className="pb-3">
            <div className="w-12 h-12 rounded-full bg-amber-600 flex items-center justify-center mb-2">
              <Download className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-lg text-amber-400">{t.howItWorks.step4.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            {t.howItWorks.step4.description}
          </CardContent>
        </Card>

        {/* Étape 5 */}
        <Card className="bg-slate-900/50 border-blue-500/20 backdrop-blur-sm hover:border-blue-500/40 transition-all">
          <CardHeader className="pb-3">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center mb-2">
              <PlayCircle className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-lg text-blue-400">{t.howItWorks.step5.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            {t.howItWorks.step5.description}
          </CardContent>
        </Card>
      </div>

      {/* Info supplémentaire */}
      <div className="mt-6 text-center">
        <p className="text-slate-400 text-sm">
          💡 <strong>{t.howItWorks.tip.split(':')[0]}:</strong> {t.howItWorks.tip.split(':')[1]}
        </p>
      </div>
    </div>
  );
}
