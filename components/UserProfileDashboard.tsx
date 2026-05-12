"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Database,
  Loader2,
  Crown,
  Sparkles,
  Bot,
  Library,
  Search,
  History,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getUserProfileCount } from "@/lib/supabase-storage";
import { useLanguage } from "@/lib/language-context";
import { usePremium } from "@/hooks/usePremium";
import UpgradeModal from "@/components/UpgradeModal";
import { toast } from "sonner";

function displayNameFromUser(user: SupabaseUser): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const full =
    typeof meta?.full_name === "string"
      ? meta.full_name.trim()
      : typeof meta?.name === "string"
        ? (meta.name as string).trim()
        : "";
  if (full) return full;
  const email = user.email ?? "";
  const local = email.split("@")[0];
  return local || email || "?";
}

function initialsFromUser(user: SupabaseUser): string {
  const name = displayNameFromUser(user);
  const parts = name.replace(/[^a-zA-ZÀ-ÿ0-9]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? "";
    const b = parts[1][0] ?? "";
    return (a + b).toUpperCase();
  }
  if (name.length >= 2) return name.slice(0, 2).toUpperCase();
  return (name[0] ?? "?").toUpperCase();
}

export default function UserProfileDashboard() {
  const { t, lang } = useLanguage();
  const { isPremium, loading: premiumLoading, userId, email: premiumEmail } = usePremium();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarCount, setAvatarCount] = useState<number | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const loadUser = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const {
      data: { user: nextUser },
    } = await supabase.auth.getUser();
    setUser(nextUser);
    setLoading(false);
  }, []);

  const refreshAvatarCount = useCallback(async () => {
    const n = await getUserProfileCount();
    setAvatarCount(n);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) void refreshAvatarCount();
      else setAvatarCount(null);
    });

    return () => subscription.unsubscribe();
  }, [loadUser, refreshAvatarCount]);

  useEffect(() => {
    if (user) void refreshAvatarCount();
    else setAvatarCount(null);
  }, [user, refreshAvatarCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") {
      toast.success(t.profileDashboard.paymentSuccess);
      window.history.replaceState({}, "", "/profile");
    } else if (payment === "canceled") {
      toast.message(t.profileDashboard.paymentCanceled);
      window.history.replaceState({}, "", "/profile");
    }
  }, [t.profileDashboard.paymentSuccess, t.profileDashboard.paymentCanceled]);

  const memberSinceLabel = useMemo(() => {
    if (!user?.created_at) return null;
    return new Date(user.created_at).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [user?.created_at, lang]);

  if (loading) {
    return (
      <Card className="bg-slate-900/90 border-slate-800 backdrop-blur-sm">
        <CardContent className="p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </CardContent>
      </Card>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <Card className="bg-slate-900/90 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Database className="h-5 w-5 text-slate-500" />
            {t.profile.databaseNotConfigured}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-orange-900/10 border-orange-700">
            <AlertDescription className="text-orange-300 text-sm">
              {t.profile.databaseWarning}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="bg-slate-900/90 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Database className="h-5 w-5 text-slate-500" />
            {t.profile.notConnected}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-blue-900/10 border-blue-700">
            <AlertDescription className="text-blue-300 text-sm">{t.profile.signInPrompt}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const displayName = displayNameFromUser(user);
  const initials = initialsFromUser(user);
  const email = user.email ?? premiumEmail ?? "";

  return (
    <div className="space-y-0">
      <div className="relative rounded-t-2xl overflow-hidden h-36 md:h-44 bg-gradient-to-r from-slate-900 via-cyan-950/80 to-slate-900 border border-b-0 border-slate-800/80">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(34,211,238,0.25), transparent 50%),
              radial-gradient(circle at 80% 30%, rgba(147,51,234,0.2), transparent 45%)`,
          }}
        />
      </div>

      <Card className="relative z-10 -mt-14 mx-auto max-w-3xl rounded-2xl border border-slate-700/90 bg-slate-900/95 shadow-xl shadow-black/40 backdrop-blur-md">
        <CardContent className="p-6 md:p-8 pt-4 md:pt-5">
          <div className="flex flex-col sm:flex-row gap-6 sm:items-end">
            <div
              className="shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-slate-900 bg-gradient-to-br from-cyan-600 to-blue-800 flex items-center justify-center text-2xl md:text-3xl font-bold text-white shadow-lg ring-2 ring-cyan-500/30"
              aria-hidden
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0 space-y-2 pb-1">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-50 truncate">{displayName}</h2>
                {!premiumLoading && isPremium && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/50 gap-1">
                    <Crown className="h-3 w-3" />
                    {t.profileDashboard.premiumBadge}
                  </Badge>
                )}
                {!premiumLoading && !isPremium && (
                  <Badge variant="outline" className="text-slate-400 border-slate-600">
                    {t.profileDashboard.freeAccount}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-400 break-all">{email}</p>
              {memberSinceLabel && (
                <p className="text-xs text-slate-500">
                  {t.profileDashboard.memberSince} {memberSinceLabel}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 text-center">
              <p className="text-2xl font-bold text-cyan-400 tabular-nums">
                {avatarCount === null ? "—" : avatarCount}
              </p>
              <p className="text-xs text-slate-500 mt-1">{t.profileDashboard.savedAvatarsStat}</p>
            </div>
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 text-center flex flex-col items-center justify-center gap-2">
              {isPremium ? (
                <Sparkles className="h-8 w-8 text-amber-400/90" />
              ) : (
                <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-200" onClick={() => setUpgradeOpen(true)}>
                  <Crown className="h-3.5 w-3.5 mr-1" />
                  Premium
                </Button>
              )}
            </div>
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 flex items-center justify-center">
              <Button asChild variant="ghost" className="text-cyan-300 hover:text-cyan-200 hover:bg-cyan-950/50">
                <Link href="/games" className="inline-flex items-center gap-2">
                  <History className="h-4 w-4" />
                  {t.profileDashboard.ctaGames}
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <Button asChild className="bg-cyan-600 hover:bg-cyan-500">
              <Link href="/avatars" className="inline-flex items-center gap-2">
                <Bot className="h-4 w-4" />
                {t.profileDashboard.ctaAvatars}
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-600 text-slate-200">
              <Link href="/analyze" className="inline-flex items-center gap-2">
                <Search className="h-4 w-4" />
                {t.profileDashboard.ctaAnalyze}
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-600 text-slate-200">
              <Link href="/play" className="inline-flex items-center gap-2">
                <Library className="h-4 w-4" />
                {t.profileDashboard.ctaPublicLibrary}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        userId={userId}
        email={premiumEmail ?? email}
        reason="profiles"
      />
    </div>
  );
}
