"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, UserMinus, UserPlus } from "lucide-react";
import AccountAvatar from "@/components/AccountAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-context";
import { accountProfileInitials } from "@/lib/account-profile";
import {
  addAccountFriendRemote,
  isAccountFriend,
  removeAccountFriendRemote,
} from "@/lib/account-friends";
import type { AccountFriend, AccountProfile } from "@/lib/account-types";
import { toast } from "sonner";

const STORAGE_KEY = "chess-avatar.pvp.opponentCardExpanded";

function readExpandedDefault(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "1") return true;
    if (stored === "0") return false;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(min-width: 640px)").matches;
}

type OnlinePvpOpponentCardProps = {
  oppId: string;
  oppLabel: string;
  oppColor: "white" | "black";
  opponentProfile: AccountProfile | null;
  friends: AccountFriend[];
  onFriendsChange: (friends: AccountFriend[]) => void;
};

export default function OnlinePvpOpponentCard({
  oppId,
  oppLabel,
  oppColor,
  opponentProfile,
  friends,
  onFriendsChange,
}: OnlinePvpOpponentCardProps) {
  const { t } = useLanguage();
  const o = t.playOnline;
  const displayName = opponentProfile?.displayName ?? oppLabel;
  const initials = accountProfileInitials(displayName);

  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(readExpandedDefault());
  }, []);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const colorLabel = oppColor === "white" ? o.opponentAsWhite : o.opponentAsBlack;

  return (
    <Card className="theme-bg-secondary border-slate-600/50 overflow-hidden">
      <CardHeader className="py-2 px-3 sm:py-3 sm:px-6">
        <button
          type="button"
          onClick={toggleExpanded}
          className="flex w-full items-center gap-2.5 text-left min-h-[44px] touch-manipulation"
          aria-expanded={expanded}
        >
          <div className="relative h-10 w-10 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-gradient-to-br from-cyan-600 to-blue-800">
            <AccountAvatar
              src={opponentProfile?.avatarUrl}
              alt={displayName}
              initials={initials}
              sizes="44px"
              className="text-xs"
            />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm sm:text-base text-slate-100 truncate leading-tight">
              {displayName}
            </CardTitle>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">{colorLabel}</p>
          </div>
          <span className="shrink-0 text-slate-400" aria-hidden>
            {expanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </span>
        </button>
        <p className="text-[10px] text-slate-500 pt-0.5 sm:hidden">
          {expanded ? o.opponentCardCollapse : o.opponentCardExpand}
        </p>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3 pt-0 px-3 pb-3 sm:px-6 sm:pb-4">
          {opponentProfile?.bio ? (
            <p className="text-xs text-slate-400 leading-relaxed">{opponentProfile.bio}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button asChild type="button" size="sm" variant="outline" className="border-slate-600 min-h-10">
              <Link href={`/players/${oppId}`}>{o.viewOpponentProfile}</Link>
            </Button>
            {!isAccountFriend(friends, oppId) ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="min-h-10"
                onClick={() => {
                  void addAccountFriendRemote(oppId, oppLabel).then((next) => {
                    if (!next) {
                      toast.error(o.openLobbiesError);
                      return;
                    }
                    onFriendsChange(next);
                    toast.success(o.friendAdded);
                  });
                }}
              >
                <UserPlus className="h-4 w-4 mr-1 inline" />
                {o.addFriend}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-red-400 min-h-10"
                onClick={() => {
                  void removeAccountFriendRemote(oppId).then((next) => {
                    if (!next) {
                      toast.error(o.openLobbiesError);
                      return;
                    }
                    onFriendsChange(next);
                    toast.success(o.friendRemoved);
                  });
                }}
              >
                <UserMinus className="h-4 w-4 mr-1 inline" />
                {o.removeFriend}
              </Button>
            )}
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:block">{o.opponentProfileHint}</p>
        </CardContent>
      )}
    </Card>
  );
}
