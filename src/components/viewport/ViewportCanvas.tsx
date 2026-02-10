import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Grid } from './Grid';
import { LevelPlane } from './LevelPlane';
import { GroundPlane } from './GroundPlane';
import { GuidelineDrawing } from './GuidelineDrawing';
import { PointCloudViewer } from './PointCloudViewer';
import { GuidePlanes3D } from './GuidePlanes3D';
import { useConfigStore } from '../../store/useConfigStore';

export function ViewportCanvas() {
  const levels = useConfigStore((s) => s.levels.levels);
  const showLevels = useConfigStore((s) => s.showLevels2D);
  const showGuidePlanes = useConfigStore((s) => s.showGuidePlanes);
  const setShowGuidePlanes = useConfigStore((s) => s.setShowGuidePlanes);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
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
        {showGuidePlanes && <GuidePlanes3D />}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
          minDistance={0.5}
          maxDistance={100}
        />
      </Canvas>

      {/* Toggle button */}
      <button
        onClick={() => setShowGuidePlanes(!showGuidePlanes)}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: showGuidePlanes ? 'rgba(96,165,250,0.8)' : 'rgba(80,80,80,0.8)',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          padding: '4px 10px',
          fontSize: 11,
          fontFamily: 'monospace',
          cursor: 'pointer',
        }}
      >
        Guideplan {showGuidePlanes ? 'PÅ' : 'AV'}
      </button>
    </div>
  );
}
