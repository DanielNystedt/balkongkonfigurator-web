import { useMemo, useRef } from 'react';
import { useGLTF, Line } from '@react-three/drei';
import * as THREE from 'three';
import {
  usePanelBuilderStore,
  END_CAP_GLB,
  END_CAP_WIDTH,
  GLASS_HEIGHT_DEDUCTION,
  GLASS_MODULE_HEIGHT_DEDUCTION,
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
    console.log(`Glashållare size: X=${(size.x*1000).toFixed(1)} Y=${(size.y*1000).toFixed(1)} Z=${(size.z*1000).toFixed(1)}`);

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

  const groupRef = useRef<THREE.Group>(null);

  // ─── Derived dimensions (mm) ───────────────────────────────
  const glassHeight = panelHeight - GLASS_HEIGHT_DEDUCTION;
  const glassModuleHeight = panelHeight - GLASS_MODULE_HEIGHT_DEDUCTION;
  const leftCapW = END_CAP_WIDTH[endCapLeftType];
  const rightCapW = END_CAP_WIDTH[endCapRightType];
  const glassWidth = panelWidth - leftCapW - rightCapW;
  const profileLength = glassWidth;

  // ─── Positions (meters) ────────────────────────────────────
  const halfModH = (glassModuleHeight / 1000) / 2;
  const halfPanelW = (panelWidth / 1000) / 2;
  const leftCapM = leftCapW / 1000;    // left end cap width in meters
  const rightCapM = rightCapW / 1000;  // right end cap width in meters

  // Profile origin (red X=0) placed at left glass edge, after end cap
  const profileStartX = -halfPanelW + leftCapM;
  const profileTopY = halfModH;
  const profileBottomY = -halfModH;

  // End caps: center-origo at profile ends (flush)
  const endCapLeftX = profileStartX;
  const profileEndX = profileStartX + (profileLength / 1000);
  const endCapRightX = profileEndX;

  // Running unit: 86mm from top of glass module height (Ruby code)
  const runningUnitY = halfModH - (86 / 1000);

  // Main lock: same Y as running unit, at right edge of panel
  const mainLockX = halfPanelW;
  const mainLockY = runningUnitY;

  const leftCapPaths = END_CAP_GLB[endCapLeftType];
  const rightCapPaths = END_CAP_GLB[endCapRightType];

  return (
    <group ref={groupRef}>
      {/* Glass pane — centered at origin */}
      <GlassPane width={glassWidth} height={glassHeight} />

      {/* Glass holder profiles: origin at left edge, extruded in +X (red) */}
      {profileLength > 0 && (
        <>
          <GlassHolderProfile
            profileLength={profileLength}
            positionX={profileStartX}
            positionY={profileTopY}
            partKey="profileTop"
          />
          <GlassHolderProfile
            profileLength={profileLength}
            positionX={profileStartX}
            positionY={profileBottomY}
            partKey="profileBottom"
          />
        </>
      )}

      {/* End caps — center-origo, placed at center of cap width */}
      <EndCap glbPath={leftCapPaths.left} positionX={endCapLeftX} positionY={profileTopY} partKey="endCapTL" />
      <EndCap glbPath={rightCapPaths.right} positionX={endCapRightX} positionY={profileTopY} partKey="endCapTR" />
      <EndCap glbPath={leftCapPaths.left} positionX={endCapLeftX} positionY={profileBottomY} partKey="endCapBL" />
      <EndCap glbPath={rightCapPaths.right} positionX={endCapRightX} positionY={profileBottomY} partKey="endCapBR" />

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
      <OriginCross position={[endCapLeftX, profileTopY, 0]} />
      <OriginCross position={[endCapRightX, profileTopY, 0]} />
      <OriginCross position={[endCapLeftX, profileBottomY, 0]} />
      <OriginCross position={[endCapRightX, profileBottomY, 0]} />
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
