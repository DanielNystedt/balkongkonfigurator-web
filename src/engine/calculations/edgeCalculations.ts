/**
 * Edge calculation engine — ported from Ruby SketchUp plugin.
 *
 * Sources:
 *   030_Config_glazing.rb  — offset calculations, panel auto-generation
 *   060_screw_and_guide.rb — cut lengths, miter offsets, wall detection
 *   070_set_glas_attribute.rb — lock/fitting assignment
 */

import type { Point2D } from '../../types/geometry';
import type { Panel, OpeningDirection, LockSymbol, LockType } from '../../types/panel';
import type { EdgeConfig } from '../../types/edge';
import {
  INTERPOLATION_ANGLES,
  WALL_OFFSETS,
  GLAZING_OFFSETS,
  MITER_DISTANCE_OVERSKENA,
  MITER_DISTANCE_OVERHALLARE,
  MITER_DISTANCE_COVERPROFILE,
  COVER_PROFILE_WALL_OFFSET,
  MAX_PANEL_WIDTH,
  STANDARD_PANEL_SIZES,
  FREE_WIDTH_THRESHOLD,
  COMBO_TOLERANCE,
  PANEL_STEP,
  MIN_PANEL_WIDTH,
  MIDDLE_PANEL_OFFSET,
  PASSRUTA_PANEL_OFFSET,
  DEFAULT_OFFSET_ANGLE_ZERO,
  DEFAULT_OFFSET_WALL_90,
  POSITIVE_ANGLE_FACTOR,
  NEGATIVE_ANGLE_FACTOR,
  OFFSET_ADDEND,
  LOCK_WIDTHS,
  GLASS_HEIGHT_OFFSET,
  GLASS_MODULE_HEIGHT_OFFSET,
} from '../../utils/constants';
import { interpolateFromTable } from '../../utils/math';
import { angleBetweenSegments } from '../geometry/offsetChain';

// ─── Types ───────────────────────────────────────────────────

export interface OffsetResult {
  /** Total offset at this end (mm) */
  offset: number;
  /** Profile offset value (mm) */
  profileOffset: number;
}

export interface CutLengths {
  underskena: number;
  overskena: number;
  overhallare: number;
  coverprofile: number;
}

export interface PanelFittingResult {
  topLeft: LockType;
  topRight: LockType;
  bottomLeft: LockType;
  bottomRight: LockType;
  topLock: LockType;
  bottomLock: LockType;
  glassWidth: number;
  offsetLeft: number;
  offsetRight: number;
}

export interface ComputedEdgeData {
  sideNumber: number;
  edgeLength: number;
  startAngle: number;
  endAngle: number;
  startConnectedToWall: boolean;
  endConnectedToWall: boolean;
  profileOffsetLeft: number;
  profileOffsetRight: number;
  totalModuleLength: number;
  spelGuide: number;
  cutLengths: CutLengths;
  panelFittings: PanelFittingResult[];
}

// ─── Offset calculation ──────────────────────────────────────
// Port of calculateOffset() from 030_Config_glazing.rb lines 287-333

export function calculateOffset(
  angle: number,
  isConnectedToWall: boolean,
): OffsetResult {
  // angle = 0: straight edge or connected to wall
  if (angle === 0) {
    return { offset: DEFAULT_OFFSET_ANGLE_ZERO, profileOffset: 0 };
  }

  // ~90° wall connection
  if (isConnectedToWall && Math.abs(angle) >= 88 && Math.abs(angle) <= 99) {
    return { offset: DEFAULT_OFFSET_WALL_90, profileOffset: -45 };
  }

  // Wide angles with wall — use interpolation table
  if (isConnectedToWall && Math.abs(angle) > 99 && Math.abs(angle) <= 157) {
    const absAngle = Math.abs(angle);
    // Interpolation: angles table goes from 145→90, input is actual angle
    const wallOffset = interpolateFromTable(absAngle, INTERPOLATION_ANGLES, WALL_OFFSETS);
    const glazingOffset = interpolateFromTable(absAngle, INTERPOLATION_ANGLES, GLAZING_OFFSETS);
    const offset = 50.5 + 10 - glazingOffset - 4;
    const profileOff = -10 + glazingOffset - 4;
    return { offset, profileOffset: profileOff };
  }

  // Positive angle (glazing-to-glazing)
  if (angle > 0) {
    const halfAngle = (180 - angle) / 2;
    const rad = (Math.PI / 180) * halfAngle;
    const offset = Math.tan(rad) * POSITIVE_ANGLE_FACTOR + OFFSET_ADDEND;
    return { offset, profileOffset: 0 };
  }

  // Negative angle
  const halfAngle = (180 - angle) / 2;
  const rad = (Math.PI / 180) * halfAngle;
  const offset = Math.tan(rad) * NEGATIVE_ANGLE_FACTOR + OFFSET_ADDEND;
  return { offset, profileOffset: 0 };
}

// ─── Miter offset ────────────────────────────────────────────
// Port of offset_due_to_miter() from 060_screw_and_guide.rb lines 74-90

export function offsetDueToMiter(distance: number, angleDegrees: number): number {
  if (angleDegrees === 0) return 0;
  const modifiedAngle = (180 - angleDegrees) / 2;
  const rad = (modifiedAngle * Math.PI) / 180;
  return distance * Math.tan(rad);
}

// ─── Cut length calculations ─────────────────────────────────
// Port from 030_Config_glazing.rb lines 795-808

export function calculateCutLengths(
  totalLength: number,
  profileOffsetLeft: number,
  profileOffsetRight: number,
  startAngle: number,
  endAngle: number,
): CutLengths {
  const underskena = totalLength + profileOffsetLeft + profileOffsetRight;

  const overskena =
    underskena +
    offsetDueToMiter(MITER_DISTANCE_OVERSKENA, startAngle) +
    offsetDueToMiter(MITER_DISTANCE_OVERSKENA, endAngle);

  const overhallare =
    underskena +
    offsetDueToMiter(MITER_DISTANCE_OVERHALLARE, startAngle) +
    offsetDueToMiter(MITER_DISTANCE_OVERHALLARE, endAngle);

  let coverProfileOffset = 0;
  if (startAngle === 0) coverProfileOffset += COVER_PROFILE_WALL_OFFSET;
  if (endAngle === 0) coverProfileOffset += COVER_PROFILE_WALL_OFFSET;

  const coverprofile =
    underskena +
    offsetDueToMiter(MITER_DISTANCE_COVERPROFILE, startAngle) +
    offsetDueToMiter(MITER_DISTANCE_COVERPROFILE, endAngle) +
    coverProfileOffset;

  return { underskena, overskena, overhallare, coverprofile };
}

// ─── Panel auto-generation ───────────────────────────────────
// Smart algorithm ported from 275_Multi_Guide_HTML.rb lines 898-1094
// Uses standard sizes (430-700 in steps of 30) and mixes two sizes for best fit.

export function autoGeneratePanelsForEdge(
  edgeLength: number,
  startAngle: number,
  endAngle: number,
  startConnectedToWall: boolean,
  endConnectedToWall: boolean,
): Panel[] {
  const leftResult = calculateOffset(startAngle, startConnectedToWall);
  const rightResult = calculateOffset(endAngle, endConnectedToWall);
  const leftOffset = leftResult.offset;
  const rightOffset = rightResult.offset;

  // Step 1: Available length for glass panels
  const availableLength = edgeLength - leftOffset - rightOffset;
  if (availableLength < 50) {
    return [{
      name: '1',
      length: Math.max(100, Math.round(availableLength)),
      opening: '>' as OpeningDirection,
      lock: '-' as LockSymbol,
      offsetLeft: Math.round(leftOffset * 10) / 10,
      offsetRight: Math.round(rightOffset * 10) / 10,
    }];
  }

  // Step 2: Number of panels
  const numPanels = Math.max(1, Math.ceil(availableLength / MAX_PANEL_WIDTH));

  // Step 3: Between-panel offsets (2mm per side × 2 sides = 4mm per gap)
  const betweenPanelOffsets = (numPanels - 1) * MIDDLE_PANEL_OFFSET * 2;

  // Step 4: Available length for actual glass
  const availableForGlass = availableLength - betweenPanelOffsets;

  // Step 5: Average panel length
  const avgLength = availableForGlass / numPanels;

  // Step 6: Single panel — use exact width (rounded to nearest 30)
  if (numPanels === 1) {
    const snapped = snapToStandardSize(avgLength);
    return [{
      name: '1',
      length: snapped,
      opening: '>' as OpeningDirection,
      lock: '-' as LockSymbol,
      offsetLeft: Math.round(leftOffset * 10) / 10,
      offsetRight: Math.round(rightOffset * 10) / 10,
    }];
  }

  // Step 7: If average is below threshold, use free width (equal non-standard)
  if (avgLength < FREE_WIDTH_THRESHOLD) {
    return buildPanels(numPanels, Math.round(avgLength), Math.round(avgLength), 0, numPanels, leftOffset, rightOffset);
  }

  // Step 8: Find base size — smallest standard size >= avgLength
  let baseSize = STANDARD_PANEL_SIZES.find(s => s >= avgLength);
  if (!baseSize) baseSize = MAX_PANEL_WIDTH;

  // Step 9: Smaller size = baseSize - 30 (min MIN_PANEL_WIDTH)
  const smallerSize = Math.max(MIN_PANEL_WIDTH, baseSize - PANEL_STEP);

  // Step 10: Find best combo of numLarge × baseSize + numSmall × smallerSize
  let bestLarge = numPanels;
  let bestSmall = 0;
  let bestDiff = Infinity;
  let bestValid = false;

  for (let nLarge = 0; nLarge <= numPanels; nLarge++) {
    const nSmall = numPanels - nLarge;
    const totalGlass = nLarge * baseSize + nSmall * smallerSize;
    const diff = totalGlass - availableForGlass;

    // Allow exceeding by up to COMBO_TOLERANCE
    const valid = diff >= -COMBO_TOLERANCE;
    const absDiff = Math.abs(diff);

    if (valid && (!bestValid || absDiff < bestDiff)) {
      bestLarge = nLarge;
      bestSmall = nSmall;
      bestDiff = absDiff;
      bestValid = true;
    } else if (!bestValid && absDiff < bestDiff) {
      bestLarge = nLarge;
      bestSmall = nSmall;
      bestDiff = absDiff;
    }
  }

  // Step 11: If no valid combo found, fall back to free width
  if (!bestValid) {
    const equalSize = Math.round(avgLength);
    return buildPanels(numPanels, equalSize, equalSize, 0, numPanels, leftOffset, rightOffset);
  }

  // Step 12: Build panels — smaller panels first, then larger (default > direction)
  return buildPanels(numPanels, baseSize, smallerSize, bestLarge, bestSmall, leftOffset, rightOffset);
}

/**
 * Build panel array with mixed sizes.
 * Ordering: smaller panels first, then larger (suitable for > direction).
 */
function buildPanels(
  total: number,
  largeSize: number,
  smallSize: number,
  numLarge: number,
  numSmall: number,
  leftOffset: number,
  rightOffset: number,
): Panel[] {
  const panels: Panel[] = [];
  // Smaller panels first, then larger panels
  for (let i = 0; i < total; i++) {
    const isLarge = i >= numSmall; // first numSmall are small, rest are large
    const panelWidth = isLarge ? largeSize : smallSize;

    const oLeft = i === 0
      ? Math.round(leftOffset * 10) / 10
      : MIDDLE_PANEL_OFFSET;
    const oRight = i === total - 1
      ? Math.round(rightOffset * 10) / 10
      : MIDDLE_PANEL_OFFSET;

    panels.push({
      name: `${i + 1}`,
      length: Math.max(MIN_PANEL_WIDTH, panelWidth),
      opening: '>' as OpeningDirection,
      lock: '-' as LockSymbol,
      offsetLeft: oLeft,
      offsetRight: oRight,
    });
  }

  // Auto-assign locks: first left-opening gets |, last right-opening gets |
  autoAssignLocks(panels);

  return panels;
}

/**
 * Snap a width to the nearest standard size (30mm steps, 430-700).
 * If below MIN_PANEL_WIDTH, returns the raw rounded value.
 */
function snapToStandardSize(width: number): number {
  if (width < MIN_PANEL_WIDTH) return Math.max(100, Math.round(width));
  // Find closest standard size
  let best = STANDARD_PANEL_SIZES[0];
  let bestDiff = Math.abs(width - best);
  for (const s of STANDARD_PANEL_SIZES) {
    const d = Math.abs(width - s);
    if (d < bestDiff) { bestDiff = d; best = s; }
  }
  return best;
}

/**
 * Auto-assign locks based on opening directions.
 * Port of updateLocks() from 275_Multi_Guide_HTML.rb lines 1153-1185:
 * - First left-opening (<) panel gets single lock |
 * - Last right-opening (>) panel gets single lock |
 */
function autoAssignLocks(panels: Panel[]): void {
  // Reset all locks
  for (const p of panels) {
    if (p.lock !== '||') p.lock = '-'; // preserve double locks
  }
  // Find first left-opening and last right-opening
  const firstLeft = panels.findIndex(p => p.opening === '<');
  const lastRight = findLastIndex(panels, p => p.opening === '>');
  if (firstLeft !== -1 && panels[firstLeft].lock !== '||') panels[firstLeft].lock = '|';
  if (lastRight !== -1 && panels[lastRight].lock !== '||') panels[lastRight].lock = '|';
}

function findLastIndex<T>(arr: T[], pred: (v: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (pred(arr[i])) return i;
  }
  return -1;
}

// ─── Update offsets on existing panels ───────────────────────
// Port of updateOffsets() from 030_Config_glazing.rb lines 228-250
// With passruta (fixed glass) offset from 275_Multi_Guide_HTML.rb lines 640-684

/** Get between-panel offset considering passruta (fixed glass) */
function betweenPanelOffset(panels: Panel[], index: number, side: 'left' | 'right'): number {
  if (side === 'left' && index > 0) {
    const prev = panels[index - 1];
    const curr = panels[index];
    // If transition between fixed and opening, use larger offset
    if (prev.opening === 'X' || curr.opening === 'X') return PASSRUTA_PANEL_OFFSET;
    return MIDDLE_PANEL_OFFSET;
  }
  if (side === 'right' && index < panels.length - 1) {
    const curr = panels[index];
    const next = panels[index + 1];
    if (curr.opening === 'X' || next.opening === 'X') return PASSRUTA_PANEL_OFFSET;
    return MIDDLE_PANEL_OFFSET;
  }
  return 0; // first left / last right — handled by edge offset
}

export function recalcPanelOffsets(
  panels: Panel[],
  startAngle: number,
  endAngle: number,
  startConnectedToWall: boolean,
  endConnectedToWall: boolean,
): Panel[] {
  if (panels.length === 0) return panels;

  const leftResult = calculateOffset(startAngle, startConnectedToWall);
  const rightResult = calculateOffset(endAngle, endConnectedToWall);

  return panels.map((p, i) => ({
    ...p,
    offsetLeft:
      i === 0
        ? Math.round(leftResult.offset * 10) / 10
        : betweenPanelOffset(panels, i, 'left'),
    offsetRight:
      i === panels.length - 1
        ? Math.round(rightResult.offset * 10) / 10
        : betweenPanelOffset(panels, i, 'right'),
  }));
}

// ─── Lock/fitting assignment ─────────────────────────────────
// Port of set_panel_fittings_attribute() from 070_set_glas_attribute.rb

function determineLockAtEdge(angle: number): LockType {
  if (angle === 0) return 'Slutlock hona';
  if (Math.abs(angle) > 86 && Math.abs(angle) < 94) return '90 graderslock hona';
  return 'Variabelt andlock';
}

function determineLockAtEdgeEnd(angle: number): LockType {
  if (angle === 0) return 'Slutlock hane';
  if (Math.abs(angle) > 86 && Math.abs(angle) < 94) return '90 graderslock hane';
  return 'Variabelt andlock';
}

export function calculatePanelFittings(
  panels: Panel[],
  startAngle: number,
  endAngle: number,
  frameHeight: number,
): PanelFittingResult[] {
  if (panels.length === 0) return [];

  // Count opening directions
  const leftCount = panels.filter((p) => p.opening === '<').length;
  const rightCount = panels.filter((p) => p.opening === '>').length;

  return panels.map((panel, i) => {
    const isFirst = i === 0;
    const isLast = i === panels.length - 1;

    // ── Determine corner locks ──
    let topLeft: LockType = 'Moteslock hona';
    let bottomLeft: LockType = 'Moteslock hona';
    let topRight: LockType = 'Moteslock hane';
    let bottomRight: LockType = 'Moteslock hane';

    if (isFirst) {
      topLeft = bottomLeft = determineLockAtEdge(startAngle);
    }
    if (isLast) {
      topRight = bottomRight = determineLockAtEdgeEnd(endAngle);
    }

    // ── Fixed glass override ──
    // Transition between fixed (X) and opening panels → variable lock
    if (i > 0) {
      const prev = panels[i - 1];
      if (
        prev.opening === 'X' ||
        (panel.opening === 'X' && prev.opening !== 'X')
      ) {
        topLeft = bottomLeft = 'Variabelt andlock';
      }
    }
    if (i < panels.length - 1) {
      const next = panels[i + 1];
      if (
        next.opening === 'X' ||
        (panel.opening === 'X' && next.opening !== 'X')
      ) {
        topRight = bottomRight = 'Variabelt andlock';
      }
    }

    // ── Panel lock type ──
    let topLock: LockType = null;
    let bottomLock: LockType = null;

    if (panel.lock === '||') {
      topLock = 'Overlas dubbel';
      bottomLock = 'Vridlas';
    } else if (panel.lock === '|') {
      topLock = 'Overlas';
      bottomLock = 'Vridlas';
    }

    // ── Opening direction D-locks ──
    if (panel.opening === '<' && leftCount === 1) {
      topLock = 'D-Vanster';
      bottomLock = 'D-Vridlas';
    } else if (panel.opening === '>' && rightCount === 1) {
      topLock = 'D-Hoger';
      bottomLock = 'D-Vridlas';
    }

    // ── Glass width (panel length minus lock widths) ──
    const lockWidthLeft = topLeft ? (LOCK_WIDTHS[topLeft] ?? 0) : 0;
    const lockWidthRight = topRight ? (LOCK_WIDTHS[topRight] ?? 0) : 0;
    const glassWidth = panel.length - lockWidthLeft - lockWidthRight;

    return {
      topLeft,
      topRight,
      bottomLeft,
      bottomRight,
      topLock,
      bottomLock,
      glassWidth: Math.round(glassWidth * 10) / 10,
      offsetLeft: panel.offsetLeft,
      offsetRight: panel.offsetRight,
    };
  });
}

// ─── Wall connection detection ───────────────────────────────
// Port from 060_screw_and_guide.rb is_connected_to_wall()
// In the web app, we check if the adjacent edge is marked as 'wall'

export function isConnectedToWall(
  edgeConfigs: EdgeConfig[],
  segIndex: number,
  side: 'start' | 'end',
): boolean {
  if (side === 'start' && segIndex > 0) {
    return edgeConfigs[segIndex - 1]?.wallOrGlazingStatus === 'wall';
  }
  if (side === 'end' && segIndex < edgeConfigs.length - 1) {
    return edgeConfigs[segIndex + 1]?.wallOrGlazingStatus === 'wall';
  }
  // First/last segments: no adjacent edge = treat like wall connection
  return false;
}

// ─── Compute all data for a segment ──────────────────────────

export function computeEdgeData(
  guidePoints: Point2D[],
  edgeConfigs: EdgeConfig[],
  segIndex: number,
  frameHeight: number,
): ComputedEdgeData | null {
  if (segIndex < 0 || segIndex >= guidePoints.length - 1) return null;

  const start = guidePoints[segIndex];
  const end = guidePoints[segIndex + 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const edgeLength = Math.sqrt(dx * dx + dy * dy);

  // Side number (1-based index in chain)
  const sideNumber = segIndex + 1;

  // Angles at vertices
  let startAngle = 0;
  let endAngle = 0;
  if (segIndex > 0) {
    startAngle = angleBetweenSegments(
      guidePoints[segIndex - 1],
      guidePoints[segIndex],
      guidePoints[segIndex + 1],
    );
  }
  if (segIndex + 2 < guidePoints.length) {
    endAngle = angleBetweenSegments(
      guidePoints[segIndex],
      guidePoints[segIndex + 1],
      guidePoints[segIndex + 2],
    );
  }

  // Wall connections
  const startConnectedToWall = isConnectedToWall(edgeConfigs, segIndex, 'start');
  const endConnectedToWall = isConnectedToWall(edgeConfigs, segIndex, 'end');

  // Offsets
  const leftResult = calculateOffset(startAngle, startConnectedToWall);
  const rightResult = calculateOffset(endAngle, endConnectedToWall);

  // Panel fittings
  const edge = edgeConfigs[segIndex];
  const panels = edge?.panels ?? [];
  const panelFittings = edge?.wallOrGlazingStatus === 'wall'
    ? []
    : calculatePanelFittings(panels, startAngle, endAngle, frameHeight);

  // Total module length (sum of panel widths + offsets)
  const totalModuleLength = panels.reduce(
    (sum, p) => sum + p.length + p.offsetLeft + p.offsetRight,
    0,
  );
  const spelGuide = Math.round((edgeLength - totalModuleLength) * 10) / 10;

  // Cut lengths
  const cutLengths = calculateCutLengths(
    edgeLength,
    leftResult.profileOffset,
    rightResult.profileOffset,
    startAngle,
    endAngle,
  );

  return {
    sideNumber,
    edgeLength: Math.round(edgeLength * 10) / 10,
    startAngle: Math.round(startAngle * 10) / 10,
    endAngle: Math.round(endAngle * 10) / 10,
    startConnectedToWall,
    endConnectedToWall,
    profileOffsetLeft: Math.round(leftResult.profileOffset * 10) / 10,
    profileOffsetRight: Math.round(rightResult.profileOffset * 10) / 10,
    totalModuleLength: Math.round(totalModuleLength * 10) / 10,
    spelGuide,
    cutLengths: {
      underskena: Math.round(cutLengths.underskena * 10) / 10,
      overskena: Math.round(cutLengths.overskena * 10) / 10,
      overhallare: Math.round(cutLengths.overhallare * 10) / 10,
      coverprofile: Math.round(cutLengths.coverprofile * 10) / 10,
    },
    panelFittings,
  };
}
