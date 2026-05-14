import { loadPvpFriends } from "@/lib/pvp-friends-local";
import { hasFriendsMigrated, markFriendsMigrated } from "@/lib/account-profile";
import { accountApiHeaders } from "@/lib/account-api-auth";
import type { AccountFriend } from "@/lib/account-types";

async function parseFriendsResponse(res: Response): Promise<AccountFriend[] | null> {
  try {
    const data = (await res.json()) as { friends?: AccountFriend[] };
    return Array.isArray(data.friends) ? data.friends : null;
  } catch {
    return null;
  }
}

export async function fetchAccountFriends(): Promise<AccountFriend[]> {
  const res = await fetch("/api/account/friends", {
    cache: "no-store",
    credentials: "include",
    headers: await accountApiHeaders(false),
  });
  if (!res.ok) return [];
  return (await parseFriendsResponse(res)) ?? [];
}

export async function addAccountFriendRemote(
  friendUserId: string,
  label: string
): Promise<AccountFriend[] | null> {
  const res = await fetch("/api/account/friends", {
    method: "POST",
    credentials: "include",
    headers: await accountApiHeaders(),
    body: JSON.stringify({ friendUserId, label }),
  });
  if (!res.ok) return null;
  return parseFriendsResponse(res);
}

export async function removeAccountFriendRemote(friendUserId: string): Promise<AccountFriend[] | null> {
  const res = await fetch(
    `/api/account/friends?friendUserId=${encodeURIComponent(friendUserId)}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: await accountApiHeaders(false),
    }
  );
  if (!res.ok) return null;
  return parseFriendsResponse(res);
}

export async function migrateLocalFriendsOnce(): Promise<AccountFriend[] | null> {
  if (hasFriendsMigrated()) return null;
  const local = loadPvpFriends();
  if (local.length === 0) {
    markFriendsMigrated();
    return null;
  }

  const res = await fetch("/api/account/friends/migrate", {
    method: "POST",
    credentials: "include",
    headers: await accountApiHeaders(),
    body: JSON.stringify({
      entries: local.map((entry) => ({ userId: entry.userId, label: entry.label })),
    }),
  });

  if (!res.ok) return null;
  markFriendsMigrated();
  return parseFriendsResponse(res);
}

export function isAccountFriend(friends: AccountFriend[], friendUserId: string): boolean {
  return friends.some((friend) => friend.friendUserId === friendUserId);
}
