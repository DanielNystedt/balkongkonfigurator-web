/**
 * GlassPanels3D — renders glass panels along each guideline segment.
 *
 * For each glazing segment:
 *   1. Get panels from edgeConfigs
 *   2. Walk along the segment accumulating: offsetLeft + panelWidth + offsetRight
 *   3. At each panel center, place a vertical glass pane + profile bars
 *   4. Rotate the assembly to match the segment direction
 *   5. Position vertically between Understycke and Mellanstycke
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { useConfigStore } from '../../store/useConfigStore';
import type { Point2D } from '../../types/geometry';
import { GLASS_HEIGHT_OFFSET, GLASS_MODULE_HEIGHT_OFFSET } from '../../utils/constants';

// ─── Types for positioned panels ────────────────────────────────
interface PositionedPanel {
  /** Panel center in mm along segment from start */
  centerAlongSegment: number;
  /** Panel width in mm */
  width: number;
  /** Panel index */
  index: number;
  /** Opening direction */
  opening: '>' | '<' | 'X';
}

interface SegmentPanelGroup {
  segIndex: number;
  start: Point2D;    // mm
  end: Point2D;      // mm
  /** Frame height in mm (Mellanstycke - Understycke) */
  frameHeight: number;
  panels: PositionedPanel[];
}

// ─── Helper: convert 2D point (mm) to Three.js position ────────
function toThreeXZ(p: Point2D): [number, number] {
  return [p.x / 1000, -p.y / 1000]; // x→X, y→-Z (Three.js)
}

// ─── Single glass panel mesh ────────────────────────────────────
function GlassPanelMesh({
  width,
  height,
}: {
  width: number;  // mm
  height: number; // mm
}) {
  const w = width / 1000;
  const h = height / 1000;
  const thickness = 0.006; // 6mm glass

  return (
    <mesh>
      <boxGeometry args={[w, h, thickness]} />
      <meshStandardMaterial
        color="#88ccee"
        transparent
        opacity={0.35}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Profile bar (top or bottom rail) ───────────────────────────
function ProfileBar({
  width,
  offsetY,
}: {
  width: number;  // mm
  offsetY: number; // meters, relative to panel center
}) {
  const w = width / 1000;
  const profileH = 0.02;  // 20mm tall
  const profileD = 0.015; // 15mm deep

  return (
    <mesh position={[0, offsetY, 0]}>
      <boxGeometry args={[w, profileH, profileD]} />
      <meshStandardMaterial
        color="#d0d0d0"
        metalness={0.5}
        roughness={0.3}
      />
    </mesh>
  );
}

// ─── Single panel assembly (glass + top/bottom profiles) ────────
function PanelAssembly({
  panel,
  frameHeight,
}: {
  panel: PositionedPanel;
  frameHeight: number; // mm
}) {
  const glassHeight = frameHeight - GLASS_HEIGHT_OFFSET;
  const glassModuleHeight = frameHeight - GLASS_MODULE_HEIGHT_OFFSET;

  const halfModH = (glassModuleHeight / 1000) / 2;

  return (
    <group>
      {/* Glass pane centered vertically */}
      <GlassPanelMesh width={panel.width} height={glassHeight} />

      {/* Top profile */}
      <ProfileBar width={panel.width} offsetY={halfModH} />

      {/* Bottom profile */}
      <ProfileBar width={panel.width} offsetY={-halfModH} />
    </group>
  );
}

// ─── Main component ─────────────────────────────────────────────
export function GlassPanels3D() {
  const guidePoints = useConfigStore((s) => s.guidePoints);
  const edgeConfigs = useConfigStore((s) => s.edgeConfigs);
  const levels = useConfigStore((s) => s.levels.levels);

  const understyckeY = levels.Understycke.zPosition / 1000;  // meters
  const mellanstyckeY = levels.Mellanstycke.zPosition / 1000;
  const frameHeightMm = levels.Mellanstycke.zPosition - levels.Understycke.zPosition;

  // Build positioned panel data for all segments
  const segmentGroups = useMemo((): SegmentPanelGroup[] => {
    if (guidePoints.length < 2) return [];

    const groups: SegmentPanelGroup[] = [];

    for (let segIdx = 0; segIdx < guidePoints.length - 1; segIdx++) {
      const edge = edgeConfigs[segIdx];
      if (!edge || edge.wallOrGlazingStatus === 'wall') continue;
      if (edge.panels.length === 0) continue;

      const start = guidePoints[segIdx];
      const end = guidePoints[segIdx + 1];

      // Walk along the segment accumulating panel positions
      const positionedPanels: PositionedPanel[] = [];
      let cursor = 0; // mm from segment start

      for (let pIdx = 0; pIdx < edge.panels.length; pIdx++) {
        const panel = edge.panels[pIdx];

        // Accumulate left offset
        cursor += panel.offsetLeft;

        // Panel center = cursor + half panel width
        const centerAlongSegment = cursor + panel.length / 2;

        positionedPanels.push({
          centerAlongSegment,
          width: panel.length,
          index: pIdx,
          opening: panel.opening,
        });

        // Advance cursor past panel + right offset
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

  // Center Y position for panels (midpoint between Understycke and Mellanstycke)
  const centerY = (understyckeY + mellanstyckeY) / 2;

  // Flatten all panels into a single array for rendering
  const allPanels = segmentGroups.flatMap((seg) => {
    const [startX, startZ] = toThreeXZ(seg.start);
    const [endX, endZ] = toThreeXZ(seg.end);

    const segDx = endX - startX;
    const segDz = endZ - startZ;
    const segLen = Math.sqrt(segDx * segDx + segDz * segDz);
    if (segLen < 1e-6) return [];

    const dirX = segDx / segLen;
    const dirZ = segDz / segLen;

    // Rotation around Y-axis to align panel with segment direction
    const yRotation = -Math.atan2(dirZ, dirX);

    return seg.panels.map((panel) => {
      const t = panel.centerAlongSegment / 1000; // meters along segment
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
          <PanelAssembly
            panel={panel}
            frameHeight={frameHeight}
          />
        </group>
      ))}
    </group>
  );
}
