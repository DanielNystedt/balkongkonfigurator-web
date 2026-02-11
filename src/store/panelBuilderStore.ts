import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// ─── End cap types ─────────────────────────────────────────────────
export type EndCapType = 'straight' | '45deg' | 'variable' | 'meeting';
export type LockVariant = 'single' | 'double' | 'none';

// ─── End cap widths (mm) from Ruby 070_set_glas_attribute.rb ───────
export const END_CAP_WIDTH: Record<EndCapType, number> = {
  straight: 25.0,
  '45deg': 11.5,
  variable: 7.9,
  meeting: 5.0,
};

// ─── GLB file mapping per end cap type ────────────────────────────
export const END_CAP_GLB: Record<EndCapType, { left: string; right: string }> = {
  straight: {
    left: '/models/Glasprofillock/PL-200 Window-End cap straight Left.glb',
    right: '/models/Glasprofillock/PL-210 Window-End cap straight Right.glb',
  },
  '45deg': {
    left: '/models/Glasprofillock/PL-180 Window-End cap 45dgr male Left.glb',
    right: '/models/Glasprofillock/PL-190 Window-End cap 45dgr male Right.glb',
  },
  variable: {
    left: '/models/Glasprofillock/PL-220 Window-End cap variable.glb',
    right: '/models/Glasprofillock/PL-220 Window-End cap variable.glb',
  },
  meeting: {
    left: '/models/Glasprofillock/PL-230 Window-End cap Left.glb',
    right: '/models/Glasprofillock/PL-240 Window-End cap Right.glb',
  },
};

// ─── Glass height constants (mm) ──────────────────────────────────
export const GLASS_HEIGHT_DEDUCTION = 210.3;
export const GLASS_MODULE_HEIGHT_DEDUCTION = 170.3;

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

  // Rotation controls
  rotatePart: (part: PartKey, axis: 0 | 1 | 2, direction: 1 | -1) => void;
  getPartRotationRad: (part: PartKey) => [number, number, number];
  logAllRotations: () => void;
}

export const usePanelBuilderStore = create<PanelBuilderState>()(
  immer((set, get) => ({
    panelWidth: 600,
    panelHeight: 1700,
    endCapLeftType: 'straight',
    endCapRightType: 'straight',
    lockType: 'single',
    partRotations: defaultRotations(),

    // ─── Derived values ──────────────────────────────────────
    getGlassHeight: () => get().panelHeight - GLASS_HEIGHT_DEDUCTION,
    getGlassModuleHeight: () => get().panelHeight - GLASS_MODULE_HEIGHT_DEDUCTION,
    getGlassWidth: () => {
      const s = get();
      return s.panelWidth - END_CAP_WIDTH[s.endCapLeftType] - END_CAP_WIDTH[s.endCapRightType];
    },
    getUpperProfileLength: () => {
      const s = get();
      return s.panelWidth - END_CAP_WIDTH[s.endCapLeftType] - END_CAP_WIDTH[s.endCapRightType];
    },
    getLowerProfileLength: () => {
      const s = get();
      return s.panelWidth - END_CAP_WIDTH[s.endCapLeftType] - END_CAP_WIDTH[s.endCapRightType];
    },

    // ─── Setters ──────────────────────────────────────────────
    setPanelWidth: (w) => set((s) => { s.panelWidth = w; }),
    setPanelHeight: (h) => set((s) => { s.panelHeight = h; }),
    setEndCapLeftType: (t) => set((s) => { s.endCapLeftType = t; }),
    setEndCapRightType: (t) => set((s) => { s.endCapRightType = t; }),
    setLockType: (t) => set((s) => { s.lockType = t; }),

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
