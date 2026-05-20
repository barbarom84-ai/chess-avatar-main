"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/lib/language-context";
import {
  AVATAR_CROP_VIEWPORT_PX,
  drawCroppedAvatar,
  exportCroppedAvatarBlob,
  loadImageFromFile,
  type AvatarCropParams,
  type AvatarFileErrorCode,
  type AvatarValidationFailure,
} from "@/lib/avatar-upload";

type AccountAvatarCropDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  onConfirm: (blob: Blob) => void;
  onError: (code: AvatarFileErrorCode, failure?: AvatarValidationFailure) => void;
};

const DEFAULT_CROP: AvatarCropParams = { scale: 1, panX: 0, panY: 0 };
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export default function AccountAvatarCropDialog({
  open,
  onOpenChange,
  file,
  onConfirm,
  onError,
}: AccountAvatarCropDialogProps) {
  const { t } = useLanguage();
  const copy = t.profileDashboard.avatarCrop;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(
    null
  );

  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [crop, setCrop] = useState<AvatarCropParams>(DEFAULT_CROP);
  const [zoomPercent, setZoomPercent] = useState(100);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawCroppedAvatar(ctx, img, AVATAR_CROP_VIEWPORT_PX, crop);
  }, [crop]);

  useEffect(() => {
    if (!open || !file) {
      imgRef.current = null;
      setCrop(DEFAULT_CROP);
      setZoomPercent(100);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void loadImageFromFile(file)
      .then((img) => {
        if (cancelled) return;
        imgRef.current = img;
        setCrop(DEFAULT_CROP);
        setZoomPercent(100);
        setLoading(false);
        requestAnimationFrame(redraw);
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          onError("cannot_decode_image");
          onOpenChange(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, file, onError, onOpenChange, redraw]);

  useEffect(() => {
    if (!loading && open) redraw();
  }, [crop, loading, open, redraw]);

  const handleZoomChange = (values: number[]) => {
    const pct = values[0] ?? 100;
    setZoomPercent(pct);
    const scale = MIN_ZOOM + ((pct - 100) / 200) * (MAX_ZOOM - MIN_ZOOM);
    setCrop((prev) => ({ ...prev, scale }));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (loading || applying) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: crop.panX,
      panY: crop.panY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setCrop((prev) => ({
      ...prev,
      panX: drag.panX + (e.clientX - drag.startX),
      panY: drag.panY + (e.clientY - drag.startY),
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current) {
      dragRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  const handleReset = () => {
    setCrop(DEFAULT_CROP);
    setZoomPercent(100);
  };

  const handleApply = async () => {
    const img = imgRef.current;
    if (!img) return;
    setApplying(true);
    try {
      const result = await exportCroppedAvatarBlob(img, crop);
      if ("blob" in result) {
        onConfirm(result.blob);
        onOpenChange(false);
        return;
      }
      onError(result.code, result);
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-slate-400">{copy.panHint}</p>

          <div className="flex justify-center">
            <div
              className="relative rounded-full overflow-hidden border-2 border-cyan-500/40 shadow-lg ring-2 ring-slate-800"
              style={{ width: AVATAR_CROP_VIEWPORT_PX, height: AVATAR_CROP_VIEWPORT_PX }}
            >
              {loading ? (
                <div
                  className="flex items-center justify-center bg-slate-950"
                  style={{ width: AVATAR_CROP_VIEWPORT_PX, height: AVATAR_CROP_VIEWPORT_PX }}
                >
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                </div>
              ) : (
                <canvas
                  ref={canvasRef}
                  width={AVATAR_CROP_VIEWPORT_PX}
                  height={AVATAR_CROP_VIEWPORT_PX}
                  className="touch-none cursor-grab active:cursor-grabbing block"
                  aria-label={copy.previewAria}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-slate-300 flex items-center gap-1.5">
                <ZoomOut className="h-3.5 w-3.5" />
                {copy.zoomLabel}
                <ZoomIn className="h-3.5 w-3.5" />
              </Label>
              <span className="text-xs text-slate-500 tabular-nums">{zoomPercent}%</span>
            </div>
            <Slider
              min={100}
              max={300}
              step={1}
              value={[zoomPercent]}
              onValueChange={handleZoomChange}
              disabled={loading || applying}
              className="py-1"
            />
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">{copy.requirementsHint}</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            disabled={applying}
            onClick={() => onOpenChange(false)}
          >
            {copy.cancel}
          </Button>
          <Button type="button" variant="outline" disabled={loading || applying} onClick={handleReset}>
            {copy.reset}
          </Button>
          <Button type="button" disabled={loading || applying} onClick={() => void handleApply()}>
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.apply}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
