"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Database, LayoutDashboard, LogIn, Settings2, Users } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccountProfileEditor from "@/components/AccountProfileEditor";
import AuthModal from "@/components/AuthModal";
import UpgradeModal from "@/components/UpgradeModal";
import { usePremium } from "@/hooks/usePremium";
import { deleteOwnAccount, fetchAccountStats, fetchOwnAccountProfile } from "@/lib/account-profile";
import { fetchAccountFriends, migrateLocalFriendsOnce, removeAccountFriendRemote } from "@/lib/account-friends";
import type { AccountFriend, AccountProfile, AccountStats } from "@/lib/account-types";
import { localeFor } from "@/lib/account-format";
import { useLanguage } from "@/lib/language-context";
import { displayNameFromAuthUser } from "@/lib/pvp-display-name";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { AccountHero } from "./AccountHero";
import { OverviewTab } from "./OverviewTab";
import { StatsTab } from "./StatsTab";
import { SocialTab } from "./SocialTab";
import { AccountSettingsPanel } from "./AccountSettingsPanel";
import { DangerZone } from "./DangerZone";
import { parseAccountTab, type AccountTab } from "./types";

const STATS_STALE_MS = 60_000;

function fallbackProfileFromUser(user: SupabaseUser): AccountProfile {
  return {
    userId: user.id,
    displayName: displayNameFromAuthUser(user),
    bio: null,
    avatarUrl: null,
    memberSince: user.created_at ?? null,
    email: user.email ?? undefined,
  };
}

export default function AccountDashboard() {
  const { t, lang } = useLanguage();
  const copy = t.profileDashboard;
  const { isPremium, loading: premiumLoading, userId, email: premiumEmail } = usePremium();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [friends, setFriends] = useState<AccountFriend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const statsLoadedAt = useRef(0);
  const [tab, setTab] = useState<AccountTab>("overview");
  const [editorOpen, setEditorOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    setTab(parseAccountTab(new URLSearchParams(window.location.search).get("tab")));
  }, []);

  const changeTab = useCallback((value: string) => {
    const next = parseAccountTab(value);
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const refreshStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const next = await fetchAccountStats();
      if (next) {
        setStats(next);
        setStatsError(false);
        statsLoadedAt.current = Date.now();
      } else {
        setStatsError(true);
      }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async (authUser: SupabaseUser) => {
    const remote = await fetchOwnAccountProfile();
    setProfile(remote ?? fallbackProfileFromUser(authUser));
  }, []);

  const refreshFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      await migrateLocalFriendsOnce();
      setFriends(await fetchAccountFriends());
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser((prev) => (prev?.id === session?.user?.id ? prev : session?.user ?? null));
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setFriends([]);
      setStats(null);
      return;
    }
    void refreshProfile(user);
    void refreshFriends();
    void refreshStats();
  }, [user, refreshProfile, refreshFriends, refreshStats]);

  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - statsLoadedAt.current > STATS_STALE_MS) {
        void refreshStats();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user, refreshStats]);

  useEffect(() => {
    const payment = new URLSearchParams(window.location.search).get("payment");
    if (payment !== "success" && payment !== "canceled") return;
    if (payment === "success") toast.success(copy.paymentSuccess);
    else toast.message(copy.paymentCanceled);
    const url = new URL(window.location.href);
    url.searchParams.delete("payment");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [copy.paymentSuccess, copy.paymentCanceled]);

  const memberSinceLabel = useMemo(() => {
    const source = profile?.memberSince ?? user?.created_at;
    if (!source) return null;
    return new Date(source).toLocaleDateString(localeFor(lang), { year: "numeric", month: "long", day: "numeric" });
  }, [profile?.memberSince, user?.created_at, lang]);

  const handleRemoveFriend = useCallback(
    async (friendUserId: string) => {
      const next = await removeAccountFriendRemote(friendUserId);
      if (!next) {
        toast.error(copy.friendsRemoveError);
        return;
      }
      setFriends(next);
      toast.success(copy.friendRemoved);
    },
    [copy.friendsRemoveError, copy.friendRemoved]
  );

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    const result = await deleteOwnAccount();
    if (!result.ok) {
      toast.error(result.error ?? copy.deleteAccountError);
      return false;
    }
    toast.success(copy.deleteAccountSuccess);
    await supabase?.auth.signOut();
    setUser(null);
    return true;
  }, [copy.deleteAccountError, copy.deleteAccountSuccess]);

  if (loading) return <DashboardSkeleton />;

  if (!isSupabaseConfigured) {
    return (
      <section className="account-card space-y-3">
        <h2 className="account-card-title">
          <Database aria-hidden />
          {t.profile.databaseNotConfigured}
        </h2>
        <Alert className="bg-orange-900/10 border-orange-700">
          <AlertDescription className="text-orange-300 text-sm">{t.profile.databaseWarning}</AlertDescription>
        </Alert>
      </section>
    );
  }

  if (!user) {
    return (
      <>
        <section className="account-hero p-6 md:p-10 text-center space-y-4">
          <h2 className="text-xl font-semibold text-slate-100">{t.profile.notConnected}</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">{copy.signInDesc}</p>
          <Button className="min-h-11 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold" onClick={() => setAuthOpen(true)}>
            <LogIn className="h-4 w-4 mr-2" />
            {copy.signInCta}
          </Button>
        </section>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </>
    );
  }

  if (!profile) return <DashboardSkeleton />;

  const email = profile.email ?? user.email ?? premiumEmail ?? "";
  const tabs = [
    { value: "overview", icon: LayoutDashboard, label: copy.tabs.overview },
    { value: "stats", icon: BarChart3, label: copy.tabs.stats },
    { value: "social", icon: Users, label: copy.tabs.social },
    { value: "settings", icon: Settings2, label: copy.tabs.settings },
  ] as const;

  return (
    <div className="space-y-4">
      <AccountHero
        copy={copy}
        lang={lang}
        profile={profile}
        email={email}
        memberSinceLabel={memberSinceLabel}
        isPremium={isPremium}
        premiumLoading={premiumLoading}
        stats={stats}
        statsLoading={statsLoading}
        onEdit={() => setEditorOpen(true)}
        onUpgrade={() => setUpgradeOpen(true)}
      />

      <Tabs value={tab} onValueChange={changeTab} className="gap-4">
        <div className="account-tabs-bar">
          <TabsList className="account-tabs-list">
            {tabs.map(({ value, icon: Icon, label }) => (
              <TabsTrigger key={value} value={value} className="account-tab">
                <Icon aria-hidden />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview">
          <OverviewTab
            copy={copy}
            lang={lang}
            pvpLabel={t.pages.online.nav}
            stats={stats}
            statsLoading={statsLoading}
            statsError={statsError}
            onRetry={() => void refreshStats()}
            playerName={profile.displayName}
            isPremium={isPremium}
            premiumLoading={premiumLoading}
            onUpgrade={() => setUpgradeOpen(true)}
          />
        </TabsContent>
        <TabsContent value="stats">
          <StatsTab
            copy={copy}
            lang={lang}
            stats={stats}
            loading={statsLoading}
            error={statsError}
            onRetry={() => void refreshStats()}
          />
        </TabsContent>
        <TabsContent value="social">
          <SocialTab
            copy={copy}
            userId={user.id}
            displayName={profile.displayName}
            friends={friends}
            friendsLoading={friendsLoading}
            onRemoveFriend={handleRemoveFriend}
          />
        </TabsContent>
        <TabsContent value="settings" className="space-y-4">
          <AccountSettingsPanel copy={copy} isPremium={isPremium} onUpgrade={() => setUpgradeOpen(true)} />
          <DangerZone copy={copy} onSignOut={handleSignOut} onDelete={handleDeleteAccount} />
        </TabsContent>
      </Tabs>

      <AccountProfileEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        profile={profile}
        userId={userId ?? user.id}
        onSaved={setProfile}
      />
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

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="account-hero p-6 flex items-center gap-4">
        <div className="account-skeleton h-20 w-20 !rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="account-skeleton h-6 w-40" />
          <div className="account-skeleton h-4 w-56 max-w-full" />
        </div>
      </div>
      <div className="account-skeleton h-12" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="account-skeleton h-20" />
        ))}
      </div>
    </div>
  );
}
