import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useConfigStore } from '../../store/useConfigStore';
import type { Point2D } from '../../types/geometry';

/** Convert mm point to Three.js meters at given Y height. */
function toThree(p: Point2D, y: number): [number, number, number] {
  return [p.x / 1000, y, -p.y / 1000];
}

/**
 * Renders transparent vertical planes along each guide segment,
 * stretching from Understycke (bottom) to Överstycke (top).
 */
export function GuidePlanes3D() {
  const guidePoints = useConfigStore((s) => s.guidePoints);
  const levels = useConfigStore((s) => s.levels.levels);

  const understyckeY = levels.Understycke.zPosition / 1000;
  const overstyckeY = levels.Overstycke.zPosition / 1000;

  const planes = useMemo(() => {
    if (guidePoints.length < 2) return [];

    return guidePoints.slice(0, -1).map((start, i) => {
      const end = guidePoints[i + 1];

      // Four corners of the vertical quad
      const bl = toThree(start, understyckeY); // bottom-left
      const br = toThree(end, understyckeY);   // bottom-right
      const tr = toThree(end, overstyckeY);    // top-right
      const tl = toThree(start, overstyckeY);  // top-left

      // BufferGeometry: 2 triangles (6 vertices)
      const positions = new Float32Array([
        ...bl, ...br, ...tr,  // triangle 1
        ...bl, ...tr, ...tl,  // triangle 2
      ]);

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.computeVertexNormals();

      // Wireframe border (4 edges)
      const border: [number, number, number][] = [bl, br, tr, tl, bl];

      return { geom, border, key: i };
    });
  }, [guidePoints, understyckeY, overstyckeY]);

  if (planes.length === 0) return null;

  return (
    <group>
      {planes.map(({ geom, border, key }) => (
        <group key={key}>
          {/* Transparent fill */}
          <mesh geometry={geom}>
            <meshBasicMaterial
              color="#60a5fa"
              transparent
              opacity={0.06}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* Wireframe edges */}
          <Line
            points={border}
            color="#60a5fa"
            lineWidth={1}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </group>
      ))}
    </group>
  );
}
