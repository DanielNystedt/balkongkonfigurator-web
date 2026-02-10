import { Line } from '@react-three/drei';
import type { Level } from '../../types/levels';

const LEVEL_COLORS: Record<string, string> = {
  Understycke: '#3b82f6',   // blue
  Mellanstycke: '#22c55e',  // green
  Overstycke: '#ef4444',    // red
};

interface LevelPlaneProps {
  level: Level;
}

/**
 * Level plane rendered as a visible wireframe rectangle + thin transparent fill.
 * Uses depthWrite=false so the point cloud shows through.
 */
export function LevelPlane({ level }: LevelPlaneProps) {
  if (!level.visible) return null;

  const y = level.zPosition / 1000; // mm → meters
  const color = LEVEL_COLORS[level.name] ?? '#888888';
  const size = 6; // 6×6 meter plane — enough for most balconies
  const half = size / 2;

  // Wireframe border points (rectangle at Y height)
  const border: [number, number, number][] = [
    [-half, y, -half],
    [half, y, -half],
    [half, y, half],
    [-half, y, half],
    [-half, y, -half],
  ];

  return (
    <group>
      {/* Thin transparent fill */}
      <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
          side={2}
          depthWrite={false}
        />
      </mesh>

      {/* Visible wireframe border */}
      <Line
        points={border}
        color={color}
        lineWidth={1.5}
        transparent
        opacity={0.6}
        depthWrite={false}
      />
    </group>
  );
}
