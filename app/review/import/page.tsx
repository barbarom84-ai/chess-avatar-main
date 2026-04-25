"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import PgnImportCard from "@/components/PgnImportCard";
import { useLanguage } from "@/lib/language-context";

export default function ReviewImportPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-3 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Link href="/">
            <Button
              variant="ghost"
              className="text-cyan-300 hover:text-cyan-100"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.backToHome}
            </Button>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-cyan-400">
            {t.review.import.pageTitle}
          </h1>
          <div className="w-32 hidden md:block" />
        </div>

        <PgnImportCard />
      </div>
    </main>
  );
}
