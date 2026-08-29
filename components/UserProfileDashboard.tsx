"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import AccountAvatar from "@/components/AccountAvatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Database,
  Loader2,
  Crown,
  Bot,
  History,
  Pencil,
  UserMinus,
  Users,
  Star,
  Gamepad2,
  LogOut,
  Trash2,
  LogIn,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getUserProfileCount } from "@/lib/supabase-storage";
import { useLanguage } from "@/lib/language-context";
import { usePremium } from "@/hooks/usePremium";
import UpgradeModal from "@/components/UpgradeModal";
import AccountProfileEditor from "@/components/AccountProfileEditor";
import AuthModal from "@/components/AuthModal";
import { toast } from "sonner";
import type { AccountFriend, AccountProfile } from "@/lib/account-types";
import {
  accountProfileInitials,
  deleteOwnAccount,
  fetchOwnAccountProfile,
} from "@/lib/account-profile";
import {
  fetchAccountFriends,
  migrateLocalFriendsOnce,
  removeAccountFriendRemote,
} from "@/lib/account-friends";
import { displayNameFromAuthUser } from "@/lib/pvp-display-name";

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

export default function UserProfileDashboard() {
  const { t, lang } = useLanguage();
  const copy = t.profileDashboard;
  const { isPremium, loading: premiumLoading, userId, email: premiumEmail } = usePremium();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarCount, setAvatarCount] = useState<number | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [friends, setFriends] = useState<AccountFriend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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

  const refreshProfile = useCallback(async (authUser: SupabaseUser) => {
    const remote = await fetchOwnAccountProfile();
    setProfile(remote ?? fallbackProfileFromUser(authUser));
  }, []);

  const refreshFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      await migrateLocalFriendsOnce();
      const list = await fetchAccountFriends();
      setFriends(list);
    } finally {
      setFriendsLoading(false);
    }
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
    if (!user) {
      setProfile(null);
      setFriends([]);
      setAvatarCount(null);
      return;
    }
    void refreshAvatarCount();
    void refreshProfile(user);
    void refreshFriends();
  }, [user, refreshAvatarCount, refreshProfile, refreshFriends]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") {
      toast.success(copy.paymentSuccess);
      window.history.replaceState({}, "", "/profile");
    } else if (payment === "canceled") {
      toast.message(copy.paymentCanceled);
      window.history.replaceState({}, "", "/profile");
    }
  }, [copy.paymentSuccess, copy.paymentCanceled]);

  const memberSinceLabel = useMemo(() => {
    const source = profile?.memberSince ?? user?.created_at;
    if (!source) return null;
    return new Date(source).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [profile?.memberSince, user?.created_at, lang]);

  const handleRemoveFriend = async (friendUserId: string) => {
    const next = await removeAccountFriendRemote(friendUserId);
    if (!next) {
      toast.error(copy.friendsRemoveError);
      return;
    }
    setFriends(next);
    toast.success(copy.friendRemoved);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } finally {
      setSigningOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const result = await deleteOwnAccount();
      if (!result.ok) {
        toast.error(result.error ?? copy.deleteAccountError);
        return;
      }
      toast.success(copy.deleteAccountSuccess);
      setDeleteOpen(false);
      await supabase?.auth.signOut();
      setUser(null);
    } finally {
      setDeleting(false);
    }
  };

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

  if (!user || !profile) {
    return (
      <>
        <Card className="bg-slate-900/90 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              {t.profile.notConnected}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-400">{copy.signInDesc}</p>
            <Button className="bg-cyan-600 hover:bg-cyan-500" onClick={() => setAuthOpen(true)}>
              <LogIn className="h-4 w-4 mr-2" />
              {copy.signInCta}
            </Button>
          </CardContent>
        </Card>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </>
    );
  }

  const email = profile.email ?? user.email ?? premiumEmail ?? "";
  const initials = accountProfileInitials(profile.displayName);

  const shortcuts = [
    {
      href: "/avatars",
      icon: Bot,
      label: copy.ctaAvatars,
      desc: copy.shortcutAvatarsDesc,
      meta: avatarCount === null ? "—" : String(avatarCount),
    },
    {
      href: "/games",
      icon: History,
      label: copy.ctaGames,
      desc: copy.shortcutGamesDesc,
    },
    {
      href: "/ascension",
      icon: Star,
      label: copy.ascensionLink,
      desc: copy.shortcutAscensionDesc,
    },
    {
      href: "/online",
      icon: Gamepad2,
      label: t.pages.online.nav,
      desc: copy.shortcutPvpDesc,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="relative rounded-t-2xl overflow-hidden h-28 md:h-32 bg-gradient-to-r from-slate-900 via-cyan-950/80 to-slate-900 border border-b-0 border-slate-800/80">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(34,211,238,0.25), transparent 50%),
              radial-gradient(circle at 80% 30%, rgba(147,51,234,0.2), transparent 45%)`,
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <Card className="relative z-10 -mt-14 rounded-2xl border border-slate-700/90 bg-slate-900/95 shadow-xl shadow-black/40 backdrop-blur-md">
            <CardContent className="p-6 md:p-8 pt-4 md:pt-5">
              <ProfileIdentityRow
                avatarUrl={profile.avatarUrl}
                copy={copy}
                displayName={profile.displayName}
                email={email}
                initials={initials}
                isPremium={isPremium}
                memberSinceLabel={memberSinceLabel}
                premiumLoading={premiumLoading}
                setEditorOpen={setEditorOpen}
                setUpgradeOpen={setUpgradeOpen}
              />

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">{copy.aboutTitle}</h3>
                <p className="text-sm text-slate-400 whitespace-pre-wrap">
                  {profile.bio?.trim() ? profile.bio : copy.bioEmpty}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/95 border-slate-700/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-100">{copy.shortcutsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shortcuts.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-xl border border-slate-800 bg-slate-950/70 p-4 hover:border-cyan-500/40 hover:bg-slate-900 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <item.icon className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-100">{item.label}</p>
                        {"meta" in item && item.meta != null && (
                          <span className="text-xs tabular-nums text-cyan-300">{item.meta}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/95 border-slate-700/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-400" />
                {copy.subscriptionTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div>
                {isPremium ? (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/50 gap-1 mb-2">
                    <Crown className="h-3 w-3" />
                    {copy.premiumBadge}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-400 border-slate-600 mb-2">
                    {copy.freeAccount}
                  </Badge>
                )}
                <p className="text-sm text-slate-400">
                  {isPremium ? copy.subscriptionPremiumDesc : copy.subscriptionFreeDesc}
                </p>
              </div>
              {!isPremium && !premiumLoading && (
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-500 text-white"
                  onClick={() => setUpgradeOpen(true)}
                >
                  <Crown className="h-3.5 w-3.5 mr-1" />
                  {copy.upgradeCta}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/95 border-slate-800/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-300">{copy.accountSectionTitle}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-600 text-slate-200"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
              >
                {signingOut ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
                {copy.signOutCta}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-red-500/40 text-red-400 hover:bg-red-950/40"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {copy.deleteAccount}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900/95 border-violet-500/25 h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-violet-100 flex items-center gap-2">
              <Users className="h-5 w-5" />
              {copy.friendsTitle}
            </CardTitle>
            <p className="text-xs text-slate-400 font-normal pt-1">{copy.friendsHint}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {friendsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-violet-300" />
              </div>
            ) : friends.length === 0 ? (
              <p className="text-sm text-slate-500">{copy.friendsEmpty}</p>
            ) : (
              <ul className="space-y-2">
                {friends.map((friend) => (
                  <li
                    key={friend.friendUserId}
                    className="flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-gradient-to-br from-cyan-600 to-blue-800">
                        <AccountAvatar
                          src={friend.avatarUrl}
                          alt={friend.displayName}
                          initials={accountProfileInitials(friend.displayName)}
                          sizes="40px"
                          className="text-xs"
                        />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/players/${friend.friendUserId}`}
                          className="text-sm font-medium text-slate-100 truncate hover:text-cyan-300"
                        >
                          {friend.label || friend.displayName}
                        </Link>
                        <p className="text-[10px] text-slate-500 truncate">{friend.displayName}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 shrink-0"
                      onClick={() => void handleRemoveFriend(friend.friendUserId)}
                      title={copy.removeFriend}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="secondary" size="sm" className="w-full">
              <Link href="/online">{copy.inviteFriendsCta}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

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

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-200">{copy.deleteAccountTitle}</DialogTitle>
            <DialogDescription className="text-slate-400">{copy.deleteAccountBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              {copy.deleteAccountCancel}
            </Button>
            <Button
              type="button"
              className="bg-red-700 hover:bg-red-600 text-white"
              onClick={() => void handleDeleteAccount()}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {copy.deleteAccountConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileIdentityRow({
  avatarUrl,
  copy,
  displayName,
  email,
  initials,
  isPremium,
  memberSinceLabel,
  premiumLoading,
  setEditorOpen,
  setUpgradeOpen,
}: {
  avatarUrl: string | null;
  copy: import("@/lib/i18n").TranslationKey["profileDashboard"];
  displayName: string;
  email: string;
  initials: string;
  isPremium: boolean;
  memberSinceLabel: string | null;
  premiumLoading: boolean;
  setEditorOpen: (open: boolean) => void;
  setUpgradeOpen: (open: boolean) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 sm:items-end">
      <div className="relative shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-slate-900 overflow-hidden bg-gradient-to-br from-cyan-600 to-blue-800 shadow-lg ring-2 ring-cyan-500/30">
        <AccountAvatar
          src={avatarUrl}
          alt={displayName}
          initials={initials}
          sizes="112px"
          className="text-2xl md:text-3xl"
        />
      </div>
      <div className="flex-1 min-w-0 space-y-2 pb-1">
        <div className="flex flex-wrap items-center gap-2 gap-y-1">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-50 truncate">{displayName}</h2>
          {!premiumLoading && isPremium && (
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/50 gap-1">
              <Crown className="h-3 w-3" />
              {copy.premiumBadge}
            </Badge>
          )}
          {!premiumLoading && !isPremium && (
            <Badge variant="outline" className="text-slate-400 border-slate-600">
              {copy.freeAccount}
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-400 break-all">{email}</p>
        {memberSinceLabel && (
          <p className="text-xs text-slate-500">
            {copy.memberSince} {memberSinceLabel}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" size="sm" variant="outline" className="border-slate-600" onClick={() => setEditorOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            {copy.editProfile}
          </Button>
          {!isPremium && !premiumLoading && (
            <Button type="button" size="sm" variant="ghost" className="text-amber-200" onClick={() => setUpgradeOpen(true)}>
              <Crown className="h-3.5 w-3.5 mr-1" />
              {copy.upgradeCta}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
