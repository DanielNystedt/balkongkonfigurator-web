import { useMemo, useRef } from 'react';
import { useGLTF, Line } from '@react-three/drei';
import * as THREE from 'three';
import {
  usePanelBuilderStore,
  END_CAP_INFO,
  END_CAP_TYPES,
  type PartKey,
} from '../../store/panelBuilderStore';

// ─── Origin cross: RGB axes at a given position ──────────────────
const AXIS_LEN = 0.03; // 30mm in meters
function OriginCross({ position }: { position: [number, number, number] }) {
  const [x, y, z] = position;
  return (
    <group>
      <Line points={[[x, y, z], [x + AXIS_LEN, y, z]]} color="red" lineWidth={2} />
      <Line points={[[x, y, z], [x, y + AXIS_LEN, z]]} color="green" lineWidth={2} />
      <Line points={[[x, y, z], [x, y, z + AXIS_LEN]]} color="blue" lineWidth={2} />
    </group>
  );
}

// ─── Hook: get rotation radians for a part ────────────────────────
function usePartRot(part: PartKey): [number, number, number] {
  const steps = usePanelBuilderStore((s) => s.partRotations[part]);
  const H = Math.PI / 2;
  return [steps[0] * H, steps[1] * H, steps[2] * H];
}

// ─── Sub-component: Glass pane ────────────────────────────────────
function GlassPane({ width, height }: { width: number; height: number }) {
  const w = width / 1000;
  const h = height / 1000;
  const thickness = 0.01; // 10mm glass

  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[w, h, thickness]} />
      <meshPhysicalMaterial
        color="#c8e8f0"
        transparent
        opacity={0.25}
        roughness={0.0}
        metalness={0.0}
        transmission={0.9}
        thickness={0.01}
        ior={1.5}
        reflectivity={0.5}
        envMapIntensity={1.0}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Sub-component: Glass holder profile (top or bottom) ──────────
// GLB is extruded along X (red axis) from origin, 1000mm base length.
// Origin is placed at left glass edge (after end cap inset).
// Scale X = profileLength / 1000 to get correct length.
function GlassHolderProfile({
  profileLength,
  positionX,
  positionY,
  partKey,
}: {
  profileLength: number;
  positionX: number;
  positionY: number;
  partKey: PartKey;
}) {
  const { scene } = useGLTF('/models/Glashållare_10mm.glb');
  const rot = usePartRot(partKey);

  const cloned = useMemo(() => {
    const c = scene.clone(true);

    // Measure GLB to find extrusion axis (should be ~1000mm = 1.0m)
    const box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Scale the longest axis (extrusion direction) to target length
    const targetM = profileLength / 1000;
    if (size.x >= size.y && size.x >= size.z) {
      c.scale.set(targetM / size.x, 1, 1);
    } else if (size.y >= size.x && size.y >= size.z) {
      c.scale.set(1, targetM / size.y, 1);
    } else {
      c.scale.set(1, 1, targetM / size.z);
    }

    // White aluminium
    const aluminiumMat = new THREE.MeshStandardMaterial({
      color: '#e8e8e8',
      metalness: 0.5,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });

    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = aluminiumMat;
      }
    });

    return c;
  }, [scene, profileLength]);

  return (
    <group position={[positionX, positionY, 0]}>
      <group rotation={rot}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

// ─── Sub-component: End cap (corner piece) ────────────────────────
function EndCap({
  glbPath,
  positionX,
  positionY,
  partKey,
}: {
  glbPath: string;
  positionX: number;
  positionY: number;
  partKey: PartKey;
}) {
  const { scene } = useGLTF(glbPath);
  const rot = usePartRot(partKey);

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
          color: '#808080',
          metalness: 0.7,
          roughness: 0.2,
        });
      }
    });
    return c;
  }, [scene]);

  return (
    <group position={[positionX, positionY, 0]}>
      <group rotation={rot}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

// ─── Sub-component: Running unit (Löpenhet) ──────────────────────
function RunningUnit({ positionX, positionY }: { positionX: number; positionY: number }) {
  const { scene } = useGLTF('/models/Löpenhet.glb');
  const rot = usePartRot('runningUnit');

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
          color: '#808080',
          metalness: 0.7,
          roughness: 0.2,
        });
      }
    });
    return c;
  }, [scene]);

  return (
    <group position={[positionX, positionY, 0]}>
      <group rotation={rot}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

// ─── Sub-component: Main lock (Huvudlås) ─────────────────────────
function MainLock({ positionX, positionY }: { positionX: number; positionY: number }) {
  const { scene } = useGLTF('/models/Huvudlås.glb');
  const rot = usePartRot('mainLock');

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
          color: '#808080',
          metalness: 0.7,
          roughness: 0.2,
        });
      }
    });
    return c;
  }, [scene]);

  return (
    <group position={[positionX, positionY, 0]}>
      <group rotation={rot}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

// ─── Main component: Full glass panel assembly ───────────────────
export function GlassPanel3D() {
  const panelWidth = usePanelBuilderStore((s) => s.panelWidth);
  const panelHeight = usePanelBuilderStore((s) => s.panelHeight);
  const endCapLeftType = usePanelBuilderStore((s) => s.endCapLeftType);
  const endCapRightType = usePanelBuilderStore((s) => s.endCapRightType);
  const lockType = usePanelBuilderStore((s) => s.lockType);
  const glassOffsets = usePanelBuilderStore((s) => s.glassOffsets);
  const topLockWidths = usePanelBuilderStore((s) => s.topLockWidths);
  const bottomLockWidths = usePanelBuilderStore((s) => s.bottomLockWidths);
  const glassHeightDed = usePanelBuilderStore((s) => s.glassHeightDeduction);
  const glassModHeightDed = usePanelBuilderStore((s) => s.glassModuleHeightDeduction);

  const groupRef = useRef<THREE.Group>(null);

  // ─── Derived dimensions (mm) — uses editable offsets ────────
  const glassHeight = panelHeight - glassHeightDed;
  const glassModuleHeight = panelHeight - glassModHeightDed;
  const leftOffset = glassOffsets[endCapLeftType];    // glass extends this much past left holder end
  const rightOffset = glassOffsets[endCapRightType];  // glass extends this much past right holder end

  // Glass width = full panel width (glass fills the whole module)
  const glassWidth = panelWidth;

  // Profile lengths: holder is shorter than glass by the glass offsets
  // Lock only sits on the LOWER rail, same positioning as end caps
  const upperProfileLength = glassWidth - leftOffset - rightOffset;
  const lowerProfileLength = glassWidth - leftOffset - rightOffset - bottomLockWidths[lockType];

  // ─── Positions (meters) ────────────────────────────────────
  const halfModH = (glassModuleHeight / 1000) / 2;
  const halfGlassW = (glassWidth / 1000) / 2;
  const leftOffsetM = leftOffset / 1000;  // left glass offset in meters

  // Profile origin placed leftOffset mm in from glass left edge
  const profileStartX = -halfGlassW + leftOffsetM;
  const profileTopY = halfModH;
  const profileBottomY = -halfModH;

  // End caps positioned at glass offset boundary (outermost)
  const endCapLeftX = profileStartX;
  const upperProfileEndX = profileStartX + (upperProfileLength / 1000);
  const lowerProfileEndX = profileStartX + (lowerProfileLength / 1000);

  // Bottom right end cap sits at same X as upper right (at glass offset boundary)
  // = profileStartX + (panelWidth - leftOffset - rightOffset) / 1000
  const bottomRightCapX = upperProfileEndX;

  // Running unit: 86mm from top of glass module height (Ruby code)
  const runningUnitY = halfModH - (86 / 1000);

  // Main lock: on LOWER rail, between profile end and end cap
  // Profile ends → Lock → End cap (outermost)
  const mainLockX = lowerProfileEndX;
  const mainLockY = profileBottomY;

  // GLB paths from END_CAP_INFO
  const leftCapGlb = END_CAP_INFO[endCapLeftType].glb;
  const rightCapGlb = END_CAP_INFO[endCapRightType].glb;

  return (
    <group ref={groupRef}>
      {/* Glass pane — centered at origin */}
      <GlassPane width={glassWidth} height={glassHeight} />

      {/* Glass holder profiles: origin at left edge, extruded in +X (red) */}
      {upperProfileLength > 0 && (
        <GlassHolderProfile
          profileLength={upperProfileLength}
          positionX={profileStartX}
          positionY={profileTopY}
          partKey="profileTop"
        />
      )}
      {lowerProfileLength > 0 && (
        <GlassHolderProfile
          profileLength={lowerProfileLength}
          positionX={profileStartX}
          positionY={profileBottomY}
          partKey="profileBottom"
        />
      )}

      {/* End caps — at glass offset boundary (outermost) */}
      <EndCap glbPath={leftCapGlb} positionX={endCapLeftX} positionY={profileTopY} partKey="endCapTL" />
      <EndCap glbPath={rightCapGlb} positionX={upperProfileEndX} positionY={profileTopY} partKey="endCapTR" />
      <EndCap glbPath={leftCapGlb} positionX={endCapLeftX} positionY={profileBottomY} partKey="endCapBL" />
      {/* Bottom right: end cap sits OUTSIDE the lock (profile → lock → end cap) */}
      <EndCap glbPath={rightCapGlb} positionX={bottomRightCapX} positionY={profileBottomY} partKey="endCapBR" />

      {/* Running unit (Löpenhet) — 86mm from top, centered */}
      <RunningUnit positionX={0} positionY={runningUnitY} />

      {/* Main lock — same height as running unit, right edge */}
      {lockType !== 'none' && (
        <MainLock positionX={mainLockX} positionY={mainLockY} />
      )}

      {/* Origin crosses */}
      <OriginCross position={[0, 0, 0]} />
      <OriginCross position={[profileStartX, profileTopY, 0]} />
      <OriginCross position={[profileStartX, profileBottomY, 0]} />
      <OriginCross position={[upperProfileEndX, profileTopY, 0]} />
      <OriginCross position={[lowerProfileEndX, profileBottomY, 0]} />
      <OriginCross position={[bottomRightCapX, profileBottomY, 0]} />
      <OriginCross position={[0, runningUnitY, 0]} />
      {lockType !== 'none' && (
        <OriginCross position={[mainLockX, mainLockY, 0]} />
      )}
    </group>
  );
}

// ─── Preload all possible GLBs ───────────────────────────────────
useGLTF.preload('/models/Glashållare_10mm.glb');
useGLTF.preload('/models/Löpenhet.glb');
useGLTF.preload('/models/Huvudlås.glb');

// Preload all end cap GLBs
const preloadedGlbs = new Set<string>();
for (const type of END_CAP_TYPES) {
  const glb = END_CAP_INFO[type].glb;
  if (!preloadedGlbs.has(glb)) {
    preloadedGlbs.add(glb);
    useGLTF.preload(glb);
  }
}
