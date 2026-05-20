"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const DEFAULT_CROP: AvatarCropParams = { scale: 1, panX: 0, panY: 0 };
const MIN_ZOOM_PCT = 100;
const MAX_ZOOM_PCT = 300;

function zoomPercentToScale(pct: number): number {
  return 1 + ((pct - MIN_ZOOM_PCT) / (MAX_ZOOM_PCT - MIN_ZOOM_PCT)) * 2;
}

function avatarFileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

type AccountAvatarCropPanelProps = {
  file: File;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
  onError: (code: AvatarFileErrorCode, failure?: AvatarValidationFailure) => void;
};

export default function AccountAvatarCropPanel({
  file,
  onConfirm,
  onCancel,
  onError,
}: AccountAvatarCropPanelProps) {
  const { t } = useLanguage();
  const copy = t.profileDashboard.avatarCrop;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const cropRef = useRef<AvatarCropParams>(DEFAULT_CROP);
  const onErrorRef = useRef(onError);
  const loadedFileKeyRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [crop, setCrop] = useState<AvatarCropParams>(DEFAULT_CROP);
  const [zoomPercent, setZoomPercent] = useState(MIN_ZOOM_PCT);
  const [imageReady, setImageReady] = useState(false);

  const fileKey = avatarFileKey(file);

  onErrorRef.current = onError;
  cropRef.current = crop;

  const paintCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageReady) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawCroppedAvatar(ctx, img, AVATAR_CROP_VIEWPORT_PX, cropRef.current);
  }, [imageReady]);

  useEffect(() => {
    if (loadedFileKeyRef.current === fileKey && imgRef.current) {
      return;
    }

    let cancelled = false;
    loadedFileKeyRef.current = fileKey;
    setLoading(true);
    setImageReady(false);
    imgRef.current = null;
    setCrop(DEFAULT_CROP);
    setZoomPercent(MIN_ZOOM_PCT);
    cropRef.current = DEFAULT_CROP;

    void loadImageFromFile(file)
      .then((img) => {
        if (cancelled) return;
        imgRef.current = img;
        setImageReady(true);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          loadedFileKeyRef.current = null;
          setLoading(false);
          onErrorRef.current("cannot_decode_image");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fileKey, file]);

  useLayoutEffect(() => {
    paintCanvas();
  }, [paintCanvas, crop, imageReady]);

  const applyZoom = useCallback((pct: number) => {
    if (!Number.isFinite(pct)) return;
    const clamped = Math.min(MAX_ZOOM_PCT, Math.max(MIN_ZOOM_PCT, Math.round(pct)));
    const scale = zoomPercentToScale(clamped);
    const next: AvatarCropParams = {
      panX: cropRef.current.panX,
      panY: cropRef.current.panY,
      scale,
    };
    cropRef.current = next;
    setZoomPercent(clamped);
    setCrop(next);
  }, []);

  const startDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (loading || applying || !imageReady) return;
      const origin = { x: clientX, y: clientY, panX: cropRef.current.panX, panY: cropRef.current.panY };

      const onMove = (ev: PointerEvent) => {
        ev.preventDefault();
        const next: AvatarCropParams = {
          panX: origin.panX + (ev.clientX - origin.x),
          panY: origin.panY + (ev.clientY - origin.y),
          scale: cropRef.current.scale,
        };
        cropRef.current = next;
        setCrop(next);
      };

      const end = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
      };

      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
    },
    [loading, applying, imageReady]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    startDrag(e.clientX, e.clientY);
  };

  const handleApply = async () => {
    const img = imgRef.current;
    if (!img) return;
    setApplying(true);
    try {
      const result = await exportCroppedAvatarBlob(img, cropRef.current);
      if ("blob" in result) {
        onConfirm(result.blob);
        return;
      }
      onErrorRef.current(result.code, result);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-100">{copy.title}</p>
      <p className="text-xs text-slate-400">{copy.panHint}</p>

      <div className="flex justify-center">
        <div
          className="relative rounded-full overflow-hidden border-2 border-cyan-500/50 bg-slate-950 shadow-inner"
          style={{ width: AVATAR_CROP_VIEWPORT_PX, height: AVATAR_CROP_VIEWPORT_PX }}
        >
          <canvas
            ref={canvasRef}
            width={AVATAR_CROP_VIEWPORT_PX}
            height={AVATAR_CROP_VIEWPORT_PX}
            className={`block touch-none select-none ${
              loading ? "invisible" : "cursor-grab active:cursor-grabbing"
            }`}
            style={{
              width: AVATAR_CROP_VIEWPORT_PX,
              height: AVATAR_CROP_VIEWPORT_PX,
              touchAction: "none",
            }}
            aria-label={copy.previewAria}
            aria-hidden={loading}
            onPointerDown={handlePointerDown}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-slate-300">{copy.zoomLabel}</span>
          <span className="text-sm tabular-nums text-cyan-300 font-medium">{zoomPercent}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 h-11 w-11 border-slate-600"
            disabled={loading || applying}
            aria-label={copy.zoomOut}
            onClick={() => applyZoom(zoomPercent - 10)}
          >
            <Minus className="h-5 w-5" />
          </Button>
          <input
            type="range"
            min={MIN_ZOOM_PCT}
            max={MAX_ZOOM_PCT}
            step={1}
            value={zoomPercent}
            disabled={loading || applying}
            onInput={(e) => applyZoom(Number(e.currentTarget.value))}
            onChange={(e) => applyZoom(Number(e.currentTarget.value))}
            className="flex-1 h-11 min-h-[44px] cursor-pointer accent-cyan-500"
            aria-valuetext={`${zoomPercent}%`}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 h-11 w-11 border-slate-600"
            disabled={loading || applying}
            aria-label={copy.zoomIn}
            onClick={() => applyZoom(zoomPercent + 10)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">{copy.requirementsHint}</p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" className="min-h-11" disabled={applying} onClick={onCancel}>
          {copy.cancel}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={loading || applying}
          onClick={() => {
            cropRef.current = DEFAULT_CROP;
            setCrop(DEFAULT_CROP);
            setZoomPercent(MIN_ZOOM_PCT);
          }}
        >
          {copy.reset}
        </Button>
        <Button
          type="button"
          className="min-h-11"
          disabled={loading || applying || !imageReady}
          onClick={() => void handleApply()}
        >
          {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.apply}
        </Button>
      </div>
    </div>
  );
}
