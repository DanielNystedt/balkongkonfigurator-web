import type { Level } from '../../types/levels';

const LEVEL_COLORS: Record<string, string> = {
  Understycke: '#3b82f6',   // blue
  Mellanstycke: '#22c55e',  // green
  Overstycke: '#ef4444',    // red
};

interface LevelPlaneProps {
  level: Level;
}

export function LevelPlane({ level }: LevelPlaneProps) {
  if (!level.visible) return null;

  const yPosition = level.zPosition / 1000; // mm to meters, Z in model = Y in Three.js
  const color = LEVEL_COLORS[level.name] ?? '#888888';

  return (
    <mesh position={[0, yPosition, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[10, 10]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.08}
        side={2} // DoubleSide
      />
    </mesh>
  );
}
