"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FolderPlus, Star, Trash2, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import type { AvatarOrganization } from "@/hooks/useAvatarOrganization";

export default function ProfileCollectionsPanel({
  organization,
}: {
  organization: AvatarOrganization;
}) {
  const { t } = useLanguage();
  const [newName, setNewName] = useState("");
  const {
    collections,
    favorites,
    itemsByCollection,
    filter,
    setFilter,
    loading,
    handleCreateCollection,
    handleDeleteCollection,
  } = organization;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const col = await handleCreateCollection(newName.trim());
    if (col) {
      setNewName("");
      toast.success(t.collections.created);
    } else {
      toast.error(t.collections.createError);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await handleDeleteCollection(id);
    if (ok) toast.success(t.collections.deleted);
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
        <p className="text-sm text-slate-400 font-normal leading-relaxed">
          {t.collections.hint}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={
              filter === "all"
                ? "border-cyan-500 bg-cyan-500/20 text-cyan-100"
                : "border-slate-700 text-slate-300"
            }
            onClick={() => setFilter("all")}
          >
            {t.collections.filterAll}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={
              filter === "favorites"
                ? "border-yellow-500 bg-yellow-500/20 text-yellow-100"
                : "border-slate-700 text-slate-300"
            }
            onClick={() => setFilter("favorites")}
          >
            <Star className="h-3.5 w-3.5 mr-1 text-yellow-400" />
            {t.collections.filterFavorites} ({favorites.size})
          </Button>
        </div>

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
            {collections.map((col) => {
              const count = itemsByCollection[col.id]?.length ?? col.item_count ?? 0;
              const active = filter === col.id;
              return (
                <li
                  key={col.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    active
                      ? "bg-cyan-950/40 border-cyan-500/50"
                      : "bg-slate-950 border-slate-800"
                  }`}
                >
                  <button
                    type="button"
                    className="text-left min-w-0 flex-1"
                    onClick={() => setFilter(active ? "all" : col.id)}
                  >
                    <span className="font-medium text-slate-200">{col.name}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {count} {t.collections.profiles}
                    </Badge>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => void handleDelete(col.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
