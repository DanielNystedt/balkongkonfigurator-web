import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { LevelName, LevelsConfig } from '../types/levels';
import type { Point2D } from '../types/geometry';
import type { ProjectConfig } from '../types/project';
import type { ProfileConfig, BarlinaType, BottenprofilType, BrostningsramType } from '../types/profile';
import type { Panel, OpeningDirection, LockSymbol } from '../types/panel';
import type { EdgeConfig } from '../types/edge';
import {
  DEFAULT_LEVELS,
  GUIDE_OFFSET_DISTANCE,
  GUIDE_START_INSET,
  GUIDE_END_INSET,
  DEFAULT_PROJECT_CONFIG,
  DEFAULT_PROFILE_CONFIG,
  DEFAULT_FRAME_WIDTH_SETTINGS,
  DEFAULT_EXPANDED_SECTIONS,
} from '../utils/constants';
import { distance2D, degToRad, radToDeg } from '../utils/math';
import { angleBetweenSegments, calculateOffsetPoints } from '../engine/geometry/offsetChain';
import {
  computeEdgeData,
  autoGeneratePanelsForEdge,
  evenDistributePanelsForEdge,
  recalcPanelOffsets,
  isConnectedToWall,
  type ComputedEdgeData,
} from '../engine/calculations/edgeCalculations';

export type ActiveMode = 'select' | 'draw-guide' | 'levels';
export type ActiveView = '2d' | '3d' | '2d3d' | 'panel';

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

export interface FrameWidthSettings {
  maxWidthGlass: number;
  maxWidthCovered: number;
  maxWidthWall: number;
}

// ─── Angle snapping ───────────────────────────────────────
const SNAP_THRESHOLD_DEG = 5;
const SNAP_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export function applySnap(
  target: Point2D,
  origin: Point2D | null,
  snapAngle: boolean,
): Point2D {
  if (!snapAngle || !origin) return target;

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
  levelEditMode: boolean;
  setLevelEditMode: (v: boolean) => void;

  // Guideline polyline — ONE connected chain of points
  guidePoints: Point2D[];
  previewPoint: Point2D | null;
  isDrawing: boolean;
  snapEnabled: boolean;
  snapAngle: boolean;

  /** Fritt glasmått — equal free-width panels instead of 30mm-step standard sizes */
  freeGlassWidth: boolean;
  toggleFreeGlassWidth: () => void;

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
  toggleSnapAngle: () => void;

  // Computed
  getSegments: () => SegmentInfo[];
  getAngles: () => AngleInfo[];
  getOffsetPoints: () => Point2D[];

  // UI state
  activeMode: ActiveMode;
  setActiveMode: (mode: ActiveMode) => void;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  // ─── Project config ───────────────────────────────────────
  projectConfig: ProjectConfig;
  setProjectField: <K extends keyof ProjectConfig>(key: K, value: ProjectConfig[K]) => void;

  // ─── Profile config ───────────────────────────────────────
  profileConfig: ProfileConfig;
  setProfileField: <K extends keyof ProfileConfig>(key: K, value: ProfileConfig[K]) => void;

  // ─── Frame width settings ─────────────────────────────────
  frameWidthSettings: FrameWidthSettings;
  setFrameWidthField: <K extends keyof FrameWidthSettings>(key: K, value: FrameWidthSettings[K]) => void;

  // ─── Segment selection ─────────────────────────────────────
  selectedSegmentIndex: number | null;
  setSelectedSegmentIndex: (index: number | null) => void;

  // ─── Per-edge config ───────────────────────────────────────
  edgeConfigs: EdgeConfig[];
  setEdgeWallOrGlazing: (segIndex: number, status: 'wall' | 'glazing') => void;
  addPanel: (segIndex: number) => void;
  removePanel: (segIndex: number, panelIndex: number) => void;
  updatePanelField: (segIndex: number, panelIndex: number, field: keyof Panel, value: string | number) => void;
  autoGeneratePanels: (segIndex: number) => void;

  // ─── Computed edge data ─────────────────────────────────────
  getEdgeData: (segIndex: number) => ComputedEdgeData | null;

  // ─── Accordion UI ──────────────────────────────────────────
  expandedSections: Record<string, boolean>;
  toggleSection: (id: string) => void;

  // ─── Point cloud ──────────────────────────────────────────
  pointCloudEnabled: boolean;
  setPointCloudEnabled: (v: boolean) => void;
  pointCloudClipY: number;      // meters (Three.js Y axis)
  setPointCloudClipY: (v: number) => void;
  pointCloudBrightness: number; // 0.1 – 3.0
  setPointCloudBrightness: (v: number) => void;
  pointCloudPointSize: number;  // 0.5 – 5.0
  setPointCloudPointSize: (v: number) => void;
  pointCloudFile: string;
  setPointCloudFile: (v: string) => void;
  pointCloudOriginY: number; // meters — which clip-Y maps to z=0 (botten)
  setPointCloudOriginY: (v: number) => void;
  pointCloudBoundsY: [number, number]; // [min, max] in raw meters
  setPointCloudBoundsY: (min: number, max: number) => void;
  /** Set level z from current clipY, auto-adjusting so botten=0 */
  setLevelFromClip: (name: LevelName) => void;
  /** Move clip plane to a level's position */
  setClipToLevel: (name: LevelName) => void;

  // ─── 2D HUD toggles ─────────────────────────────────────
  showLevels2D: boolean;
  setShowLevels2D: (v: boolean) => void;

  // ─── 3D guide planes ──────────────────────────────────────
  showGuidePlanes: boolean;
  setShowGuidePlanes: (v: boolean) => void;
  guidePlaneIsolate: boolean;
  setGuidePlaneIsolate: (v: boolean) => void;

  // ─── 2D viewBox (shared between SVG and Three.js) ──────
  cadViewBox: { x: number; y: number; w: number; h: number };
  setCadViewBox: (vb: { x: number; y: number; w: number; h: number }) => void;
}

// ─── Helper: resize segment geometry to match total panel module length ──
function resizeSegmentToFitPanels(state: ConfigState, segIndex: number) {
  const pts = state.guidePoints;
  if (segIndex < 0 || segIndex >= pts.length - 1) return;
  const edge = state.edgeConfigs[segIndex];
  if (!edge || edge.panels.length === 0) return;

  const totalModule = edge.panels.reduce(
    (sum, p) => sum + p.length + p.offsetLeft + p.offsetRight,
    0,
  );
  if (totalModule <= 0) return;

  const s = pts[segIndex];
  const e = pts[segIndex + 1];
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const currentLen = Math.sqrt(dx * dx + dy * dy);
  if (currentLen < 1e-10) return;

  const scale = totalModule / currentLen;
  pts[segIndex + 1] = {
    x: s.x + dx * scale,
    y: s.y + dy * scale,
  };
}

// ─── Helper: auto-generate panels for a single segment ──
function autoGenForSegment(state: ConfigState, i: number) {
  const pts = state.guidePoints;
  if (i < 0 || i >= pts.length - 1) return;
  const edge = state.edgeConfigs[i];
  if (!edge || edge.wallOrGlazingStatus === 'wall') return;
  if (edge.panels.length > 0) return; // already has panels

  const s = pts[i];
  const e = pts[i + 1];
  const edgeLength = Math.sqrt((e.x - s.x) ** 2 + (e.y - s.y) ** 2);
  if (edgeLength < 50) return; // too short

  let startAngle = 0;
  let endAngle = 0;
  if (i > 0) startAngle = angleBetweenSegments(pts[i - 1], pts[i], pts[i + 1]);
  if (i + 2 < pts.length) endAngle = angleBetweenSegments(pts[i], pts[i + 1], pts[i + 2]);

  const startWall = isConnectedToWall(state.edgeConfigs, i, 'start');
  const endWall = isConnectedToWall(state.edgeConfigs, i, 'end');

  if (state.freeGlassWidth) {
    edge.panels = evenDistributePanelsForEdge(edgeLength, startAngle, endAngle, startWall, endWall);
  } else {
    edge.panels = autoGeneratePanelsForEdge(edgeLength, startAngle, endAngle, startWall, endWall);
  }
}

// ─── Helper: ensure edgeConfigs array matches segment count ──
function syncEdgeConfigs(state: ConfigState) {
  const segCount = state.guidePoints.length > 1 ? state.guidePoints.length - 1 : 0;
  while (state.edgeConfigs.length < segCount) {
    state.edgeConfigs.push({ wallOrGlazingStatus: 'glazing', panels: [] });
  }
  if (state.edgeConfigs.length > segCount) {
    state.edgeConfigs.length = segCount;
  }
  // Clamp selection
  if (state.selectedSegmentIndex !== null && state.selectedSegmentIndex >= segCount) {
    state.selectedSegmentIndex = segCount > 0 ? segCount - 1 : null;
  }
  // Auto-generate panels for any edge that doesn't have them yet
  for (let i = 0; i < segCount; i++) {
    autoGenForSegment(state, i);
  }
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

    levelEditMode: false,
    setLevelEditMode: (v) =>
      set((state) => {
        state.levelEditMode = v;
      }),

    // Guideline polyline
    guidePoints: [],
    previewPoint: null,
    isDrawing: false,
    snapEnabled: true,
    snapAngle: true,
    freeGlassWidth: true,

    addPoint: (pt) =>
      set((state) => {
        const origin = state.guidePoints.length > 0
          ? state.guidePoints[state.guidePoints.length - 1]
          : null;
        const snapped = applySnap(pt, origin, state.snapAngle);
        state.guidePoints.push(snapped);
        syncEdgeConfigs(state);
      }),

    movePoint: (index, pt) =>
      set((state) => {
        if (index >= 0 && index < state.guidePoints.length) {
          state.guidePoints[index] = pt;
          const segCount = state.guidePoints.length - 1;
          if (index > 0 && index - 1 < segCount) {
            const edge = state.edgeConfigs[index - 1];
            if (edge && edge.wallOrGlazingStatus === 'glazing') {
              edge.panels = [];
              autoGenForSegment(state, index - 1);
            }
          }
          if (index < segCount) {
            const edge = state.edgeConfigs[index];
            if (edge && edge.wallOrGlazingStatus === 'glazing') {
              edge.panels = [];
              autoGenForSegment(state, index);
            }
          }
        }
      }),

    removePoint: (index) =>
      set((state) => {
        if (state.guidePoints.length > 2 && index >= 0 && index < state.guidePoints.length) {
          state.guidePoints.splice(index, 1);
          syncEdgeConfigs(state);
        }
      }),

    insertPointOnSegment: (segmentIndex, pt) =>
      set((state) => {
        if (segmentIndex >= 0 && segmentIndex < state.guidePoints.length - 1) {
          state.guidePoints.splice(segmentIndex + 1, 0, pt);
          // Insert a new edge config after the split segment
          const oldConfig = state.edgeConfigs[segmentIndex];
          state.edgeConfigs.splice(segmentIndex + 1, 0, {
            wallOrGlazingStatus: oldConfig?.wallOrGlazingStatus ?? 'glazing',
            panels: [],
          });
          syncEdgeConfigs(state);
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

        // Incoming direction: prev → curr
        const inDx = curr.x - prev.x;
        const inDy = curr.y - prev.y;
        const inAngle = Math.atan2(inDy, inDx);

        // Determine current winding via cross product
        const outDx = next.x - curr.x;
        const outDy = next.y - curr.y;
        const cross = inDx * outDy - inDy * outDx;

        // cross >= 0 means left turn, cross < 0 means right turn
        const newAngleRad = newAngle * (Math.PI / 180);
        const outAngle = cross >= 0
          ? inAngle + Math.PI - newAngleRad
          : inAngle - Math.PI + newAngleRad;

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
          state.previewPoint = pt ? applySnap(pt, origin, state.snapAngle) : null;
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
        syncEdgeConfigs(state);
      }),

    clearGuide: () =>
      set((state) => {
        state.guidePoints = [];
        state.isDrawing = false;
        state.previewPoint = null;
        state.edgeConfigs = [];
        state.selectedSegmentIndex = null;
      }),

    toggleSnap: () =>
      set((state) => {
        state.snapEnabled = !state.snapEnabled;
      }),

    toggleSnapAngle: () =>
      set((state) => {
        state.snapAngle = !state.snapAngle;
      }),

    toggleFreeGlassWidth: () =>
      set((state) => {
        state.freeGlassWidth = !state.freeGlassWidth;

        // Re-generate all glazing panels with the new mode
        const pts = state.guidePoints;
        const segCount = pts.length - 1;
        if (segCount < 1) return;

        syncEdgeConfigs(state);

        for (let i = 0; i < segCount; i++) {
          const edge = state.edgeConfigs[i];
          if (!edge || edge.wallOrGlazingStatus === 'wall') continue;

          const s = pts[i];
          const e = pts[i + 1];
          const edgeLength = Math.sqrt((e.x - s.x) ** 2 + (e.y - s.y) ** 2);
          if (edgeLength < 50) continue;

          let startAngle = 0;
          let endAngle = 0;
          if (i > 0) startAngle = angleBetweenSegments(pts[i - 1], pts[i], pts[i + 1]);
          if (i + 2 < pts.length) endAngle = angleBetweenSegments(pts[i], pts[i + 1], pts[i + 2]);

          const startWall = isConnectedToWall(state.edgeConfigs, i, 'start');
          const endWall = isConnectedToWall(state.edgeConfigs, i, 'end');

          if (state.freeGlassWidth) {
            edge.panels = evenDistributePanelsForEdge(edgeLength, startAngle, endAngle, startWall, endWall);
          } else {
            edge.panels = autoGeneratePanelsForEdge(edgeLength, startAngle, endAngle, startWall, endWall);
            resizeSegmentToFitPanels(state, i);
          }
        }
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
        if (mode !== 'draw-guide') {
          state.isDrawing = false;
          state.previewPoint = null;
        }
      }),

    activeView: '2d3d',
    setActiveView: (view) =>
      set((state) => {
        state.activeView = view;
      }),

    // ─── Project config ───────────────────────────────────────
    projectConfig: { ...DEFAULT_PROJECT_CONFIG },
    setProjectField: (key, value) =>
      set((state) => {
        (state.projectConfig as Record<string, unknown>)[key] = value;
      }),

    // ─── Profile config ───────────────────────────────────────
    profileConfig: { ...DEFAULT_PROFILE_CONFIG },
    setProfileField: (key, value) =>
      set((state) => {
        (state.profileConfig as Record<string, unknown>)[key] = value;
      }),

    // ─── Frame width settings ─────────────────────────────────
    frameWidthSettings: { ...DEFAULT_FRAME_WIDTH_SETTINGS },
    setFrameWidthField: (key, value) =>
      set((state) => {
        state.frameWidthSettings[key] = value;
      }),

    // ─── Segment selection ─────────────────────────────────────
    selectedSegmentIndex: null,
    setSelectedSegmentIndex: (index) => {
      set((state) => {
        state.selectedSegmentIndex = index;
        // Auto-expand segment + panels sections
        if (index !== null) {
          state.expandedSections.segment = true;
          state.expandedSections.panels = true;
          syncEdgeConfigs(state);
        }
      });
      // Auto-generate panels if edge is glazing and has no panels
      if (index !== null) {
        const s = get();
        const edge = s.edgeConfigs[index];
        if (edge && edge.wallOrGlazingStatus === 'glazing' && edge.panels.length === 0) {
          s.autoGeneratePanels(index);
        }
      }
    },

    // ─── Per-edge config ───────────────────────────────────────
    edgeConfigs: [],

    setEdgeWallOrGlazing: (segIndex, status) =>
      set((state) => {
        syncEdgeConfigs(state);
        if (segIndex >= 0 && segIndex < state.edgeConfigs.length) {
          state.edgeConfigs[segIndex].wallOrGlazingStatus = status;
          if (status === 'wall') {
            state.edgeConfigs[segIndex].panels = [];
          }
        }
      }),

    addPanel: (segIndex) =>
      set((state) => {
        syncEdgeConfigs(state);
        if (segIndex >= 0 && segIndex < state.edgeConfigs.length) {
          const panels = state.edgeConfigs[segIndex].panels;
          panels.push({
            name: `${panels.length + 1}`,
            length: 500,
            opening: '>' as OpeningDirection,
            lock: '-' as LockSymbol,
            offsetLeft: 0,
            offsetRight: 0,
          });
          resizeSegmentToFitPanels(state, segIndex);
        }
      }),

    removePanel: (segIndex, panelIndex) =>
      set((state) => {
        syncEdgeConfigs(state);
        if (segIndex >= 0 && segIndex < state.edgeConfigs.length) {
          const panels = state.edgeConfigs[segIndex].panels;
          if (panelIndex >= 0 && panelIndex < panels.length) {
            panels.splice(panelIndex, 1);
            panels.forEach((p, i) => { p.name = `${i + 1}`; });
          }
          resizeSegmentToFitPanels(state, segIndex);
        }
      }),

    updatePanelField: (segIndex, panelIndex, field, value) =>
      set((state) => {
        syncEdgeConfigs(state);
        if (segIndex >= 0 && segIndex < state.edgeConfigs.length) {
          const panels = state.edgeConfigs[segIndex].panels;
          if (panelIndex >= 0 && panelIndex < panels.length) {
            (panels[panelIndex] as Record<string, unknown>)[field] = value;
          }
          // Resize segment geometry when panel width changes
          if (field === 'length') {
            resizeSegmentToFitPanels(state, segIndex);
          }
        }
      }),

    autoGeneratePanels: (segIndex) =>
      set((state) => {
        syncEdgeConfigs(state);
        const pts = state.guidePoints;
        if (segIndex < 0 || segIndex >= pts.length - 1) return;
        const edge = state.edgeConfigs[segIndex];
        if (!edge || edge.wallOrGlazingStatus === 'wall') return;

        const start = pts[segIndex];
        const end = pts[segIndex + 1];
        const edgeLength = Math.sqrt(
          (end.x - start.x) ** 2 + (end.y - start.y) ** 2,
        );

        // Calculate angles
        let startAngle = 0;
        let endAngle = 0;
        if (segIndex > 0) {
          startAngle = angleBetweenSegments(pts[segIndex - 1], pts[segIndex], pts[segIndex + 1]);
        }
        if (segIndex + 2 < pts.length) {
          endAngle = angleBetweenSegments(pts[segIndex], pts[segIndex + 1], pts[segIndex + 2]);
        }

        // Wall connections
        const startWall = isConnectedToWall(state.edgeConfigs, segIndex, 'start');
        const endWall = isConnectedToWall(state.edgeConfigs, segIndex, 'end');

        // Use free or standard widths depending on toggle
        if (state.freeGlassWidth) {
          edge.panels = evenDistributePanelsForEdge(edgeLength, startAngle, endAngle, startWall, endWall);
        } else {
          edge.panels = autoGeneratePanelsForEdge(edgeLength, startAngle, endAngle, startWall, endWall);
          resizeSegmentToFitPanels(state, segIndex);
        }
      }),

    // ─── Computed edge data ─────────────────────────────────────
    getEdgeData: (segIndex: number) => {
      const state = get();
      // Frame height = Mellanstycke - Understycke
      const frameHeight =
        state.levels.levels.Mellanstycke.zPosition -
        state.levels.levels.Understycke.zPosition;
      return computeEdgeData(
        state.guidePoints,
        state.edgeConfigs,
        segIndex,
        frameHeight,
      );
    },

    // ─── Point cloud ──────────────────────────────────────────
    pointCloudEnabled: false,
    setPointCloudEnabled: (v) =>
      set((state) => { state.pointCloudEnabled = v; }),
    pointCloudClipY: 2.0,
    setPointCloudClipY: (v) =>
      set((state) => { state.pointCloudClipY = v; }),
    pointCloudBrightness: 1.0,
    setPointCloudBrightness: (v) =>
      set((state) => { state.pointCloudBrightness = v; }),
    pointCloudPointSize: 1.0,
    setPointCloudPointSize: (v) =>
      set((state) => { state.pointCloudPointSize = v; }),
    pointCloudFile: '/balkong.ply',
    setPointCloudFile: (v) =>
      set((state) => { state.pointCloudFile = v; }),
    pointCloudOriginY: 0,
    setPointCloudOriginY: (v) =>
      set((state) => { state.pointCloudOriginY = v; }),
    pointCloudBoundsY: [-3, 3] as [number, number],
    setPointCloudBoundsY: (min, max) =>
      set((state) => { state.pointCloudBoundsY = [min, max]; }),
    setLevelFromClip: (name) =>
      set((state) => {
        const clipYMeters = state.pointCloudClipY;
        if (name === 'Understycke') {
          // Botten → alltid 0. Sätt origin till aktuell clipY.
          const oldOrigin = state.pointCloudOriginY;
          const newOrigin = clipYMeters;
          // Justera andra nivåer med skillnaden
          const deltaMs = newOrigin - oldOrigin;
          const deltaMm = Math.round(deltaMs * 1000);
          state.levels.levels.Understycke.zPosition = 0;
          state.levels.levels.Mellanstycke.zPosition -= deltaMm;
          state.levels.levels.Overstycke.zPosition -= deltaMm;
          state.pointCloudOriginY = newOrigin;
          // Reset clip slider to origin (= 0 mm relativt)
          state.pointCloudClipY = newOrigin;
        } else {
          // Mellan/Överstycke → beräkna mm relativt origin
          const mm = Math.round((clipYMeters - state.pointCloudOriginY) * 1000);
          state.levels.levels[name].zPosition = mm;
        }
      }),
    setClipToLevel: (name) =>
      set((state) => {
        // Nivåns z i mm → konvertera till raw meters (+ originY)
        const zMm = state.levels.levels[name].zPosition;
        state.pointCloudClipY = state.pointCloudOriginY + zMm / 1000;
      }),

    // ─── 2D HUD toggles ─────────────────────────────────────
    showLevels2D: false,
    setShowLevels2D: (v) =>
      set((state) => { state.showLevels2D = v; }),

    // ─── 3D guide planes ──────────────────────────────────────
    showGuidePlanes: false,
    setShowGuidePlanes: (v) =>
      set((state) => { state.showGuidePlanes = v; }),
    guidePlaneIsolate: false,
    setGuidePlaneIsolate: (v) =>
      set((state) => { state.guidePlaneIsolate = v; }),

    // ─── 2D viewBox (shared between SVG and Three.js) ──────
    cadViewBox: { x: -3000, y: -3000, w: 6000, h: 6000 },
    setCadViewBox: (vb) =>
      set((state) => { state.cadViewBox = vb; }),

    // ─── Accordion UI ──────────────────────────────────────────
    expandedSections: { ...DEFAULT_EXPANDED_SECTIONS },
    toggleSection: (id) =>
      set((state) => {
        state.expandedSections[id] = !state.expandedSections[id];
      }),
  })),
);
