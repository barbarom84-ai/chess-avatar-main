import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { accountApiHeaders, readAccountApiError } from "@/lib/account-api-auth";
import type { AccountProfile, AccountProfilePatch } from "@/lib/account-types";
import {
  avatarExtensionForUpload,
  croppedAvatarFile,
  isAllowedAvatarMimeOrExtension,
  MAX_AVATAR_OUTPUT_BYTES,
  type AvatarFileErrorCode,
} from "@/lib/avatar-upload";

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

export type AvatarUploadResult =
  | { url: string; error: null; code: null }
  | { url: null; error: string | null; code: AvatarFileErrorCode };

function avatarContentType(file: File): string {
  const ext = avatarExtensionForUpload(file);
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

export async function uploadAccountAvatar(
  userId: string,
  file: File
): Promise<AvatarUploadResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { url: null, error: null, code: "storage_not_configured" };
  }
  if (!file.size) {
    return { url: null, error: null, code: "empty_file" };
  }
  if (file.size > MAX_AVATAR_OUTPUT_BYTES) {
    return { url: null, error: null, code: "output_too_large" };
  }
  if (!isAllowedAvatarMimeOrExtension(file)) {
    return { url: null, error: null, code: "unsupported_type" };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { url: null, error: null, code: "not_signed_in" };
  }

  const path = `${userId}/avatar.${avatarExtensionForUpload(file)}`;
  const contentType = avatarContentType(file);
  const { error } = await supabase.storage.from("account-avatars").upload(path, file, {
    upsert: true,
    contentType,
    cacheControl: "3600",
  });
  if (error) {
    return { url: null, error: error.message, code: "storage_upload_failed" };
  }

  const { data } = supabase.storage.from("account-avatars").getPublicUrl(path);
  const baseUrl = data.publicUrl ?? null;
  if (!baseUrl) {
    return { url: null, error: "Missing public URL", code: "storage_upload_failed" };
  }
  return { url: `${baseUrl}?v=${Date.now()}`, error: null, code: null };
}

/** Build a JPEG File from a cropped blob for upload. */
export function fileFromCroppedAvatarBlob(userId: string, blob: Blob): File {
  return croppedAvatarFile(blob, userId);
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
