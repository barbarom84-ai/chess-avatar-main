"use client";

import { useEffect, useMemo, useState } from "react";
import AccountAvatar from "@/components/AccountAvatar";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, UserMinus, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { useSuperUser } from "@/hooks/useSuperUser";
import type { AccountProfile } from "@/lib/account-types";
import {
  accountProfileInitials,
  fetchPublicAccountProfile,
} from "@/lib/account-profile";
import {
  addAccountFriendRemote,
  fetchAccountFriends,
  removeAccountFriendRemote,
} from "@/lib/account-friends";
import { toast } from "sonner";

export default function PlayerProfilePage() {
  const { t, lang } = useLanguage();
  const copy = t.playersPage;
  const params = useParams<{ userId: string }>();
  const userId = typeof params.userId === "string" ? params.userId : "";
  const { userId: viewerId } = useSuperUser();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchPublicAccountProfile(userId).then((next) => {
      setProfile(next);
      setLoading(false);
    });
  }, [userId]);

  useEffect(() => {
    if (!viewerId) {
      setFriends([]);
      return;
    }
    void fetchAccountFriends().then((list) => {
      setFriends(list.map((friend) => friend.friendUserId));
    });
  }, [viewerId]);

  const isFriend = useMemo(
    () => (userId ? friends.includes(userId) : false),
    [friends, userId]
  );

  const memberSinceLabel = useMemo(() => {
    if (!profile?.memberSince) return null;
    return new Date(profile.memberSince).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [profile?.memberSince, lang]);

  const handleToggleFriend = async () => {
    if (!profile || !viewerId || viewerId === profile.userId) return;
    setActionLoading(true);
    try {
      if (isFriend) {
        const next = await removeAccountFriendRemote(profile.userId);
        if (!next) {
          toast.error(copy.loadError);
          return;
        }
        setFriends(next.map((friend) => friend.friendUserId));
        toast.success(copy.friendRemoved);
        return;
      }
      const next = await addAccountFriendRemote(profile.userId, profile.displayName);
      if (!next) {
        toast.error(copy.loadError);
        return;
      }
      setFriends(next.map((friend) => friend.friendUserId));
      toast.success(copy.friendAdded);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-slate-100 p-4 md:p-8">
        <div className="max-w-3xl mx-auto flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-slate-100 p-4 md:p-8">
        <div className="max-w-3xl mx-auto text-center space-y-4 py-16">
          <p className="text-slate-400">{copy.loadError}</p>
          <Button asChild variant="outline">
            <Link href="/online">{copy.backToPvp}</Link>
          </Button>
        </div>
      </main>
    );
  }

  const initials = accountProfileInitials(profile.displayName);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold neon-cyan">{copy.title}</h1>
          <p className="text-slate-500 text-sm">{copy.subtitle}</p>
        </div>

        <Card className="bg-slate-900/95 border-slate-700/90">
          <CardHeader>
            <CardTitle className="text-cyan-100">{profile.displayName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-slate-700 bg-gradient-to-br from-cyan-600 to-blue-800">
                <AccountAvatar
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  initials={initials}
                  sizes="96px"
                  className="text-2xl"
                />
              </div>
              <div className="space-y-2">
                {memberSinceLabel && (
                  <p className="text-sm text-slate-500">
                    {copy.memberSince} {memberSinceLabel}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {viewerId && viewerId !== profile.userId && (
                    <Button
                      type="button"
                      size="sm"
                      variant={isFriend ? "ghost" : "secondary"}
                      disabled={actionLoading}
                      onClick={() => void handleToggleFriend()}
                    >
                      {isFriend ? (
                        <>
                          <UserMinus className="h-4 w-4 mr-1" />
                          {copy.removeFriend}
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-1" />
                          {copy.addFriend}
                        </>
                      )}
                    </Button>
                  )}
                  <Button asChild size="sm" variant="outline" className="border-slate-600">
                    <Link href="/online">{copy.invitePvp}</Link>
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-300 mb-2">{copy.aboutTitle}</h2>
              <p className="text-sm text-slate-400 whitespace-pre-wrap">
                {profile.bio?.trim() ? profile.bio : copy.bioEmpty}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button asChild variant="ghost" className="text-slate-400">
            <Link href="/online">{copy.backToPvp}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
