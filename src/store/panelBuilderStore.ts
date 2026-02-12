import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// ─── End cap types ─────────────────────────────────────────────────
// Each GLB file is a separate selectable variant.
// Left/right variants have their own GLB files.
export type EndCapType =
  | 'PL-160'    // 45° hona vänster
  | 'PL-170'    // 45° hona höger
  | 'PL-180'    // 45° hane vänster
  | 'PL-190'    // 45° hane höger
  | 'PL-200'    // Möteslock vänster (straight left)
  | 'PL-210'    // Möteslock höger (straight right)
  | 'PL-220'    // Variabelt ändlock
  | 'PL-220P02' // Variabelt ändlock P02
  | 'PL-230'    // Slutlock vänster
  | 'PL-240'    // Slutlock höger
  ;

export type LockVariant = 'single' | 'double' | 'none';

// ─── End cap info table ─────────────────────────────────────────────
interface EndCapInfo {
  label: string;
  glb: string;
  defaultGlassOffset: number;  // mm — how far the glass extends past the holder at this cap
}

export const END_CAP_INFO: Record<EndCapType, EndCapInfo> = {
  'PL-160': {
    label: 'PL-160 — 45° hona vänster',
    glb: '/models/Glasprofillock/PL-160 Window-End cap 45dgr female Left.glb',
    defaultGlassOffset: 11.5,
  },
  'PL-170': {
    label: 'PL-170 — 45° hona höger',
    glb: '/models/Glasprofillock/PL-170 Window-End cap 45dgr female Right.glb',
    defaultGlassOffset: 11.5,
  },
  'PL-180': {
    label: 'PL-180 — 45° hane vänster',
    glb: '/models/Glasprofillock/PL-180 Window-End cap 45dgr male Left.glb',
    defaultGlassOffset: 11.5,
  },
  'PL-190': {
    label: 'PL-190 — 45° hane höger',
    glb: '/models/Glasprofillock/PL-190 Window-End cap 45dgr male Right.glb',
    defaultGlassOffset: 11.5,
  },
  'PL-200': {
    label: 'PL-200 — Möteslock vänster',
    glb: '/models/Glasprofillock/PL-200 Window-End cap straight Left.glb',
    defaultGlassOffset: 5.0,
  },
  'PL-210': {
    label: 'PL-210 — Möteslock höger',
    glb: '/models/Glasprofillock/PL-210 Window-End cap straight Right.glb',
    defaultGlassOffset: 5.0,
  },
  'PL-220': {
    label: 'PL-220 — Variabelt ändlock',
    glb: '/models/Glasprofillock/PL-220 Window-End cap variable.glb',
    defaultGlassOffset: 7.9,
  },
  'PL-220P02': {
    label: 'PL-220 P02 — Variabelt ändlock',
    glb: '/models/Glasprofillock/PL-220 Window-End cap variable_P02.glb',
    defaultGlassOffset: 7.9,
  },
  'PL-230': {
    label: 'PL-230 — Slutlock vänster',
    glb: '/models/Glasprofillock/PL-230 Window-End cap Left.glb',
    defaultGlassOffset: 25.0,
  },
  'PL-240': {
    label: 'PL-240 — Slutlock höger',
    glb: '/models/Glasprofillock/PL-240 Window-End cap Right.glb',
    defaultGlassOffset: 25.0,
  },
};

// All end cap type keys
export const END_CAP_TYPES = Object.keys(END_CAP_INFO) as EndCapType[];

// ─── Default glass offsets derived from info table ──────────────────
function buildDefaultGlassOffsets(): Record<EndCapType, number> {
  const out = {} as Record<EndCapType, number>;
  for (const key of END_CAP_TYPES) {
    out[key] = END_CAP_INFO[key].defaultGlassOffset;
  }
  return out;
}
export const DEFAULT_GLASS_OFFSET = buildDefaultGlassOffsets();

// ─── Glass height constants (mm) ──────────────────────────────────
export const GLASS_HEIGHT_DEDUCTION = 210.3;
export const GLASS_MODULE_HEIGHT_DEDUCTION = 170.3;

// ─── Top/bottom lock deductions (mm) from Ruby 070_set_glas_attribute.rb ──
// Default top lock deductions
export const DEFAULT_TOP_LOCK_WIDTH: Record<LockVariant, number> = {
  single: 30.0,   // Överlås
  double: 30.0,   // Överlås dubbel
  none: 0,
};

// Re-export for backward compat
export const TOP_LOCK_WIDTH = DEFAULT_TOP_LOCK_WIDTH;

// Default bottom lock deductions (lock sits on lower rail)
export const DEFAULT_BOTTOM_LOCK_WIDTH: Record<LockVariant, number> = {
  single: 38.0,   // Undre lås
  double: 38.0,   // Undre lås dubbel
  none: 0,
};

// Re-export for backward compat
export const BOTTOM_LOCK_WIDTH = DEFAULT_BOTTOM_LOCK_WIDTH;

// ─── Part rotation (multiples of 90°) ────────────────────────────
// Each part has [rx, ry, rz] in units of 90° (0..3)
export type RotationSteps = [number, number, number];

export const PART_KEYS = [
  'profileTop',
  'profileBottom',
  'endCapTL',
  'endCapTR',
  'endCapBL',
  'endCapBR',
  'runningUnit',
  'mainLock',
] as const;

export type PartKey = (typeof PART_KEYS)[number];

export const PART_LABELS: Record<PartKey, string> = {
  profileTop: 'Profil Topp',
  profileBottom: 'Profil Bott',
  endCapTL: 'Ändlock TL',
  endCapTR: 'Ändlock TR',
  endCapBL: 'Ändlock BL',
  endCapBR: 'Ändlock BR',
  runningUnit: 'Löpenhet',
  mainLock: 'Huvudlås',
};

function defaultRotations(): Record<PartKey, RotationSteps> {
  return {
    profileTop: [3, 0, 3],
    profileBottom: [1, 0, 3],
    endCapTL: [3, 3, 1],
    endCapTR: [0, 1, 2],
    endCapBL: [1, 3, 1],
    endCapBR: [2, 1, 2],
    runningUnit: [3, 2, 3],
    mainLock: [0, 1, 0],
  };
}

// ─── Store interface ──────────────────────────────────────────────
interface PanelBuilderState {
  panelWidth: number;       // mm, the "module width" of the panel
  panelHeight: number;      // mm, total height (overstycke - mellanstycke)
  endCapLeftType: EndCapType;
  endCapRightType: EndCapType;
  lockType: LockVariant;

  // Editable offsets (mm)
  // glassOffsets: how much the glass extends past the holder at each cap type
  glassOffsets: Record<EndCapType, number>;
  topLockWidths: Record<LockVariant, number>;
  bottomLockWidths: Record<LockVariant, number>;
  glassHeightDeduction: number;
  glassModuleHeightDeduction: number;

  // Per-part rotations (in 90° steps: 0,1,2,3)
  partRotations: Record<PartKey, RotationSteps>;

  // Derived (computed on access)
  getGlassHeight: () => number;
  getGlassModuleHeight: () => number;
  getGlassWidth: () => number;
  getUpperProfileLength: () => number;
  getLowerProfileLength: () => number;

  // Setters
  setPanelWidth: (w: number) => void;
  setPanelHeight: (h: number) => void;
  setEndCapLeftType: (t: EndCapType) => void;
  setEndCapRightType: (t: EndCapType) => void;
  setLockType: (t: LockVariant) => void;

  // Offset setters
  setGlassOffset: (type: EndCapType, offset: number) => void;
  setTopLockWidth: (variant: LockVariant, width: number) => void;
  setBottomLockWidth: (variant: LockVariant, width: number) => void;
  setGlassHeightDeduction: (v: number) => void;
  setGlassModuleHeightDeduction: (v: number) => void;
  resetOffsetsToDefaults: () => void;

  // Rotation controls
  rotatePart: (part: PartKey, axis: 0 | 1 | 2, direction: 1 | -1) => void;
  getPartRotationRad: (part: PartKey) => [number, number, number];
  logAllRotations: () => void;
}

export const usePanelBuilderStore = create<PanelBuilderState>()(
  immer((set, get) => ({
    panelWidth: 600,
    panelHeight: 1700,
    endCapLeftType: 'PL-230',   // Slutlock vänster
    endCapRightType: 'PL-240',  // Slutlock höger
    lockType: 'single',

    // Editable offsets — initialized from defaults
    glassOffsets: { ...DEFAULT_GLASS_OFFSET },
    topLockWidths: { ...DEFAULT_TOP_LOCK_WIDTH },
    bottomLockWidths: { ...DEFAULT_BOTTOM_LOCK_WIDTH },
    glassHeightDeduction: GLASS_HEIGHT_DEDUCTION,
    glassModuleHeightDeduction: GLASS_MODULE_HEIGHT_DEDUCTION,

    partRotations: defaultRotations(),

    // ─── Derived values (use editable offsets) ────────────────
    getGlassHeight: () => {
      const s = get();
      return s.panelHeight - s.glassHeightDeduction;
    },
    getGlassModuleHeight: () => {
      const s = get();
      return s.panelHeight - s.glassModuleHeightDeduction;
    },
    getGlassWidth: () => {
      // Glass fills the full panel width
      return get().panelWidth;
    },
    getUpperProfileLength: () => {
      const s = get();
      // Upper profile: no lock — just glass offsets
      return s.panelWidth - s.glassOffsets[s.endCapLeftType] - s.glassOffsets[s.endCapRightType];
    },
    getLowerProfileLength: () => {
      const s = get();
      // Lower profile: glass offsets + lock deduction (lock sits on lower rail only)
      return s.panelWidth - s.glassOffsets[s.endCapLeftType] - s.glassOffsets[s.endCapRightType] - s.bottomLockWidths[s.lockType];
    },

    // ─── Setters ──────────────────────────────────────────────
    setPanelWidth: (w) => set((s) => { s.panelWidth = w; }),
    setPanelHeight: (h) => set((s) => { s.panelHeight = h; }),
    setEndCapLeftType: (t) => set((s) => { s.endCapLeftType = t; }),
    setEndCapRightType: (t) => set((s) => { s.endCapRightType = t; }),
    setLockType: (t) => set((s) => { s.lockType = t; }),

    // ─── Offset setters ──────────────────────────────────────
    setGlassOffset: (type, offset) => set((s) => { s.glassOffsets[type] = offset; }),
    setTopLockWidth: (variant, width) => set((s) => { s.topLockWidths[variant] = width; }),
    setBottomLockWidth: (variant, width) => set((s) => { s.bottomLockWidths[variant] = width; }),
    setGlassHeightDeduction: (v) => set((s) => { s.glassHeightDeduction = v; }),
    setGlassModuleHeightDeduction: (v) => set((s) => { s.glassModuleHeightDeduction = v; }),
    resetOffsetsToDefaults: () => set((s) => {
      s.glassOffsets = { ...DEFAULT_GLASS_OFFSET };
      s.topLockWidths = { ...DEFAULT_TOP_LOCK_WIDTH };
      s.bottomLockWidths = { ...DEFAULT_BOTTOM_LOCK_WIDTH };
      s.glassHeightDeduction = GLASS_HEIGHT_DEDUCTION;
      s.glassModuleHeightDeduction = GLASS_MODULE_HEIGHT_DEDUCTION;
    }),

    // ─── Rotation controls ──────────────────────────────────
    rotatePart: (part, axis, direction) =>
      set((s) => {
        s.partRotations[part][axis] = ((s.partRotations[part][axis] + direction) % 4 + 4) % 4;
      }),

    getPartRotationRad: (part) => {
      const steps = get().partRotations[part];
      const H = Math.PI / 2; // 90° in radians
      return [steps[0] * H, steps[1] * H, steps[2] * H];
    },

    logAllRotations: () => {
      const s = get();
      const log: Record<string, { steps: RotationSteps; degrees: [number, number, number] }> = {};
      for (const k of PART_KEYS) {
        const st = s.partRotations[k];
        log[k] = {
          steps: [...st] as RotationSteps,
          degrees: [st[0] * 90, st[1] * 90, st[2] * 90],
        };
      }
      console.log('═══ PANEL PART ROTATIONS ═══');
      console.log(JSON.stringify(log, null, 2));
      console.log('═══ Copy-paste for hardcoding: ═══');
      console.log(JSON.stringify(s.partRotations));
    },
  })),
);
