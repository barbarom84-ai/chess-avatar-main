"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/language-context";
import { isPlaceholderPlayerName } from "@/lib/pgn-import";

export interface SaveGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  whiteName: string;
  blackName: string;
  defaultSide?: "white" | "black" | null;
  busy?: boolean;
  onSaveAs: (side: "white" | "black") => void;
  onSaveArchive: () => void;
}

export default function SaveGameDialog({
  open,
  onOpenChange,
  whiteName,
  blackName,
  defaultSide = null,
  busy = false,
  onSaveAs,
  onSaveArchive,
}: SaveGameDialogProps) {
  const { t } = useLanguage();
  const sd = t.review.saveDialog;

  const whiteLabel = isPlaceholderPlayerName(whiteName)
    ? sd.playWhite
    : `${sd.playWhite} — ${whiteName}`;
  const blackLabel = isPlaceholderPlayerName(blackName)
    ? sd.playBlack
    : `${sd.playBlack} — ${blackName}`;

  const matchup =
    !isPlaceholderPlayerName(whiteName) && !isPlaceholderPlayerName(blackName)
      ? `${whiteName} vs ${blackName}`
      : sd.matchupFallback;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cyan-300">{sd.title}</DialogTitle>
          <DialogDescription className="text-slate-400">{sd.body}</DialogDescription>
        </DialogHeader>

        <p className="text-sm font-medium text-slate-200 text-center py-1">{matchup}</p>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            disabled={busy}
            className="w-full bg-cyan-700 hover:bg-cyan-600 text-white justify-start"
            onClick={() => onSaveAs("white")}
          >
            {busy && defaultSide === "white" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {whiteLabel}
          </Button>
          <Button
            type="button"
            disabled={busy}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white justify-start border border-slate-600"
            onClick={() => onSaveAs("black")}
          >
            {busy && defaultSide === "black" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {blackLabel}
          </Button>
        </div>

        <DialogFooter className="flex flex-col sm:flex-col gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            className="w-full text-slate-400 hover:text-slate-200"
            onClick={onSaveArchive}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {sd.skipArchive}
          </Button>
          <p className="text-[11px] text-slate-500 text-center w-full">{sd.skipArchiveHint}</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
