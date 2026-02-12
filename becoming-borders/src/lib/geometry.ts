import type { NormalizedPoint, Segment } from "./types";

/**
 * Detect intersection between two line segments using parametric form.
 * Returns the intersection point if segments cross, null otherwise.
 */
export function segmentIntersection(
  a: Segment,
  b: Segment
): NormalizedPoint | null {
  const x1 = a.start.nx,
    y1 = a.start.ny;
  const x2 = a.end.nx,
    y2 = a.end.ny;
  const x3 = b.start.nx,
    y3 = b.start.ny;
  const x4 = b.end.nx,
    y4 = b.end.ny;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  // Parallel or coincident
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  // Check if intersection is within both segments (exclusive of endpoints)
  const eps = 0.001;
  if (t > eps && t < 1 - eps && u > eps && u < 1 - eps) {
    return {
      nx: x1 + t * (x2 - x1),
      ny: y1 + t * (y2 - y1),
    };
  }

  return null;
}

/**
 * Find all intersections between a new segment and existing segments.
 */
export function findIntersections(
  newSegment: Segment,
  existingSegments: Segment[]
): NormalizedPoint[] {
  const points: NormalizedPoint[] = [];

  for (const existing of existingSegments) {
    const point = segmentIntersection(newSegment, existing);
    if (point) {
      points.push(point);
    }
  }

  return points;
}
