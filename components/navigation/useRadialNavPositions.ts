/** Polar coordinates for radial nav slots (degrees, radius px). */
export type RadialSlotPosition = {
  x: number;
  y: number;
  angle: number;
};

export function computeRadialPositions(
  count: number,
  radius: number,
  startAngle = -90,
  sweep = 360
): RadialSlotPosition[] {
  if (count === 0) return [];
  const step = count === 1 ? 0 : sweep / count;
  return Array.from({ length: count }, (_, i) => {
    const angleDeg = startAngle + step * i + (count === 1 ? 0 : step / 2);
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: Math.cos(angleRad) * radius,
      y: Math.sin(angleRad) * radius,
      angle: angleDeg,
    };
  });
}

export function useRadialNavPositions(primaryCount: number, secondaryCount: number) {
  const outer = computeRadialPositions(primaryCount, 140, -120, 240);
  const inner = computeRadialPositions(secondaryCount, 78, -135, 270);
  return { outer, inner };
}
