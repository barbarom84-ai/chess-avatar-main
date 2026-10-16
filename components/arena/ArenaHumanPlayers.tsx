"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Pencil,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addArenaHuman,
  ARENA_HUMAN_DEFAULT_ELO,
  ARENA_HUMAN_NAME_MAX,
  ARENA_HUMANS_MAX,
  exportArenaHumansJson,
  importArenaHumansJson,
  removeArenaHuman,
  updateArenaHuman,
  type ArenaHumanProfile,
} from "@/lib/arena-humans";
import { useLanguage } from "@/lib/language-context";

export default function ArenaHumanPlayers({
  humans,
  locked,
  defaultOpen,
}: {
  humans: ArenaHumanProfile[];
  /** A game is running: the roster cannot change under it. */
  locked: boolean;
  defaultOpen: boolean;
}) {
  const ap = useLanguage().t.arenaPage;
  const [open, setOpen] = useState(defaultOpen);
  const [name, setName] = useState("");
  const [elo, setElo] = useState(String(ARENA_HUMAN_DEFAULT_ELO));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editElo, setEditElo] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const full = humans.length >= ARENA_HUMANS_MAX;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (locked || full) return;
    const res = addArenaHuman(name, Number(elo));
    if (typeof res === "string") {
      toast.error(
        res === "duplicate"
          ? ap.humanNameDuplicate
          : res === "tooLong"
            ? ap.humanNameTooLong.replace("{n}", String(ARENA_HUMAN_NAME_MAX))
            : ap.humanNameEmpty
      );
      return;
    }
    toast.success(ap.humanAdded.replace("{name}", res.name));
    setName("");
  };

  const remove = (h: ArenaHumanProfile) => {
    if (locked) return;
    if (!window.confirm(ap.humanRemoveConfirm.replace("{name}", h.name))) return;
    removeArenaHuman(h.id);
    if (editingId === h.id) setEditingId(null);
  };

  const startEdit = (h: ArenaHumanProfile) => {
    setEditingId(h.id);
    setEditName(h.name);
    setEditElo(String(h.elo));
  };

  const saveEdit = (id: string) => {
    const res = updateArenaHuman(id, { name: editName, elo: Number(editElo) });
    if (res == null) return;
    if (typeof res === "string") {
      toast.error(
        res === "duplicate"
          ? ap.humanNameDuplicate
          : res === "tooLong"
            ? ap.humanNameTooLong.replace("{n}", String(ARENA_HUMAN_NAME_MAX))
            : ap.humanNameEmpty
      );
      return;
    }
    toast.success(ap.humanUpdated.replace("{name}", res.name));
    setEditingId(null);
  };

  const exportRoster = () => {
    const blob = new Blob([exportArenaHumansJson(humans)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "arena-humans.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(ap.humanExportDone);
  };

  const onImportFile = async (file: File | null) => {
    if (!file || locked) return;
    try {
      const text = await file.text();
      const res = importArenaHumansJson(text);
      if (res.error) {
        toast.error(ap.humanImportError);
        return;
      }
      toast.success(
        ap.humanImportDone.replace("{n}", String(res.added)).replace("{skip}", String(res.skipped))
      );
    } catch {
      toast.error(ap.humanImportError);
    }
  };

  return (
    <section className="arena-panel" data-testid="arena-humans">
      <button
        type="button"
        className="arena-collapsible-trigger"
        aria-expanded={open}
        aria-controls="arena-humans-body"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-400" aria-hidden />
          {ap.humansTitle}
          <span className="arena-count-pill">{humans.length}</span>
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div id="arena-humans-body" className="space-y-3 border-t border-slate-800 px-3 pb-3 pt-2">
          <p className="text-[11px] leading-snug text-slate-500">{ap.humansHint}</p>
          <p className="text-[11px] leading-snug text-slate-500">{ap.humanSeedEloHint}</p>
          <form className="arena-human-form" onSubmit={submit}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ap.humanNamePlaceholder}
              aria-label={ap.humanNamePlaceholder}
              maxLength={ARENA_HUMAN_NAME_MAX}
              disabled={locked || full}
              className="h-8 bg-slate-950 border-slate-700 text-sm"
              data-testid="arena-human-name"
            />
            <Input
              type="number"
              inputMode="numeric"
              min={100}
              max={3000}
              step={50}
              value={elo}
              onChange={(e) => setElo(e.target.value)}
              aria-label={ap.humanEloLabel}
              title={ap.humanEloLabel}
              disabled={locked || full}
              className="h-8 w-20 bg-slate-950 border-slate-700 text-sm font-mono"
              data-testid="arena-human-elo"
            />
            <Button
              type="submit"
              size="sm"
              className="h-8 bg-emerald-700 hover:bg-emerald-600"
              disabled={locked || full || !name.trim()}
              data-testid="arena-human-add"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              {ap.humanAdd}
            </Button>
          </form>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="arena-icon-btn"
              onClick={exportRoster}
              disabled={humans.length === 0}
              data-testid="arena-human-export"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{ap.humanExport}</span>
            </button>
            <button
              type="button"
              className="arena-icon-btn"
              onClick={() => fileRef.current?.click()}
              disabled={locked || full}
              data-testid="arena-human-import"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{ap.humanImport}</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                void onImportFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </div>
          {humans.length === 0 ? (
            <p className="text-xs text-slate-500">{ap.humansEmpty}</p>
          ) : (
            <ul className="arena-human-list" data-testid="arena-human-list">
              {humans.map((h) => (
                <li key={h.id} className="arena-human-row">
                  <span className="arena-human-dot" aria-hidden>
                    {h.name.slice(0, 1).toUpperCase()}
                  </span>
                  {editingId === h.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={ARENA_HUMAN_NAME_MAX}
                        className="h-7 min-w-0 flex-1 bg-slate-950 border-slate-700 text-sm"
                        data-testid="arena-human-edit-name"
                      />
                      <Input
                        type="number"
                        value={editElo}
                        onChange={(e) => setEditElo(e.target.value)}
                        min={100}
                        max={3000}
                        step={50}
                        className="h-7 w-16 bg-slate-950 border-slate-700 text-sm font-mono"
                        data-testid="arena-human-edit-elo"
                      />
                      <button
                        type="button"
                        className="arena-icon-btn"
                        onClick={() => saveEdit(h.id)}
                        aria-label={ap.humanSave}
                        data-testid="arena-human-save"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="arena-icon-btn"
                        onClick={() => setEditingId(null)}
                        aria-label={ap.humanCancelEdit}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{h.name}</span>
                      <span className="font-mono text-xs text-cyan-400/90">{h.elo}</span>
                      <button
                        type="button"
                        className="arena-icon-btn"
                        onClick={() => startEdit(h)}
                        disabled={locked}
                        aria-label={ap.humanEdit.replace("{name}", h.name)}
                        data-testid="arena-human-edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="arena-icon-btn"
                        onClick={() => remove(h)}
                        disabled={locked}
                        aria-label={ap.humanRemove.replace("{name}", h.name)}
                        title={ap.humanRemove.replace("{name}", h.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
