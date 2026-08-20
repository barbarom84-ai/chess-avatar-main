"use client";

import UserSavedAvatars from "@/components/UserSavedAvatars";
import ArenaChampionsLibrary from "@/components/ArenaChampionsLibrary";
import ProfileCollectionsPanel from "@/components/ProfileCollectionsPanel";
import OfflineSyncBanner from "@/components/OfflineSyncBanner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Swords } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function AvatarsPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold neon-cyan">{t.pages.avatars.title}</h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">{t.avatarsPage.subtitle}</p>
        </div>
        <OfflineSyncBanner />
        <div className="flex justify-center">
          <Link href="/compare">
            <Button variant="outline" className="border-cyan-700 text-cyan-300">
              <Swords className="h-4 w-4 mr-2" />
              {t.comparePage.title}
            </Button>
          </Link>
        </div>
        <ArenaChampionsLibrary />
        <ProfileCollectionsPanel />
        <UserSavedAvatars />
      </div>
    </main>
  );
}
