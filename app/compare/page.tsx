"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import EngineComparisonPanel from "@/components/EngineComparisonPanel";
import { useLanguage } from "@/lib/language-context";

export default function ComparePage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Link href="/avatars" className="inline-block mb-2">
            <Button variant="ghost" className="text-cyan-300 hover:text-cyan-100">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.backToHome}
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-cyan-400">{t.comparePage.title}</h1>
          <p className="text-slate-400 text-sm">{t.comparePage.subtitle}</p>
        </div>
        <EngineComparisonPanel />
      </div>
    </main>
  );
}
