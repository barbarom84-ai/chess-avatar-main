import type { User } from "@supabase/supabase-js";

/** Libellé affichable pour un compte Auth (email / metadata), sans données sensibles complètes. */
export function displayNameFromAuthUser(user: Pick<User, "email" | "user_metadata">): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const full =
    typeof meta?.full_name === "string"
      ? meta.full_name.trim()
      : typeof meta?.name === "string"
        ? (meta.name as string).trim()
        : typeof meta?.preferred_username === "string"
          ? (meta.preferred_username as string).trim()
          : "";
  if (full) return full.slice(0, 80);
  const email = user.email?.trim() ?? "";
  const local = email.split("@")[0];
  if (local) return local.slice(0, 80);
  return "Player";
}
