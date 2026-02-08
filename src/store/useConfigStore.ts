import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { LevelName, LevelsConfig } from '../types/levels';
import type { Point2D } from '../types/geometry';
import { DEFAULT_LEVELS, GUIDE_OFFSET_DISTANCE, GUIDE_START_INSET, GUIDE_END_INSET } from '../utils/constants';
import { distance2D, degToRad, radToDeg } from '../utils/math';
import { angleBetweenSegments, calculateOffsetPoints } from '../engine/geometry/offsetChain';

export type ActiveMode = 'select' | 'draw-guide' | 'levels';
export type ActiveView = '2d' | '3d';

export interface SegmentInfo {
  start: Point2D;
  end: Point2D;
  length: number;
  index: number; // index of start point
}

export interface AngleInfo {
  vertex: Point2D;
  angle: number; // degrees
  index: number; // index of vertex point
}

// ─── Angle snapping ───────────────────────────────────────
const SNAP_THRESHOLD_DEG = 5;
const SNAP_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export function applySnap(
  target: Point2D,
  origin: Point2D | null,
  snapEnabled: boolean,
): Point2D {
  if (!snapEnabled || !origin) return target;

  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const rawAngle = radToDeg(Math.atan2(dy, dx));
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 1e-6) return target;

  let bestAngle = rawAngle;
  let bestDiff = Infinity;

  for (const snapAngle of SNAP_ANGLES) {
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
      x: origin.x + Math.cos(rad) * dist,
      y: origin.y + Math.sin(rad) * dist,
    };
  }

  return target;
}

interface ConfigState {
  // Levels
  levels: LevelsConfig;
  setLevelZ: (name: LevelName, z: number) => void;
  setLevelVisible: (name: LevelName, visible: boolean) => void;

  // Guideline polyline — ONE connected chain of points
  guidePoints: Point2D[];
  previewPoint: Point2D | null;
  isDrawing: boolean;
  snapEnabled: boolean;

  // Guideline actions
  addPoint: (pt: Point2D) => void;
  movePoint: (index: number, pt: Point2D) => void;
  removePoint: (index: number) => void;
  insertPointOnSegment: (segmentIndex: number, pt: Point2D) => void;
  updateSegmentLength: (segmentIndex: number, newLength: number) => void;
  updateAngle: (vertexIndex: number, newAngle: number) => void;
  setPreviewPoint: (pt: Point2D | null) => void;
  setIsDrawing: (v: boolean) => void;
  undoLastPoint: () => void;
  clearGuide: () => void;
  toggleSnap: () => void;

  // Computed
  getSegments: () => SegmentInfo[];
  getAngles: () => AngleInfo[];
  getOffsetPoints: () => Point2D[];

  // UI state
  activeMode: ActiveMode;
  setActiveMode: (mode: ActiveMode) => void;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
}

export const useConfigStore = create<ConfigState>()(
  immer((set, get) => ({
    // Levels
    levels: {
      levels: {
        Understycke: { name: 'Understycke', zPosition: DEFAULT_LEVELS.Understycke, visible: true },
        Mellanstycke: { name: 'Mellanstycke', zPosition: DEFAULT_LEVELS.Mellanstycke, visible: true },
        Overstycke: { name: 'Overstycke', zPosition: DEFAULT_LEVELS.Overstycke, visible: true },
      },
    },

    setLevelZ: (name, z) =>
      set((state) => {
        state.levels.levels[name].zPosition = z;
      }),

    setLevelVisible: (name, visible) =>
      set((state) => {
        state.levels.levels[name].visible = visible;
      }),

    // Guideline polyline
    guidePoints: [],
    previewPoint: null,
    isDrawing: false,
    snapEnabled: true,

    addPoint: (pt) =>
      set((state) => {
        const origin = state.guidePoints.length > 0
          ? state.guidePoints[state.guidePoints.length - 1]
          : null;
        const snapped = applySnap(pt, origin, state.snapEnabled);
        state.guidePoints.push(snapped);
      }),

    movePoint: (index, pt) =>
      set((state) => {
        if (index >= 0 && index < state.guidePoints.length) {
          state.guidePoints[index] = pt;
        }
      }),

    removePoint: (index) =>
      set((state) => {
        if (state.guidePoints.length > 2 && index >= 0 && index < state.guidePoints.length) {
          state.guidePoints.splice(index, 1);
        }
      }),

    insertPointOnSegment: (segmentIndex, pt) =>
      set((state) => {
        if (segmentIndex >= 0 && segmentIndex < state.guidePoints.length - 1) {
          state.guidePoints.splice(segmentIndex + 1, 0, pt);
        }
      }),

    updateSegmentLength: (segmentIndex, newLength) =>
      set((state) => {
        const pts = state.guidePoints;
        if (segmentIndex < 0 || segmentIndex >= pts.length - 1) return;
        const s = pts[segmentIndex];
        const e = pts[segmentIndex + 1];
        const dx = e.x - s.x;
        const dy = e.y - s.y;
        const currentLen = Math.sqrt(dx * dx + dy * dy);
        if (currentLen < 1e-10) return;
        const scale = newLength / currentLen;
        pts[segmentIndex + 1] = {
          x: s.x + dx * scale,
          y: s.y + dy * scale,
        };
      }),

    updateAngle: (vertexIndex, newAngle) =>
      set((state) => {
        const pts = state.guidePoints;
        if (vertexIndex <= 0 || vertexIndex >= pts.length - 1) return;
        const prev = pts[vertexIndex - 1];
        const curr = pts[vertexIndex];
        const next = pts[vertexIndex + 1];

        // Incoming direction
        const inDx = curr.x - prev.x;
        const inDy = curr.y - prev.y;
        const inAngle = Math.atan2(inDy, inDx);

        // Compute new outgoing direction
        const newAngleRad = newAngle * (Math.PI / 180);
        const outAngle = inAngle + Math.PI - newAngleRad;

        const outLen = distance2D(curr.x, curr.y, next.x, next.y);
        pts[vertexIndex + 1] = {
          x: curr.x + Math.cos(outAngle) * outLen,
          y: curr.y + Math.sin(outAngle) * outLen,
        };
      }),

    setPreviewPoint: (pt) =>
      set((state) => {
        if (state.isDrawing) {
          const origin = state.guidePoints.length > 0
            ? state.guidePoints[state.guidePoints.length - 1]
            : null;
          state.previewPoint = pt ? applySnap(pt, origin, state.snapEnabled) : null;
        } else {
          state.previewPoint = null;
        }
      }),

    setIsDrawing: (v) =>
      set((state) => {
        state.isDrawing = v;
        if (!v) state.previewPoint = null;
      }),

    undoLastPoint: () =>
      set((state) => {
        if (state.guidePoints.length > 0) {
          state.guidePoints.pop();
        }
        if (state.guidePoints.length === 0) {
          state.isDrawing = false;
          state.previewPoint = null;
        }
      }),

    clearGuide: () =>
      set((state) => {
        state.guidePoints = [];
        state.isDrawing = false;
        state.previewPoint = null;
      }),

    toggleSnap: () =>
      set((state) => {
        state.snapEnabled = !state.snapEnabled;
      }),

    // Computed
    getSegments: () => {
      const pts = get().guidePoints;
      const segs: SegmentInfo[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        segs.push({
          start: pts[i],
          end: pts[i + 1],
          length: distance2D(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y),
          index: i,
        });
      }
      return segs;
    },

    getAngles: () => {
      const pts = get().guidePoints;
      const angles: AngleInfo[] = [];
      for (let i = 1; i < pts.length - 1; i++) {
        const angle = angleBetweenSegments(pts[i - 1], pts[i], pts[i + 1]);
        angles.push({ vertex: pts[i], angle, index: i });
      }
      return angles;
    },

    getOffsetPoints: () => {
      const pts = get().guidePoints;
      if (pts.length < 2) return [];
      return calculateOffsetPoints(pts, GUIDE_OFFSET_DISTANCE, GUIDE_START_INSET, GUIDE_END_INSET);
    },

    // UI state
    activeMode: 'select',
    setActiveMode: (mode) =>
      set((state) => {
        state.activeMode = mode;
        // Stop drawing when switching away from draw mode
        if (mode !== 'draw-guide') {
          state.isDrawing = false;
          state.previewPoint = null;
        }
      }),

    activeView: '2d',
    setActiveView: (view) =>
      set((state) => {
        state.activeView = view;
      }),
  })),
);
