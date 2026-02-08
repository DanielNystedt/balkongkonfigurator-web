import { useRef } from 'react';
import type { Mesh } from 'three';

/**
 * Invisible ground plane for raycasting in 3D view.
 * Drawing is now handled in the 2D CAD workspace,
 * this plane is just for visual reference / future use.
 */
export function GroundPlane() {
  const meshRef = useRef<Mesh>(null);

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.001, 0]}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}
