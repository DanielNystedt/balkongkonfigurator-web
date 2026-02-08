export type OpeningDirection = '>' | '<' | 'X'; // Right, Left, Fixed
export type LockSymbol = '|' | '||' | '-' | ''; // Single, Double, Dash, None

export type LockType =
  | '90 graderslock hane'
  | '90 graderslock hona'
  | 'Variabelt andlock'
  | 'Slutlock hane'
  | 'Slutlock hona'
  | 'Moteslock hane'
  | 'Moteslock hona'
  | 'Overlas dubbel'
  | 'Overlas'
  | 'Undre las dubbel'
  | 'Undre las'
  | 'D-Vanster'
  | 'D-Hoger'
  | 'Vridlas'
  | 'D-Vridlas'
  | null;

export interface Panel {
  name: string;
  length: number; // mm, panel width
  opening: OpeningDirection;
  lock: LockSymbol;
  offsetLeft: number; // mm
  offsetRight: number; // mm
}

export interface PanelFitting extends Panel {
  glassWidth: number; // mm
  glassHeight: number; // mm
  glassModuleHeight: number; // mm
  topLeft: LockType;
  topRight: LockType;
  bottomLeft: LockType;
  bottomRight: LockType;
  topLock: LockType;
  bottomLock: LockType;
  openingLabel: 'Vanster' | 'Hoger' | null;
  upperGlassProfileLength: number; // mm
  lowerGlassProfileLength: number; // mm
  sideNumber: number;
  pcComponents: {
    pc_h: number[];
    pc_hh: number[];
    pc_90gr: number[];
    pc_45gr: number[];
  };
}
