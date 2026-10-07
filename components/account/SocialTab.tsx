"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink, Loader2, Share2, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import AccountAvatar from "@/components/AccountAvatar";
import { Button } from "@/components/ui/button";
import { accountProfileInitials } from "@/lib/account-profile";
import { fill } from "@/lib/account-format";
import type { AccountFriend } from "@/lib/account-types";
import type { AccountCopy } from "./types";

type SocialTabProps = {
  copy: AccountCopy;
  userId: string;
  displayName: string;
  friends: AccountFriend[];
  friendsLoading: boolean;
  onRemoveFriend: (friendUserId: string) => Promise<void>;
};

export function SocialTab({ copy, userId, displayName, friends, friendsLoading, onRemoveFriend }: SocialTabProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <FriendsPanel copy={copy} friends={friends} loading={friendsLoading} onRemove={onRemoveFriend} />
      <ShareProfileCard copy={copy} userId={userId} displayName={displayName} />
    </div>
  );
}

function FriendsPanel({
  copy,
  friends,
  loading,
  onRemove,
}: {
  copy: AccountCopy;
  friends: AccountFriend[];
  loading: boolean;
  onRemove: (friendUserId: string) => Promise<void>;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const remove = async (id: string) => {
    setRemovingId(id);
    try {
      await onRemove(id);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section className="account-card border-violet-500/25">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="account-card-title !mb-0">
          <Users aria-hidden className="!text-violet-300" />
          {copy.friendsTitle}
        </h3>
        {!loading && <span className="text-xs text-violet-200 tabular-nums">{fill(copy.social.friendsCount, { n: friends.length })}</span>}
      </div>
      <p className="text-xs text-slate-400 mb-3">{copy.friendsHint}</p>

      {loading ? (
        <ul className="space-y-2">
          {[0, 1].map((i) => (
            <li key={i} className="account-skeleton h-14" />
          ))}
        </ul>
      ) : friends.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">{copy.friendsEmpty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {friends.map((friend) => (
            <li
              key={friend.friendUserId}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 min-h-14"
            >
              <Link href={`/players/${friend.friendUserId}`} className="flex items-center gap-3 min-w-0 group">
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-gradient-to-br from-cyan-600 to-blue-800">
                  <AccountAvatar
                    src={friend.avatarUrl}
                    alt={friend.displayName}
                    initials={accountProfileInitials(friend.displayName)}
                    sizes="40px"
                    className="text-xs"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-100 truncate group-hover:text-cyan-300">
                    {friend.label || friend.displayName}
                  </span>
                  {friend.label && friend.label !== friend.displayName && (
                    <span className="block text-[11px] text-slate-400 truncate">{friend.displayName}</span>
                  )}
                </span>
              </Link>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-10 w-10 text-rose-400 hover:text-rose-300 shrink-0"
                onClick={() => void remove(friend.friendUserId)}
                disabled={removingId === friend.friendUserId}
                title={copy.removeFriend}
                aria-label={copy.removeFriend}
              >
                {removingId === friend.friendUserId ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button asChild variant="secondary" className="mt-3 w-full min-h-11">
        <Link href="/online">{copy.inviteFriendsCta}</Link>
      </Button>
    </section>
  );
}

/** Android WebViews and non-secure origins often lack the async Clipboard API. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

function ShareProfileCard({ copy, userId, displayName }: { copy: AccountCopy; userId: string; displayName: string }) {
  const path = `/players/${userId}`;
  const [url, setUrl] = useState(path);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
    setCanShare(typeof navigator.share === "function");
  }, [path]);

  const copyLink = async () => {
    if (await copyToClipboard(url)) toast.success(copy.social.linkCopied);
    else toast.error(copy.social.copyError);
  };

  const share = async () => {
    try {
      await navigator.share({ title: displayName, url });
    } catch {
      /* dismissed */
    }
  };

  return (
    <section className="account-card h-fit">
      <h3 className="account-card-title">
        <Share2 aria-hidden />
        {copy.social.shareTitle}
      </h3>
      <p className="text-sm text-slate-400">{copy.social.shareDesc}</p>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">
        <code className="min-w-0 flex-1 truncate text-xs text-cyan-200">{url}</code>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <Button type="button" className="min-h-11 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold" onClick={() => void copyLink()}>
          <Copy className="h-4 w-4 mr-1.5" />
          {copy.social.copyLink}
        </Button>
        {canShare ? (
          <Button type="button" variant="outline" className="min-h-11 border-slate-600" onClick={() => void share()}>
            <Share2 className="h-4 w-4 mr-1.5" />
            {copy.social.share}
          </Button>
        ) : (
          <Button asChild variant="outline" className="min-h-11 border-slate-600">
            <Link href={path}>
              <ExternalLink className="h-4 w-4 mr-1.5" />
              {copy.social.viewPublic}
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}
