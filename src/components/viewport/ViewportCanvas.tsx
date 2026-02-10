import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Grid } from './Grid';
import { LevelPlane } from './LevelPlane';
import { GroundPlane } from './GroundPlane';
import { GuidelineDrawing } from './GuidelineDrawing';
import { PointCloudViewer } from './PointCloudViewer';
import { useConfigStore } from '../../store/useConfigStore';

export function ViewportCanvas() {
  const levels = useConfigStore((s) => s.levels.levels);
  const showLevels = useConfigStore((s) => s.showLevels2D);

  return (
    <Canvas
      camera={{ position: [0, 5, 0], fov: 60, near: 0.1, far: 1000 }}
      style={{
        background: '#1a1a2e',
      }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <Grid />
      {showLevels && Object.values(levels).map((level) => (
        <LevelPlane key={level.name} level={level} />
      ))}
      <GroundPlane />
      <GuidelineDrawing />
      <PointCloudViewer />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={0.5}
        maxDistance={100}
      />
    </Canvas>
  );
}
