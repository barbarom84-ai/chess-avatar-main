"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AvatarChatPanel from "@/components/AvatarChatPanel";
import { useLanguage } from "@/lib/language-context";
import { getProfileById } from "@/lib/supabase-storage";
import type { DbProfile } from "@/lib/supabase";
import type { EngineConfig, PersonaStats } from "@/lib/analysis";

export default function CoachPage() {
  const { t } = useLanguage();
  const params = useParams<{ profileId: string }>();
  const profileId = typeof params.profileId === "string" ? params.profileId : "";
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getProfileById(profileId).then((row) => {
      if (!cancelled) {
        setProfile(row);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const stats = profile?.stats as PersonaStats | undefined;
  const config = profile?.config as EngineConfig | undefined;
  const title = stats
    ? t.avatarChat.titleWithName.replace("{name}", stats.username)
    : t.pages.coach.title;

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-4 flex flex-col min-h-[80vh]">
        <div className="flex items-center">
          <Link href="/avatars">
            <Button variant="ghost" className="text-cyan-300 hover:text-cyan-100">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.avatarChat.backToAvatars}
            </Button>
          </Link>
          <h1 className="sr-only">{title}</h1>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
          </div>
        ) : !profile || !stats || !config ? (
          <Card className="theme-bg-secondary border-cyan-500/20">
            <CardContent className="pt-6">
              <Alert variant="destructive" className="bg-red-900/20 border-red-700/50 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t.common.error}</AlertTitle>
                <AlertDescription>{t.avatarChat.notFound}</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        ) : (
          <AvatarChatPanel
            stats={stats}
            config={config}
            avatarUrl={config.avatarUrl || stats.avatarUrl || profile.avatar_url}
            variant="page"
          />
        )}
      </div>
    </main>
  );
}
