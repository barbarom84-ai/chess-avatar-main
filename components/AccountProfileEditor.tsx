"use client";

import { useEffect, useRef, useState } from "react";
import AccountAvatar from "@/components/AccountAvatar";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/language-context";
import type { AccountProfile } from "@/lib/account-types";
import AccountAvatarCropDialog from "@/components/AccountAvatarCropDialog";
import {
  accountProfileInitials,
  fileFromCroppedAvatarBlob,
  patchAccountProfile,
  uploadAccountAvatar,
} from "@/lib/account-profile";
import {
  validateAvatarSourceDecodable,
  validateAvatarSourceFile,
  type AvatarFileErrorCode,
  type AvatarValidationFailure,
} from "@/lib/avatar-upload";
import { toast } from "sonner";

type AccountProfileEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: AccountProfile;
  userId: string;
  onSaved: (profile: AccountProfile) => void;
};

export default function AccountProfileEditor({
  open,
  onOpenChange,
  profile,
  userId,
  onSaved,
}: AccountProfileEditorProps) {
  const { t } = useLanguage();
  const copy = t.profileDashboard;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setDisplayName(profile.displayName);
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatarUrl);
  }, [open, profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { profile: next, error } = await patchAccountProfile({
        displayName: displayName.trim(),
        bio: bio.trim() ? bio.trim() : null,
        avatarUrl,
      });
      if (!next) {
        toast.error(error ?? copy.saveError);
        return;
      }
      onSaved(next);
      onOpenChange(false);
      toast.success(copy.saveSuccess);
    } finally {
      setSaving(false);
    }
  };

  const showAvatarError = (
    code: AvatarFileErrorCode,
    failure?: AvatarValidationFailure,
    storageMessage?: string | null
  ) => {
    const err =
      copy.avatarErrors[code as keyof typeof copy.avatarErrors] ?? copy.avatarErrors.storage_upload_failed;
    const detail = err.detail
      .replace("{type}", failure?.receivedType ?? "—")
      .replace("{sizeMb}", String(failure?.maxSourceMb ?? failure?.maxOutputMb ?? "2"))
      .replace("{receivedMb}", failure?.receivedSizeBytes
        ? String(Math.round((failure.receivedSizeBytes / (1024 * 1024)) * 10) / 10)
        : "—");
    const description = [detail, err.hint, storageMessage].filter(Boolean).join(" ");
    toast.error(err.title, { description, duration: 8000 });
  };

  const handleAvatarPick = async (file: File | undefined) => {
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    const basic = validateAvatarSourceFile(file);
    if (!basic.ok) {
      showAvatarError(basic.code, basic);
      return;
    }

    const decoded = await validateAvatarSourceDecodable(file);
    if (!decoded.ok) {
      showAvatarError(decoded.code, decoded);
      return;
    }

    setCropFile(file);
    setCropOpen(true);
  };

  const handleCroppedAvatar = async (blob: Blob) => {
    setSaving(true);
    try {
      const file = fileFromCroppedAvatarBlob(userId, blob);
      const result = await uploadAccountAvatar(userId, file);
      if (!result.url) {
        showAvatarError(result.code ?? "storage_upload_failed", undefined, result.error);
        return;
      }
      setAvatarUrl(result.url);
      toast.success(copy.avatarUploadSuccess);
    } finally {
      setSaving(false);
      setCropFile(null);
    }
  };

  const initials = accountProfileInitials(displayName || profile.displayName);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle>{copy.editProfileTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-slate-700 bg-gradient-to-br from-cyan-600 to-blue-800">
              <AccountAvatar
                src={avatarUrl}
                alt={displayName}
                initials={initials}
                sizes="80px"
              />
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                className="hidden"
                onChange={(event) => void handleAvatarPick(event.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                className="border-slate-600"
                disabled={saving}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {copy.uploadAvatar}
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-400"
                  disabled={saving}
                  onClick={() => setAvatarUrl(null)}
                >
                  {copy.removeAvatar}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-display-name">{copy.displayNameLabel}</Label>
            <Input
              id="account-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={80}
              className="bg-slate-950 border-slate-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-bio">{copy.bioLabel}</Label>
            <textarea
              id="account-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={1000}
              rows={5}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 resize-y"
              placeholder={copy.bioPlaceholder}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            {copy.cancelEdit}
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.saveProfile}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AccountAvatarCropDialog
      open={cropOpen}
      onOpenChange={(next) => {
        setCropOpen(next);
        if (!next) setCropFile(null);
      }}
      file={cropFile}
      onConfirm={(blob) => void handleCroppedAvatar(blob)}
      onError={(code, failure) => showAvatarError(code, failure)}
    />
    </>
  );
}
