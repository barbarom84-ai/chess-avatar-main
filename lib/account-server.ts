import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { displayNameFromAuthUser } from "@/lib/pvp-display-name";
import type { AccountFriend, AccountProfile, AccountProfilePatch, AccountPreferences } from "@/lib/account-types";

export const MAX_ACCOUNT_BIO_LENGTH = 1000;
export const MAX_ACCOUNT_DISPLAY_NAME_LENGTH = 80;
export const MAX_FRIEND_LABEL_LENGTH = 80;

type AccountRow = {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  preferences: AccountPreferences | null;
  created_at: string;
  updated_at: string;
};

type FriendRow = {
  id: string;
  user_id: string;
  friend_user_id: string;
  label: string;
  created_at: string;
};

export type AccountUserSummary = {
  displayName: string;
  avatarUrl: string | null;
};

export function resolveAccountDisplayName(
  row: Pick<AccountRow, "display_name"> | null | undefined,
  authUser?: Pick<User, "email" | "user_metadata"> | null
): string {
  const custom = row?.display_name?.trim();
  if (custom) return custom.slice(0, MAX_ACCOUNT_DISPLAY_NAME_LENGTH);
  if (authUser) return displayNameFromAuthUser(authUser);
  return "Player";
}

/** Batch lookup display names and avatars for PvP lists and Ops. */
export async function fetchAccountSummariesByUserIds(
  sb: SupabaseClient,
  userIds: string[]
): Promise<Map<string, AccountUserSummary>> {
  const unique = [...new Set(userIds.filter((id) => id.length >= 8))];
  const map = new Map<string, AccountUserSummary>();
  if (unique.length === 0) return map;

  const { data, error } = await sb
    .from("user_accounts")
    .select("user_id, display_name, avatar_url")
    .in("user_id", unique);

  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as Array<{
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  }>) {
    map.set(row.user_id, {
      displayName: resolveAccountDisplayName(row, null),
      avatarUrl: row.avatar_url?.trim() ? row.avatar_url.trim() : null,
    });
  }
  return map;
}

function parseAccountPreferences(raw: unknown): AccountPreferences {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const prefs: AccountPreferences = {};
  if (o.botEngine === "auto" || o.botEngine === "chessavatar" || o.botEngine === "stockfish") {
    prefs.botEngine = o.botEngine;
  }
  return prefs;
}

function toProfile(
  row: AccountRow,
  memberSince: string | null,
  authUser?: Pick<User, "email" | "user_metadata"> | null,
  includeEmail = false
): AccountProfile {
  const profile: AccountProfile = {
    userId: row.user_id,
    displayName: resolveAccountDisplayName(row, authUser),
    bio: row.bio?.trim() ? row.bio.trim() : null,
    avatarUrl: row.avatar_url?.trim() ? row.avatar_url.trim() : null,
    memberSince,
    preferences: parseAccountPreferences(row.preferences),
  };
  if (includeEmail && authUser?.email) {
    profile.email = authUser.email;
  }
  return profile;
}

export async function getOrCreateAccountRow(
  sb: SupabaseClient,
  userId: string
): Promise<AccountRow> {
  const { data, error } = await sb
    .from("user_accounts")
    .select("user_id, display_name, bio, avatar_url, preferences, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data) return data as AccountRow;

  const { data: inserted, error: insertError } = await sb
    .from("user_accounts")
    .insert({ user_id: userId })
    .select("user_id, display_name, bio, avatar_url, preferences, created_at, updated_at")
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? "Failed to create account profile");
  }
  return inserted as AccountRow;
}

export async function fetchAccountRow(
  sb: SupabaseClient,
  userId: string
): Promise<AccountRow | null> {
  const { data, error } = await sb
    .from("user_accounts")
    .select("user_id, display_name, bio, avatar_url, preferences, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as AccountRow | null) ?? null;
}

export async function getMemberSince(
  serviceSb: SupabaseClient | null,
  userId: string
): Promise<string | null> {
  if (!serviceSb) return null;
  const { data, error } = await serviceSb.auth.admin.getUserById(userId);
  if (error || !data?.user) return null;
  return data.user.created_at ?? null;
}

export async function buildOwnAccountProfile(
  sb: SupabaseClient,
  serviceSb: SupabaseClient | null,
  user: User
): Promise<AccountProfile> {
  const row = await getOrCreateAccountRow(sb, user.id);
  const memberSince = (await getMemberSince(serviceSb, user.id)) ?? user.created_at ?? row.created_at;
  return toProfile(row, memberSince, user, true);
}

export async function buildPublicAccountProfile(
  sb: SupabaseClient,
  serviceSb: SupabaseClient | null,
  userId: string
): Promise<AccountProfile | null> {
  const row = await fetchAccountRow(sb, userId);
  const memberSince = await getMemberSince(serviceSb, userId);
  if (!row) {
    if (!memberSince) return null;
    return {
      userId,
      displayName: "Player",
      bio: null,
      avatarUrl: null,
      memberSince,
    };
  }
  return toProfile(row, memberSince ?? row.created_at, null, false);
}

export function normalizeProfilePatch(body: unknown): AccountProfilePatch {
  if (!body || typeof body !== "object") return {};
  const o = body as Record<string, unknown>;
  const patch: AccountProfilePatch = {};

  if (typeof o.displayName === "string") {
    patch.displayName = o.displayName.trim().slice(0, MAX_ACCOUNT_DISPLAY_NAME_LENGTH);
  }
  if (o.bio === null || typeof o.bio === "string") {
    const bio = typeof o.bio === "string" ? o.bio.trim() : null;
    patch.bio = bio ? bio.slice(0, MAX_ACCOUNT_BIO_LENGTH) : null;
  }
  if (o.avatarUrl === null || typeof o.avatarUrl === "string") {
    const url = typeof o.avatarUrl === "string" ? o.avatarUrl.trim() : null;
    patch.avatarUrl = url || null;
  }
  if (o.preferences && typeof o.preferences === "object") {
    const prefs = parseAccountPreferences(o.preferences);
    if (prefs.botEngine) {
      patch.preferences = { botEngine: prefs.botEngine };
    }
  }
  return patch;
}

export async function applyAccountProfilePatch(
  sb: SupabaseClient,
  user: User,
  patch: AccountProfilePatch
): Promise<AccountProfile> {
  await getOrCreateAccountRow(sb, user.id);

  const updates: Record<string, string | null | AccountPreferences> = {};
  if (patch.displayName !== undefined) {
    updates.display_name = patch.displayName || null;
  }
  if (patch.bio !== undefined) {
    updates.bio = patch.bio;
  }
  if (patch.avatarUrl !== undefined) {
    updates.avatar_url = patch.avatarUrl;
  }
  if (patch.preferences?.botEngine) {
    const { data: existing, error: readError } = await sb
      .from("user_accounts")
      .select("preferences")
      .eq("user_id", user.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    const merged = {
      ...(parseAccountPreferences((existing as { preferences?: unknown } | null)?.preferences)),
      botEngine: patch.preferences.botEngine,
    };
    updates.preferences = merged;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await sb.from("user_accounts").update(updates).eq("user_id", user.id);
    if (error) throw new Error(error.message);
  }

  return buildOwnAccountProfile(sb, null, user);
}

export async function listAccountFriends(
  sb: SupabaseClient,
  userId: string
): Promise<AccountFriend[]> {
  const { data, error } = await sb
    .from("user_friends")
    .select("id, user_id, friend_user_id, label, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as FriendRow[];
  if (rows.length === 0) return [];

  const friendIds = rows.map((row) => row.friend_user_id);
  const { data: accountRows, error: accountError } = await sb
    .from("user_accounts")
    .select("user_id, display_name, avatar_url")
    .in("user_id", friendIds);

  if (accountError) throw new Error(accountError.message);

  const accountById = new Map(
    ((accountRows ?? []) as Array<{
      user_id: string;
      display_name: string | null;
      avatar_url: string | null;
    }>).map((row) => [row.user_id, row])
  );

  return rows.map((row) => {
    const account = accountById.get(row.friend_user_id);
    return {
      friendUserId: row.friend_user_id,
      label: row.label,
      addedAt: row.created_at,
      displayName: resolveAccountDisplayName(account ?? null, null),
      avatarUrl: account?.avatar_url?.trim() ? account.avatar_url.trim() : null,
    };
  });
}

export async function addAccountFriend(
  sb: SupabaseClient,
  userId: string,
  friendUserId: string,
  label: string
): Promise<void> {
  if (userId === friendUserId) {
    throw new Error("Cannot add yourself as a friend");
  }

  const { error } = await sb.from("user_friends").upsert(
    {
      user_id: userId,
      friend_user_id: friendUserId,
      label: label.slice(0, MAX_FRIEND_LABEL_LENGTH) || "Friend",
    },
    { onConflict: "user_id,friend_user_id" }
  );

  if (error) throw new Error(error.message);
}

export async function removeAccountFriend(
  sb: SupabaseClient,
  userId: string,
  friendUserId: string
): Promise<void> {
  const { error } = await sb
    .from("user_friends")
    .delete()
    .eq("user_id", userId)
    .eq("friend_user_id", friendUserId);

  if (error) throw new Error(error.message);
}

export async function migrateAccountFriends(
  sb: SupabaseClient,
  userId: string,
  entries: Array<{ userId: string; label: string }>
): Promise<number> {
  let imported = 0;
  for (const entry of entries) {
    if (!entry.userId || entry.userId === userId || entry.userId.length < 8) continue;
    await addAccountFriend(sb, userId, entry.userId, entry.label || "Friend");
    imported += 1;
  }
  return imported;
}
