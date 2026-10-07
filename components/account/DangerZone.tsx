"use client";

import { useState } from "react";
import { Loader2, LogOut, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AccountCopy } from "./types";

type DangerZoneProps = {
  copy: AccountCopy;
  onSignOut: () => Promise<void>;
  onDelete: () => Promise<boolean>;
};

export function DangerZone({ copy, onSignOut, onDelete }: DangerZoneProps) {
  const [signingOut, setSigningOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      if (await onDelete()) setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="account-card border-rose-500/25">
      <h3 className="account-card-title">
        <ShieldAlert aria-hidden className="!text-rose-300" />
        {copy.settings.dangerTitle}
      </h3>
      <p className="text-sm text-slate-400 mb-3">{copy.settings.dangerDesc}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 border-slate-600 text-slate-200"
          onClick={() => void signOut()}
          disabled={signingOut}
        >
          {signingOut ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
          {copy.signOutCta}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 border-rose-500/40 text-rose-300 hover:bg-rose-950/40"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {copy.deleteAccount}
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-200">{copy.deleteAccountTitle}</DialogTitle>
            <DialogDescription className="text-slate-400">{copy.deleteAccountBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              {copy.deleteAccountCancel}
            </Button>
            <Button
              type="button"
              className="min-h-11 bg-rose-700 hover:bg-rose-600 text-white"
              onClick={() => void confirmDelete()}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {copy.deleteAccountConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
