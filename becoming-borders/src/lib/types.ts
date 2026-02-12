export interface Point {
  x: number;
  y: number;
}

/** Normalized coordinates (0-1 range) for responsive scaling */
export interface NormalizedPoint {
  nx: number;
  ny: number;
}

export interface Segment {
  start: NormalizedPoint;
  end: NormalizedPoint;
}

export interface Intersection {
  point: NormalizedPoint;
  sectionIndex: number;
}
