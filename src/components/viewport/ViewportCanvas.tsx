import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Grid } from './Grid';
import { LevelPlane } from './LevelPlane';
import { GroundPlane } from './GroundPlane';
import { GuidelineDrawing } from './GuidelineDrawing';
import { useConfigStore } from '../../store/useConfigStore';

export function ViewportCanvas() {
  const levels = useConfigStore((s) => s.levels.levels);

  return (
    <Canvas
      camera={{ position: [8, 6, 8], fov: 45, near: 0.1, far: 100 }}
      style={{
        background: '#1a1a2e',
      }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <Grid />
      {Object.values(levels).map((level) => (
        <LevelPlane key={level.name} level={level} />
      ))}
      <GroundPlane />
      <GuidelineDrawing />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={1}
        maxDistance={50}
      />
    </Canvas>
  );
}
