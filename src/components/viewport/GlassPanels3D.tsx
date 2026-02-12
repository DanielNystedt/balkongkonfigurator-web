/**
 * GlassPanels3D — renders real glass panel assemblies along guideline segments.
 *
 * Uses GLB models for glass holder profiles, end caps, and locks —
 * the same models as the panel builder but driven by guideline/edge data.
 */

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useConfigStore } from '../../store/useConfigStore';
import type { Point2D } from '../../types/geometry';
import type { LockType } from '../../types/panel';
import {
  END_CAP_INFO,
  END_CAP_TYPES,
  type EndCapType,
  DEFAULT_GLASS_OFFSET,
  DEFAULT_BOTTOM_LOCK_WIDTH,
} from '../../store/panelBuilderStore';
import {
  GLASS_HEIGHT_OFFSET,
  GLASS_MODULE_HEIGHT_OFFSET,
} from '../../utils/constants';
import {
  computeEdgeData,
  type PanelFittingResult,
} from '../../engine/calculations/edgeCalculations';

// ─── Map LockType → EndCapType (PL-number) ─────────────────────
// Left side caps
function lockTypeToEndCapLeft(lockType: LockType): EndCapType {
  switch (lockType) {
    case 'Slutlock hona':      return 'PL-230';
    case 'Slutlock hane':      return 'PL-230';
    case '90 graderslock hona': return 'PL-160';
    case '90 graderslock hane': return 'PL-180';
    case 'Variabelt andlock':  return 'PL-220';
    case 'Moteslock hona':     return 'PL-200';
    case 'Moteslock hane':     return 'PL-200';
    default:                   return 'PL-200'; // fallback: möteslock
  }
}

// Right side caps
function lockTypeToEndCapRight(lockType: LockType): EndCapType {
  switch (lockType) {
    case 'Slutlock hona':      return 'PL-240';
    case 'Slutlock hane':      return 'PL-240';
    case '90 graderslock hona': return 'PL-170';
    case '90 graderslock hane': return 'PL-190';
    case 'Variabelt andlock':  return 'PL-220';
    case 'Moteslock hona':     return 'PL-210';
    case 'Moteslock hane':     return 'PL-210';
    default:                   return 'PL-210'; // fallback: möteslock
  }
}

// ─── Types ──────────────────────────────────────────────────────
interface PositionedPanel {
  centerAlongSegment: number; // mm from segment start
  panelWidth: number;         // mm
  index: number;
  fitting: PanelFittingResult;
  hasLock: boolean;
}

interface SegmentPanelGroup {
  segIndex: number;
  start: Point2D;
  end: Point2D;
  frameHeight: number; // mm
  panels: PositionedPanel[];
}

// ─── Part rotations (same as defaultRotations in panelBuilderStore) ──
// Each value is rotation steps × 90° (π/2 radians)
const H = Math.PI / 2;
const PART_ROT = {
  profileTop:    [3 * H, 0 * H, 3 * H] as [number, number, number],
  profileBottom: [1 * H, 0 * H, 3 * H] as [number, number, number],
  endCapTL:      [3 * H, 3 * H, 1 * H] as [number, number, number],
  endCapTR:      [0 * H, 1 * H, 2 * H] as [number, number, number],
  endCapBL:      [1 * H, 3 * H, 1 * H] as [number, number, number],
  endCapBR:      [2 * H, 1 * H, 2 * H] as [number, number, number],
  mainLock:      [0 * H, 1 * H, 0 * H] as [number, number, number],
};

// ─── Helpers ────────────────────────────────────────────────────
function toThreeXZ(p: Point2D): [number, number] {
  return [p.x / 1000, -p.y / 1000];
}

// ─── Reusable aluminium material ────────────────────────────────
const aluminiumMat = new THREE.MeshStandardMaterial({
  color: '#e8e8e8',
  metalness: 0.5,
  roughness: 0.3,
  side: THREE.DoubleSide,
});

const darkMat = new THREE.MeshStandardMaterial({
  color: '#808080',
  metalness: 0.7,
  roughness: 0.2,
});

// ─── Glass pane ─────────────────────────────────────────────────
function GlassPane({ width, height }: { width: number; height: number }) {
  const w = width / 1000;
  const h = height / 1000;
  return (
    <mesh>
      <boxGeometry args={[w, h, 0.006]} />
      <meshStandardMaterial
        color="#88ccee"
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Glass holder profile (GLB scaled to length) ────────────────
function GlassHolderProfile({
  profileLength,
  positionX,
  positionY,
  rotation,
}: {
  profileLength: number; // mm
  positionX: number;     // meters
  positionY: number;     // meters
  rotation: [number, number, number];
}) {
  const { scene } = useGLTF('/models/Glashållare_10mm.glb');

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3();
    box.getSize(size);

    const targetM = profileLength / 1000;
    if (size.x >= size.y && size.x >= size.z) {
      c.scale.set(targetM / size.x, 1, 1);
    } else if (size.y >= size.x && size.y >= size.z) {
      c.scale.set(1, targetM / size.y, 1);
    } else {
      c.scale.set(1, 1, targetM / size.z);
    }

    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = aluminiumMat;
      }
    });
    return c;
  }, [scene, profileLength]);

  return (
    <group position={[positionX, positionY, 0]}>
      <group rotation={rotation}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

// ─── End cap (GLB) ──────────────────────────────────────────────
function EndCap({
  glbPath,
  positionX,
  positionY,
  rotation,
}: {
  glbPath: string;
  positionX: number;
  positionY: number;
  rotation: [number, number, number];
}) {
  const { scene } = useGLTF(glbPath);

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = darkMat;
      }
    });
    return c;
  }, [scene]);

  return (
    <group position={[positionX, positionY, 0]}>
      <group rotation={rotation}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

// ─── Main lock (GLB) ────────────────────────────────────────────
function MainLock({
  positionX,
  positionY,
}: {
  positionX: number;
  positionY: number;
}) {
  const { scene } = useGLTF('/models/Huvudlås.glb');

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = darkMat;
      }
    });
    return c;
  }, [scene]);

  return (
    <group position={[positionX, positionY, 0]}>
      <group rotation={PART_ROT.mainLock}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

// ─── Single panel assembly with real GLB parts ──────────────────
function RealPanelAssembly({
  panel,
  frameHeight,
}: {
  panel: PositionedPanel;
  frameHeight: number; // mm
}) {
  const { fitting, panelWidth, hasLock } = panel;

  const glassHeight = frameHeight - GLASS_HEIGHT_OFFSET;
  const glassModuleHeight = frameHeight - GLASS_MODULE_HEIGHT_OFFSET;

  // End cap types from fitting lock types
  const leftCapType = lockTypeToEndCapLeft(fitting.topLeft);
  const rightCapType = lockTypeToEndCapRight(fitting.topRight);

  const leftOffset = DEFAULT_GLASS_OFFSET[leftCapType];
  const rightOffset = DEFAULT_GLASS_OFFSET[rightCapType];
  const lockDeduction = hasLock ? DEFAULT_BOTTOM_LOCK_WIDTH.single : 0;

  // Profile lengths
  const upperProfileLen = panelWidth - leftOffset - rightOffset;
  const lowerProfileLen = panelWidth - leftOffset - rightOffset - lockDeduction;

  // Positions in meters (panel-local, centered on glass)
  const halfModH = (glassModuleHeight / 1000) / 2;
  const halfGlassW = (panelWidth / 1000) / 2;
  const leftOffsetM = leftOffset / 1000;

  const profileStartX = -halfGlassW + leftOffsetM;
  const profileTopY = halfModH;
  const profileBottomY = -halfModH;

  const upperProfileEndX = profileStartX + (upperProfileLen / 1000);
  const lowerProfileEndX = profileStartX + (lowerProfileLen / 1000);
  const bottomRightCapX = upperProfileEndX;

  // GLB paths
  const leftCapGlb = END_CAP_INFO[leftCapType].glb;
  const rightCapGlb = END_CAP_INFO[rightCapType].glb;

  return (
    <group>
      {/* Glass pane */}
      <GlassPane width={panelWidth} height={glassHeight} />

      {/* Upper glass holder profile */}
      {upperProfileLen > 0 && (
        <GlassHolderProfile
          profileLength={upperProfileLen}
          positionX={profileStartX}
          positionY={profileTopY}
          rotation={PART_ROT.profileTop}
        />
      )}

      {/* Lower glass holder profile */}
      {lowerProfileLen > 0 && (
        <GlassHolderProfile
          profileLength={lowerProfileLen}
          positionX={profileStartX}
          positionY={profileBottomY}
          rotation={PART_ROT.profileBottom}
        />
      )}

      {/* End caps — top rail */}
      <EndCap glbPath={leftCapGlb} positionX={profileStartX} positionY={profileTopY} rotation={PART_ROT.endCapTL} />
      <EndCap glbPath={rightCapGlb} positionX={upperProfileEndX} positionY={profileTopY} rotation={PART_ROT.endCapTR} />

      {/* End caps — bottom rail */}
      <EndCap glbPath={leftCapGlb} positionX={profileStartX} positionY={profileBottomY} rotation={PART_ROT.endCapBL} />
      <EndCap glbPath={rightCapGlb} positionX={bottomRightCapX} positionY={profileBottomY} rotation={PART_ROT.endCapBR} />

      {/* Main lock — lower rail, between profile end and end cap */}
      {hasLock && (
        <MainLock positionX={lowerProfileEndX} positionY={profileBottomY} />
      )}
    </group>
  );
}

// ─── Main component ─────────────────────────────────────────────
export function GlassPanels3D() {
  const guidePoints = useConfigStore((s) => s.guidePoints);
  const edgeConfigs = useConfigStore((s) => s.edgeConfigs);
  const levels = useConfigStore((s) => s.levels.levels);

  const mellanstyckeY = levels.Mellanstycke.zPosition / 1000;
  const overstyckeY = levels.Overstycke.zPosition / 1000;
  const frameHeightMm = levels.Overstycke.zPosition - levels.Mellanstycke.zPosition;

  const segmentGroups = useMemo((): SegmentPanelGroup[] => {
    if (guidePoints.length < 2) return [];

    const groups: SegmentPanelGroup[] = [];

    for (let segIdx = 0; segIdx < guidePoints.length - 1; segIdx++) {
      const edge = edgeConfigs[segIdx];
      if (!edge || edge.wallOrGlazingStatus === 'wall') continue;
      if (edge.panels.length === 0) continue;

      // Get computed fittings for this edge
      const edgeData = computeEdgeData(guidePoints, edgeConfigs, segIdx, frameHeightMm);
      if (!edgeData || edgeData.panelFittings.length === 0) continue;

      const start = guidePoints[segIdx];
      const end = guidePoints[segIdx + 1];

      const positionedPanels: PositionedPanel[] = [];
      let cursor = 0;

      for (let pIdx = 0; pIdx < edge.panels.length; pIdx++) {
        const panel = edge.panels[pIdx];
        const fitting = edgeData.panelFittings[pIdx];
        if (!fitting) continue;

        cursor += panel.offsetLeft;
        const centerAlongSegment = cursor + panel.length / 2;

        // Panel has a lock if lock symbol is | or ||
        const hasLock = panel.lock === '|' || panel.lock === '||';

        positionedPanels.push({
          centerAlongSegment,
          panelWidth: panel.length,
          index: pIdx,
          fitting,
          hasLock,
        });

        cursor += panel.length + panel.offsetRight;
      }

      groups.push({
        segIndex: segIdx,
        start,
        end,
        frameHeight: frameHeightMm,
        panels: positionedPanels,
      });
    }

    return groups;
  }, [guidePoints, edgeConfigs, frameHeightMm]);

  if (segmentGroups.length === 0) return null;

  // Panel assembly is centered at Y=0 internally (extends ±halfModuleHeight).
  // Place it at the midpoint between mellanstycke and överstycke so
  // it spans from mellanstycke (bottom) to överstycke (top).
  const centerY = (mellanstyckeY + overstyckeY) / 2;

  const allPanels = segmentGroups.flatMap((seg) => {
    const [startX, startZ] = toThreeXZ(seg.start);
    const [endX, endZ] = toThreeXZ(seg.end);

    const segDx = endX - startX;
    const segDz = endZ - startZ;
    const segLen = Math.sqrt(segDx * segDx + segDz * segDz);
    if (segLen < 1e-6) return [];

    const dirX = segDx / segLen;
    const dirZ = segDz / segLen;
    const yRotation = -Math.atan2(dirZ, dirX);

    return seg.panels.map((panel) => {
      const t = panel.centerAlongSegment / 1000;
      const posX = startX + dirX * t;
      const posZ = startZ + dirZ * t;

      return {
        key: `seg${seg.segIndex}-p${panel.index}`,
        posX,
        posZ,
        yRotation,
        panel,
        frameHeight: seg.frameHeight,
      };
    });
  });

  return (
    <group>
      {allPanels.map(({ key, posX, posZ, yRotation, panel, frameHeight }) => (
        <group
          key={key}
          position={[posX, centerY, posZ]}
          rotation={[0, yRotation, 0]}
        >
          <RealPanelAssembly
            panel={panel}
            frameHeight={frameHeight}
          />
        </group>
      ))}
    </group>
  );
}

// ─── Preload GLBs ───────────────────────────────────────────────
useGLTF.preload('/models/Glashållare_10mm.glb');
useGLTF.preload('/models/Huvudlås.glb');
const preloadedGlbs = new Set<string>();
for (const type of END_CAP_TYPES) {
  const glb = END_CAP_INFO[type].glb;
  if (!preloadedGlbs.has(glb)) {
    preloadedGlbs.add(glb);
    useGLTF.preload(glb);
  }
}
