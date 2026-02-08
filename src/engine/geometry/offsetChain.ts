import type { Point2D } from '../../types/geometry';
import { distance2D } from '../../utils/math';

/**
 * Calculate 2D line-line intersection.
 * Lines defined by point + direction vector.
 * Returns null if parallel.
 */
export function lineLineIntersection2D(
  p1: Point2D,
  d1: Point2D,
  p2: Point2D,
  d2: Point2D,
): Point2D | null {
  const denom = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(denom) < 1e-10) return null; // parallel

  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / denom;
  return {
    x: p1.x + t * d1.x,
    y: p1.y + t * d1.y,
  };
}

/**
 * Get the perpendicular (left-side normal) of a direction vector.
 */
function perpendicular(dx: number, dy: number): Point2D {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-10) return { x: 0, y: 0 };
  return { x: -dy / len, y: dx / len };
}

/**
 * Calculate offset points for a polyline chain.
 * Port of Ruby 050_Make_guide.rb calculate_offset_points.
 *
 * @param points - Original polyline vertices (mm)
 * @param offsetDistance - Perpendicular offset distance (negative = right side)
 * @param startInset - Distance to shorten at start
 * @param endInset - Distance to shorten at end
 * @returns Offset polyline vertices (mm)
 */
export function calculateOffsetPoints(
  points: Point2D[],
  offsetDistance: number,
  startInset: number,
  endInset: number,
): Point2D[] {
  if (points.length < 2) return [];

  // Calculate offset segments (each segment offset perpendicular)
  const offsetSegments: { start: Point2D; end: Point2D; dx: number; dy: number }[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const perp = perpendicular(dx, dy);

    offsetSegments.push({
      start: {
        x: p1.x + perp.x * offsetDistance,
        y: p1.y + perp.y * offsetDistance,
      },
      end: {
        x: p2.x + perp.x * offsetDistance,
        y: p2.y + perp.y * offsetDistance,
      },
      dx,
      dy,
    });
  }

  // Build offset points by intersecting consecutive offset segments
  const result: Point2D[] = [];

  // First point: offset of first segment start, with inset
  const firstSeg = offsetSegments[0];
  const firstLen = distance2D(firstSeg.start.x, firstSeg.start.y, firstSeg.end.x, firstSeg.end.y);
  if (firstLen > 1e-10) {
    result.push({
      x: firstSeg.start.x + firstSeg.dx / Math.sqrt(firstSeg.dx ** 2 + firstSeg.dy ** 2) * startInset,
      y: firstSeg.start.y + firstSeg.dy / Math.sqrt(firstSeg.dx ** 2 + firstSeg.dy ** 2) * startInset,
    });
  } else {
    result.push(firstSeg.start);
  }

  // Middle points: intersect consecutive offset segments
  for (let i = 0; i < offsetSegments.length - 1; i++) {
    const seg1 = offsetSegments[i];
    const seg2 = offsetSegments[i + 1];

    const intersection = lineLineIntersection2D(
      seg1.start,
      { x: seg1.dx, y: seg1.dy },
      seg2.start,
      { x: seg2.dx, y: seg2.dy },
    );

    if (intersection) {
      result.push(intersection);
    } else {
      // Parallel segments, use endpoint of first
      result.push(seg1.end);
    }
  }

  // Last point: offset of last segment end, with inset
  const lastSeg = offsetSegments[offsetSegments.length - 1];
  const lastLen = distance2D(lastSeg.start.x, lastSeg.start.y, lastSeg.end.x, lastSeg.end.y);
  if (lastLen > 1e-10) {
    const normLen = Math.sqrt(lastSeg.dx ** 2 + lastSeg.dy ** 2);
    result.push({
      x: lastSeg.end.x - lastSeg.dx / normLen * endInset,
      y: lastSeg.end.y - lastSeg.dy / normLen * endInset,
    });
  } else {
    result.push(lastSeg.end);
  }

  return result;
}

/**
 * Calculate angle between two consecutive segments at a shared vertex.
 * Returns interior angle in degrees (0-180).
 */
export function angleBetweenSegments(
  p1: Point2D,
  vertex: Point2D,
  p3: Point2D,
): number {
  const v1x = p1.x - vertex.x;
  const v1y = p1.y - vertex.y;
  const v2x = p3.x - vertex.x;
  const v2y = p3.y - vertex.y;

  const dot = v1x * v2x + v1y * v2y;
  const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

  if (len1 < 1e-10 || len2 < 1e-10) return 180;

  const cosAngle = Math.max(-1, Math.min(1, dot / (len1 * len2)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}
