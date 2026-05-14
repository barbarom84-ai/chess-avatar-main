import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { accountApiHeaders, readAccountApiError } from "@/lib/account-api-auth";
import type { AccountProfile, AccountProfilePatch } from "@/lib/account-types";

const MIGRATION_FLAG = "chess-avatar.account.friends.migrated.v1";

async function parseJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchOwnAccountProfile(): Promise<AccountProfile | null> {
  const res = await fetch("/api/account/profile", {
    cache: "no-store",
    credentials: "include",
    headers: await accountApiHeaders(false),
  });
  if (!res.ok) return null;
  const data = await parseJson<{ profile?: AccountProfile }>(res);
  return data?.profile ?? null;
}

export async function fetchPublicAccountProfile(userId: string): Promise<AccountProfile | null> {
  const res = await fetch(`/api/account/profile/${encodeURIComponent(userId)}`, {
    cache: "no-store",
    credentials: "include",
    headers: await accountApiHeaders(false),
  });
  if (!res.ok) return null;
  const data = await parseJson<{ profile?: AccountProfile }>(res);
  return data?.profile ?? null;
}

export async function patchAccountProfile(
  patch: AccountProfilePatch
): Promise<{ profile: AccountProfile | null; error: string | null }> {
  const res = await fetch("/api/account/profile", {
    method: "PATCH",
    credentials: "include",
    headers: await accountApiHeaders(),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    return {
      profile: null,
      error: await readAccountApiError(res, "Profile update failed"),
    };
  }
  const data = await parseJson<{ profile?: AccountProfile }>(res);
  return { profile: data?.profile ?? null, error: null };
}

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function avatarExtension(file: File): string {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".webp")) return "webp";
  if (lower.endsWith(".gif")) return "gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";
  switch (file.type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

function avatarContentType(file: File): string {
  if (file.type && ALLOWED_AVATAR_TYPES.has(file.type)) return file.type;
  const ext = avatarExtension(file);
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

function isAllowedAvatarFile(file: File): boolean {
  if (file.size > MAX_AVATAR_BYTES) return false;
  if (file.type && ALLOWED_AVATAR_TYPES.has(file.type)) return true;
  const lower = file.name.toLowerCase();
  return /\.(jpe?g|png|webp|gif)$/i.test(lower);
}

export async function uploadAccountAvatar(
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { url: null, error: "Supabase not configured" };
  }
  if (!isAllowedAvatarFile(file)) {
    return { url: null, error: "Invalid avatar file" };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { url: null, error: "Not signed in" };
  }

  const path = `${userId}/avatar.${avatarExtension(file)}`;
  const contentType = avatarContentType(file);
  const { error } = await supabase.storage.from("account-avatars").upload(path, file, {
    upsert: true,
    contentType,
    cacheControl: "3600",
  });
  if (error) {
    return { url: null, error: error.message };
  }

  const { data } = supabase.storage.from("account-avatars").getPublicUrl(path);
  const baseUrl = data.publicUrl ?? null;
  if (!baseUrl) return { url: null, error: "Missing public URL" };
  return { url: `${baseUrl}?v=${Date.now()}`, error: null };
}

export function accountProfileInitials(displayName: string): string {
  const parts = displayName.replace(/[^a-zA-ZÀ-ÿ0-9]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  if (displayName.length >= 2) return displayName.slice(0, 2).toUpperCase();
  return (displayName[0] ?? "?").toUpperCase();
}

export function markFriendsMigrated() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MIGRATION_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function hasFriendsMigrated(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(MIGRATION_FLAG) === "1";
  } catch {
    return true;
  }
}
