import { create } from 'zustand';
import type { Point2D } from '../types/geometry';
import { distance2D, degToRad, radToDeg } from '../utils/math';
import { calculateOffsetPoints, angleBetweenSegments } from '../engine/geometry/offsetChain';
import {
  GUIDE_OFFSET_DISTANCE,
  GUIDE_START_INSET,
  GUIDE_END_INSET,
} from '../utils/constants';

const SNAP_THRESHOLD_DEG = 5;
const SNAP_ANGLES_ABSOLUTE = [0, 45, 90, 135, 180, 225, 270, 315];

export interface Segment {
  start: Point2D;
  end: Point2D;
  length: number; // mm
}

export interface AngleInfo {
  vertex: Point2D;
  angle: number; // degrees, interior angle
  index: number; // vertex index (1-based for first corner)
}

interface GuidelineToolState {
  points: Point2D[];
  previewPoint: Point2D | null;
  isDrawing: boolean;
  snapEnabled: boolean;

  // Actions
  startDrawing: () => void;
  addPoint: (raw: Point2D) => void;
  updatePreview: (raw: Point2D) => void;
  finishDrawing: () => Point2D[] | null;
  cancelDrawing: () => void;
  toggleSnap: () => void;

  // Computed getters (derived from points)
  getSegments: () => Segment[];
  getPreviewSegment: () => Segment | null;
  getAngles: () => AngleInfo[];
  getOffsetPoints: () => Point2D[];
}

function applySnap(
  target: Point2D,
  origin: Point2D | null,
  snapEnabled: boolean,
): Point2D {
  if (!snapEnabled) return target;

  const dx = target.x - (origin?.x ?? 0);
  const dy = target.y - (origin?.y ?? 0);
  const rawAngle = radToDeg(Math.atan2(dy, dx));
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 1e-6) return target;

  // Find the closest snap angle
  const angles = SNAP_ANGLES_ABSOLUTE;
  let bestAngle = rawAngle;
  let bestDiff = Infinity;

  for (const snapAngle of angles) {
    // Normalize difference to [-180, 180]
    let diff = rawAngle - snapAngle;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;

    if (Math.abs(diff) < bestDiff) {
      bestDiff = Math.abs(diff);
      bestAngle = snapAngle;
    }
  }

  if (bestDiff <= SNAP_THRESHOLD_DEG) {
    const rad = degToRad(bestAngle);
    return {
      x: (origin?.x ?? 0) + Math.cos(rad) * dist,
      y: (origin?.y ?? 0) + Math.sin(rad) * dist,
    };
  }

  return target;
}

export const useGuidelineTool = create<GuidelineToolState>()((set, get) => ({
  points: [],
  previewPoint: null,
  isDrawing: false,
  snapEnabled: true,

  startDrawing: () =>
    set({ points: [], previewPoint: null, isDrawing: true }),

  addPoint: (raw) => {
    const state = get();
    if (!state.isDrawing) return;
    const origin = state.points.length > 0 ? state.points[state.points.length - 1] : null;
    const snapped = applySnap(raw, origin, state.snapEnabled);
    set({ points: [...state.points, snapped] });
  },

  updatePreview: (raw) => {
    const state = get();
    if (!state.isDrawing) return;
    const origin = state.points.length > 0 ? state.points[state.points.length - 1] : null;
    const snapped = applySnap(raw, origin, state.snapEnabled);
    set({ previewPoint: snapped });
  },

  finishDrawing: () => {
    const state = get();
    if (state.points.length < 2) {
      set({ points: [], previewPoint: null, isDrawing: false });
      return null;
    }
    const points = [...state.points];
    set({ points: [], previewPoint: null, isDrawing: false });
    return points;
  },

  cancelDrawing: () =>
    set({ points: [], previewPoint: null, isDrawing: false }),

  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

  getSegments: () => {
    const { points } = get();
    const segments: Segment[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      segments.push({
        start,
        end,
        length: distance2D(start.x, start.y, end.x, end.y),
      });
    }
    return segments;
  },

  getPreviewSegment: () => {
    const { points, previewPoint } = get();
    if (points.length === 0 || !previewPoint) return null;
    const start = points[points.length - 1];
    return {
      start,
      end: previewPoint,
      length: distance2D(start.x, start.y, previewPoint.x, previewPoint.y),
    };
  },

  getAngles: () => {
    const { points } = get();
    const angles: AngleInfo[] = [];
    for (let i = 1; i < points.length - 1; i++) {
      const angle = angleBetweenSegments(points[i - 1], points[i], points[i + 1]);
      angles.push({ vertex: points[i], angle, index: i });
    }
    return angles;
  },

  getOffsetPoints: () => {
    const { points } = get();
    if (points.length < 2) return [];
    return calculateOffsetPoints(
      points,
      GUIDE_OFFSET_DISTANCE,
      GUIDE_START_INSET,
      GUIDE_END_INSET,
    );
  },
}));
