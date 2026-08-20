"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { accountApiHeaders, readAccountApiError } from "@/lib/account-api-auth";
import {
  type DbCampaignTrack,
  normalizeTrackSlug,
  trackLabel,
} from "@/lib/ascension/campaign-tracks";

interface AdminTrackManagerProps {
  tracks: DbCampaignTrack[];
  lang: "fr" | "en";
  onTracksChange: () => Promise<void>;
  t: {
    adminTracksTitle: string;
    adminTracksAdd: string;
    adminTracksSlug: string;
    adminTracksLabelFr: string;
    adminTracksLabelEn: string;
    adminTracksSave: string;
    adminTracksDelete: string;
    adminTracksDeleteConfirm: string;
    adminTracksSaved: string;
    adminTracksDeleted: string;
    adminTracksSystem: string;
    adminTracksDeleteBlocked: string;
  };
}

export default function AdminTrackManager({
  tracks,
  lang,
  onTracksChange,
  t,
}: AdminTrackManagerProps) {
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editLabelFr, setEditLabelFr] = useState("");
  const [editLabelEn, setEditLabelEn] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newLabelFr, setNewLabelFr] = useState("");
  const [newLabelEn, setNewLabelEn] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const startEdit = (track: DbCampaignTrack) => {
    setEditingSlug(track.slug);
    setEditLabelFr(track.label.fr);
    setEditLabelEn(track.label.en);
  };

  const saveTrack = async (
    slug: string,
    labelFr: string,
    labelEn: string,
    originalSlug?: string
  ) => {
    setBusy(slug);
    try {
      const res = await fetch("/api/ascension/admin/tracks", {
        method: "POST",
        headers: await accountApiHeaders(),
        body: JSON.stringify({
          slug,
          original_slug: originalSlug ?? slug,
          label_fr: labelFr.trim() || slug,
          label_en: labelEn.trim() || slug,
          sort_order: tracks.find((tr) => tr.slug === (originalSlug ?? slug))?.sort_order ?? tracks.length,
          layout:
            tracks.find((tr) => tr.slug === (originalSlug ?? slug))?.layout ?? "sequential",
          unlock_rule:
            tracks.find((tr) => tr.slug === (originalSlug ?? slug))?.unlock_rule ?? {
              type: "always",
            },
        }),
      });
      if (!res.ok) throw new Error(await readAccountApiError(res, "Save failed"));
      toast.success(t.adminTracksSaved);
      setEditingSlug(null);
      setShowAdd(false);
      setNewSlug("");
      setNewLabelFr("");
      setNewLabelEn("");
      await onTracksChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(null);
    }
  };

  const addTrack = async () => {
    const slug = normalizeTrackSlug(newSlug);
    if (!slug) {
      toast.error(t.adminTracksSlug);
      return;
    }
    if (tracks.some((tr) => tr.slug === slug)) {
      toast.error(`Track "${slug}" already exists`);
      return;
    }
    setBusy("new");
    try {
      const res = await fetch("/api/ascension/admin/tracks", {
        method: "POST",
        headers: await accountApiHeaders(),
        body: JSON.stringify({
          slug,
          label_fr: newLabelFr.trim() || slug,
          label_en: newLabelEn.trim() || slug,
          sort_order: tracks.length,
          layout: "sequential",
          unlock_rule: { type: "always" },
        }),
      });
      if (!res.ok) throw new Error(await readAccountApiError(res, "Add failed"));
      toast.success(t.adminTracksSaved);
      setShowAdd(false);
      setNewSlug("");
      setNewLabelFr("");
      setNewLabelEn("");
      await onTracksChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(null);
    }
  };

  const deleteTrack = async (track: DbCampaignTrack) => {
    if (track.is_system) {
      toast.error(t.adminTracksDeleteBlocked);
      return;
    }
    const name = trackLabel(track, lang);
    if (!window.confirm(t.adminTracksDeleteConfirm.replace("{name}", name))) return;
    setBusy(track.slug);
    try {
      const res = await fetch(
        `/api/ascension/admin/tracks?slug=${encodeURIComponent(track.slug)}`,
        { method: "DELETE", headers: await accountApiHeaders(false) }
      );
      if (!res.ok) throw new Error(await readAccountApiError(res, "Delete failed"));
      toast.success(t.adminTracksDeleted);
      await onTracksChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-300">{t.adminTracksTitle}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => setShowAdd((v) => !v)}
        >
          <Plus className="h-3 w-3" />
          {t.adminTracksAdd}
        </Button>
      </div>

      <ul className="space-y-2">
        {tracks.map((track) => (
          <li
            key={track.slug}
            className="flex flex-wrap items-center gap-2 rounded-md border border-slate-800/80 bg-slate-900/40 px-2 py-1.5"
          >
            {editingSlug === track.slug ? (
              <>
                <div className="flex-1 grid gap-2 sm:grid-cols-2 min-w-[200px]">
                  <Input
                    className="h-7 text-xs"
                    value={editLabelFr}
                    onChange={(e) => setEditLabelFr(e.target.value)}
                    placeholder={t.adminTracksLabelFr}
                  />
                  <Input
                    className="h-7 text-xs"
                    value={editLabelEn}
                    onChange={(e) => setEditLabelEn(e.target.value)}
                    placeholder={t.adminTracksLabelEn}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={busy === track.slug}
                  onClick={() => void saveTrack(track.slug, editLabelFr, editLabelEn, track.slug)}
                >
                  {busy === track.slug ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    t.adminTracksSave
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setEditingSlug(null)}
                >
                  ✕
                </Button>
              </>
            ) : (
              <>
                <span className="text-xs text-slate-200 flex-1">
                  {trackLabel(track, lang)}
                  <span className="text-slate-500 ml-1">({track.slug})</span>
                  {track.is_system && (
                    <span className="text-[10px] text-amber-400/80 ml-1">{t.adminTracksSystem}</span>
                  )}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => startEdit(track)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                {!track.is_system && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300"
                    disabled={busy === track.slug}
                    onClick={() => void deleteTrack(track)}
                  >
                    {busy === track.slug ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      {showAdd && (
        <div className="grid gap-2 sm:grid-cols-2 border-t border-slate-800 pt-3">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">{t.adminTracksSlug}</Label>
            <Input
              className="h-8 text-xs"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="ma-piste"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t.adminTracksLabelFr}</Label>
            <Input
              className="h-8 text-xs"
              value={newLabelFr}
              onChange={(e) => setNewLabelFr(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t.adminTracksLabelEn}</Label>
            <Input
              className="h-8 text-xs"
              value={newLabelEn}
              onChange={(e) => setNewLabelEn(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              disabled={busy === "new"}
              onClick={() => void addTrack()}
            >
              {busy === "new" ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Plus className="h-3 w-3 mr-1" />
              )}
              {t.adminTracksAdd}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
