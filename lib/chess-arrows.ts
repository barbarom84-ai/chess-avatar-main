export const LICHESS_ARROW_COLORS = {
  defaultGreen: "rgba(34, 197, 94, 0.88)",
  altBlue: "rgba(59, 130, 246, 0.88)",
  shiftCtrlRed: "rgba(239, 68, 68, 0.88)",
  shiftCtrlAltYellow: "rgba(250, 204, 21, 0.90)",
} as const;

/** Opacité finale (0.10–1) pour une couleur rgba/rgb (flèche dernier coup). */
export function applyArrowOpacityPercent(
  color: string,
  percent10to100: number
): string {
  const p = Math.min(100, Math.max(10, Math.round(percent10to100)));
  const alpha = p / 100;
  const m = color
    .trim()
    .match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (m) {
    return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
  }
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    if (full.length !== 6) return color;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return color;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

export function getLichessArrowColorFromModifiers(modifiers: {
  altKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): string {
  const hasAlt = !!modifiers.altKey;
  const hasShiftOrCtrl = !!modifiers.shiftKey || !!modifiers.ctrlKey || !!modifiers.metaKey;

  if (hasAlt && hasShiftOrCtrl) return LICHESS_ARROW_COLORS.shiftCtrlAltYellow;
  if (hasShiftOrCtrl) return LICHESS_ARROW_COLORS.shiftCtrlRed;
  if (hasAlt) return LICHESS_ARROW_COLORS.altBlue;
  return LICHESS_ARROW_COLORS.defaultGreen;
}

