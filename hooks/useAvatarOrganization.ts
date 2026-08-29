"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addProfileToCollection,
  createCollection,
  deleteCollection,
  getUserCollectionItemIds,
  getUserCollections,
  getUserFavorites,
  removeProfileFromCollection,
  toggleFavorite,
  type ProfileCollection,
} from "@/lib/profile-collections";

export type AvatarOrgFilter = "all" | "favorites" | string;

export function useAvatarOrganization() {
  const [collections, setCollections] = useState<ProfileCollection[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [itemsByCollection, setItemsByCollection] = useState<Record<string, string[]>>({});
  const [filter, setFilter] = useState<AvatarOrgFilter>("all");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [cols, favs, items] = await Promise.all([
      getUserCollections(),
      getUserFavorites(),
      getUserCollectionItemIds(),
    ]);
    setCollections(cols);
    setFavorites(new Set(favs));
    setItemsByCollection(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleToggleFavorite = useCallback(async (profileId: string) => {
    const ok = await toggleFavorite(profileId);
    if (!ok) return false;
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
    return true;
  }, []);

  const handleCreateCollection = useCallback(async (name: string) => {
    const col = await createCollection(name);
    if (col) {
      setCollections((prev) => [col, ...prev]);
      setFilter(col.id);
    }
    return col;
  }, []);

  const handleDeleteCollection = useCallback(async (id: string) => {
    const ok = await deleteCollection(id);
    if (!ok) return false;
    setCollections((prev) => prev.filter((c) => c.id !== id));
    setItemsByCollection((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setFilter((f) => (f === id ? "all" : f));
    return true;
  }, []);

  const handleAddToCollection = useCallback(
    async (collectionId: string, profileId: string) => {
      const ok = await addProfileToCollection(collectionId, profileId);
      if (!ok) return false;
      setItemsByCollection((prev) => ({
        ...prev,
        [collectionId]: [...new Set([...(prev[collectionId] ?? []), profileId])],
      }));
      return true;
    },
    []
  );

  const handleRemoveFromCollection = useCallback(
    async (collectionId: string, profileId: string) => {
      const ok = await removeProfileFromCollection(collectionId, profileId);
      if (!ok) return false;
      setItemsByCollection((prev) => ({
        ...prev,
        [collectionId]: (prev[collectionId] ?? []).filter((id) => id !== profileId),
      }));
      return true;
    },
    []
  );

  return {
    collections,
    favorites,
    itemsByCollection,
    filter,
    setFilter,
    loading,
    reload,
    handleToggleFavorite,
    handleCreateCollection,
    handleDeleteCollection,
    handleAddToCollection,
    handleRemoveFromCollection,
  };
}

export type AvatarOrganization = ReturnType<typeof useAvatarOrganization>;
