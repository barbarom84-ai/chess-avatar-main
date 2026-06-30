"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FolderPlus, Star, Trash2, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import {
  getUserCollections,
  createCollection,
  deleteCollection,
  getUserFavorites,
  type ProfileCollection,
} from "@/lib/profile-collections";
import { toast } from "sonner";

export default function ProfileCollectionsPanel() {
  const { t } = useLanguage();
  const [collections, setCollections] = useState<ProfileCollection[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [cols, favs] = await Promise.all([
      getUserCollections(),
      getUserFavorites(),
    ]);
    setCollections(cols);
    setFavorites(favs);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const col = await createCollection(newName.trim());
    if (col) {
      setCollections((prev) => [col, ...prev]);
      setNewName("");
      toast.success(t.collections.created);
    } else {
      toast.error(t.collections.createError);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteCollection(id);
    if (ok) {
      setCollections((prev) => prev.filter((c) => c.id !== id));
      toast.success(t.collections.deleted);
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/80 border-slate-800">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/80 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FolderPlus className="h-5 w-5 text-cyan-400" />
          {t.collections.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t.collections.newPlaceholder}
            className="bg-slate-950 border-slate-700"
            onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
          />
          <Button onClick={() => void handleCreate()} disabled={!newName.trim()}>
            {t.collections.create}
          </Button>
        </div>

        {collections.length === 0 ? (
          <p className="text-sm text-slate-500">{t.collections.empty}</p>
        ) : (
          <ul className="space-y-2">
            {collections.map((col) => (
              <li
                key={col.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800"
              >
                <div>
                  <span className="font-medium text-slate-200">{col.name}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {col.item_count ?? 0} {t.collections.profiles}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => void handleDelete(col.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Star className="h-4 w-4 text-yellow-400" />
            {t.collections.favoritesCount.replace("{count}", String(favorites.length))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
