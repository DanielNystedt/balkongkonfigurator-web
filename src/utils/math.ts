export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Linear interpolation between two arrays indexed by angle.
 * Used for offset calculations from 030_Config_glazing.rb.
 */
export function interpolateFromTable(
  angle: number,
  angles: number[],
  values: number[],
): number {
  if (angle >= angles[0]) return values[0];
  if (angle <= angles[angles.length - 1]) return values[values.length - 1];

  for (let i = 0; i < angles.length - 1; i++) {
    if (angle <= angles[i] && angle >= angles[i + 1]) {
      const ratio = (angle - angles[i]) / (angles[i + 1] - angles[i]);
      return values[i] + ratio * (values[i + 1] - values[i]);
    }
  }

  return values[values.length - 1];
}

/**
 * Calculate distance between two 2D points.
 */
export function distance2D(
  x1: number, y1: number,
  x2: number, y2: number,
): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Calculate distance between two 3D points.
 */
export function distance3D(
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
}

/**
 * Calculate angle between two 2D vectors (in degrees).
 */
export function angleBetweenVectors2D(
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dot = ax * bx + ay * by;
  const cross = ax * by - ay * bx;
  return radToDeg(Math.atan2(cross, dot));
}

/**
 * Round to specified number of decimal places.
 */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
