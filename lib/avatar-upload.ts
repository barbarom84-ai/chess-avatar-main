/** Avatar source validation, crop export, and upload error codes. */

export const ALLOWED_AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const ALLOWED_AVATAR_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

/** Max size of the original file before opening the crop UI. */
export const MAX_AVATAR_SOURCE_BYTES = 15 * 1024 * 1024;

/** Max size of the cropped file sent to storage. */
export const MAX_AVATAR_OUTPUT_BYTES = 2 * 1024 * 1024;

export const AVATAR_CROP_VIEWPORT_PX = 280;
export const AVATAR_OUTPUT_PX = 512;

export type AvatarFileErrorCode =
  | "unsupported_type"
  | "source_too_large"
  | "empty_file"
  | "cannot_decode_image"
  | "output_too_large"
  | "not_signed_in"
  | "storage_not_configured"
  | "storage_upload_failed";

export type AvatarCropParams = {
  /** 1 = fit viewport; up to 3 = zoom in */
  scale: number;
  panX: number;
  panY: number;
};

export type AvatarValidationFailure = {
  ok: false;
  code: AvatarFileErrorCode;
  receivedType?: string;
  receivedSizeBytes?: number;
  maxSourceMb?: number;
  maxOutputMb?: number;
};

export type AvatarValidationSuccess = { ok: true };

function bytesToMb(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

function extensionFromName(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

export function isAllowedAvatarMimeOrExtension(file: File): boolean {
  if (file.type && ALLOWED_AVATAR_MIME_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_MIME_TYPES)[number])) {
    return true;
  }
  const ext = extensionFromName(file.name);
  return ALLOWED_AVATAR_EXTENSIONS.some((allowed) => ext === allowed);
}

export function validateAvatarSourceFile(
  file: File
): AvatarValidationSuccess | AvatarValidationFailure {
  if (!file.size) {
    return { ok: false, code: "empty_file", receivedSizeBytes: 0 };
  }
  if (file.size > MAX_AVATAR_SOURCE_BYTES) {
    return {
      ok: false,
      code: "source_too_large",
      receivedSizeBytes: file.size,
      maxSourceMb: bytesToMb(MAX_AVATAR_SOURCE_BYTES),
    };
  }
  if (!isAllowedAvatarMimeOrExtension(file)) {
    return {
      ok: false,
      code: "unsupported_type",
      receivedType: file.type || extensionFromName(file.name) || "unknown",
    };
  }
  return { ok: true };
}

/** Decode a file to an HTMLImageElement (data URL — reliable on mobile Safari). */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("cannot_decode_image"));
        return;
      }
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth < 1 || img.naturalHeight < 1) {
          reject(new Error("cannot_decode_image"));
          return;
        }
        resolve(img);
      };
      img.onerror = () => reject(new Error("cannot_decode_image"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("cannot_decode_image"));
    reader.readAsDataURL(file);
  });
}

export async function validateAvatarSourceDecodable(
  file: File
): Promise<AvatarValidationSuccess | AvatarValidationFailure> {
  try {
    await loadImageFromFile(file);
    return { ok: true };
  } catch {
    return { ok: false, code: "cannot_decode_image", receivedType: file.type || undefined };
  }
}

export function drawCroppedAvatar(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  size: number,
  params: AvatarCropParams
): void {
  const minScale = size / Math.min(img.naturalWidth, img.naturalHeight);
  const scale = minScale * params.scale;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const x = (size - w) / 2 + params.panX;
  const y = (size - h) / 2 + params.panY;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, x, y, w, h);
}

async function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

/** Export a square JPEG avatar; reduces quality until under MAX_AVATAR_OUTPUT_BYTES. */
export async function exportCroppedAvatarBlob(
  img: HTMLImageElement,
  params: AvatarCropParams
): Promise<{ blob: Blob } | AvatarValidationFailure> {
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_OUTPUT_PX;
  canvas.height = AVATAR_OUTPUT_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { ok: false, code: "cannot_decode_image" };
  }

  const scaleFactor = AVATAR_OUTPUT_PX / AVATAR_CROP_VIEWPORT_PX;
  drawCroppedAvatar(ctx, img, AVATAR_OUTPUT_PX, {
    scale: params.scale,
    panX: params.panX * scaleFactor,
    panY: params.panY * scaleFactor,
  });

  const qualities = [0.92, 0.85, 0.75, 0.65, 0.55, 0.45];
  let lastBlob: Blob | null = null;
  for (const q of qualities) {
    const blob = await canvasToJpegBlob(canvas, q);
    if (!blob) continue;
    lastBlob = blob;
    if (blob.size <= MAX_AVATAR_OUTPUT_BYTES) {
      return { blob };
    }
  }

  if (lastBlob) {
    return {
      ok: false,
      code: "output_too_large",
      receivedSizeBytes: lastBlob.size,
      maxOutputMb: bytesToMb(MAX_AVATAR_OUTPUT_BYTES),
    };
  }
  return { ok: false, code: "cannot_decode_image" };
}

export function croppedAvatarFile(blob: Blob, userId: string): File {
  return new File([blob], `${userId}-avatar.jpg`, { type: "image/jpeg" });
}

export function avatarExtensionForUpload(file: File): string {
  if (file.type === "image/png" || file.name.toLowerCase().endsWith(".png")) return "png";
  if (file.type === "image/webp" || file.name.toLowerCase().endsWith(".webp")) return "webp";
  if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) return "gif";
  return "jpg";
}
