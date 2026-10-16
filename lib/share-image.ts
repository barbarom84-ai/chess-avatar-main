export type ShareImageResult = "shared" | "downloaded" | "cancelled";

/** Transparent pixel used when a remote avatar can't be inlined (CORS). */
const IMAGE_PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Renders a DOM element to PNG, then opens the native share sheet when the
 * browser can share files (mobile) or downloads the image otherwise.
 * Descendants marked `data-share-exclude="true"` are left out.
 */
export async function shareElementAsImage(
  element: HTMLElement,
  fileName: string,
  title: string
): Promise<ShareImageResult> {
  const { toBlob } = await import("html-to-image");
  const blob = await toBlob(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#020617",
    imagePlaceholder: IMAGE_PLACEHOLDER,
    filter: (node) => !(node instanceof HTMLElement && node.dataset.shareExclude === "true"),
  });
  if (!blob) throw new Error("Image rendering failed");

  const file = new File([blob], fileName, { type: "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      /* fall back to a download */
    }
  }
  downloadBlob(blob, fileName);
  return "downloaded";
}
