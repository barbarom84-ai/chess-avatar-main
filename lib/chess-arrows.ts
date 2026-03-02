export const LICHESS_ARROW_COLORS = {
  defaultGreen: "rgba(34, 197, 94, 0.88)",
  altBlue: "rgba(59, 130, 246, 0.88)",
  shiftCtrlRed: "rgba(239, 68, 68, 0.88)",
  shiftCtrlAltYellow: "rgba(250, 204, 21, 0.90)",
} as const;

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

