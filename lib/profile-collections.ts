/**
 * Client-side helpers for profile collections, favorites, and tags.
 */

import { supabase, isSupabaseConfigured, type DbProfile } from "./supabase";

export interface ProfileCollection {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export interface ProfileFavorite {
  id: string;
  user_id: string;
  profile_id: string;
  created_at: string;
}

export async function getUserCollections(): Promise<ProfileCollection[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("profile_collections")
    .select("*, profile_collection_items(count)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    ...row,
    item_count: (row as { profile_collection_items?: { count: number }[] })
      .profile_collection_items?.[0]?.count ?? 0,
  })) as ProfileCollection[];
}

export async function createCollection(name: string, description = ""): Promise<ProfileCollection | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profile_collections")
    .insert({ user_id: user.id, name, description })
    .select()
    .single();

  return error ? null : (data as ProfileCollection);
}

export async function deleteCollection(collectionId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { error } = await supabase
    .from("profile_collections")
    .delete()
    .eq("id", collectionId);
  return !error;
}

export async function addProfileToCollection(
  collectionId: string,
  profileId: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { error } = await supabase
    .from("profile_collection_items")
    .upsert({ collection_id: collectionId, profile_id: profileId }, { onConflict: "collection_id,profile_id" });
  return !error;
}

export async function removeProfileFromCollection(
  collectionId: string,
  profileId: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { error } = await supabase
    .from("profile_collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("profile_id", profileId);
  return !error;
}

export async function getUserCollectionItemIds(): Promise<Record<string, string[]>> {
  if (!isSupabaseConfigured || !supabase) return {};
  const { data, error } = await supabase
    .from("profile_collection_items")
    .select("collection_id, profile_id");

  if (error || !data) return {};
  const map: Record<string, string[]> = {};
  for (const row of data) {
    const cid = row.collection_id as string;
    const pid = row.profile_id as string;
    (map[cid] ??= []).push(pid);
  }
  return map;
}

export async function getCollectionProfiles(collectionId: string): Promise<DbProfile[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("profile_collection_items")
    .select("profile_id, profiles(*)")
    .eq("collection_id", collectionId)
    .order("sort_order");

  if (error || !data) return [];
  return data
    .map((row) => {
      const profiles = (row as { profiles: DbProfile | DbProfile[] | null }).profiles;
      return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
    })
    .filter((p): p is DbProfile => p != null);
}

export async function getUserFavorites(): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("profile_favorites")
    .select("profile_id")
    .eq("user_id", user.id);

  if (error || !data) return [];
  return data.map((r) => r.profile_id);
}

export async function toggleFavorite(profileId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: existing } = await supabase
    .from("profile_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("profile_favorites")
      .delete()
      .eq("id", existing.id);
    return !error;
  }

  const { error } = await supabase
    .from("profile_favorites")
    .insert({ user_id: user.id, profile_id: profileId });
  return !error;
}

export async function updateProfileTags(profileId: string, tags: string[]): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("profile_metadata")
    .upsert(
      { profile_id: profileId, user_id: user.id, tags },
      { onConflict: "profile_id" }
    );
  return !error;
}
