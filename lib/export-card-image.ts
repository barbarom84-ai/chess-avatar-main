/**
 * Exporte un élément DOM (carte avatar) en PNG via html-to-image.
 */
export async function exportCardAsPng(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#020617",
  });
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
