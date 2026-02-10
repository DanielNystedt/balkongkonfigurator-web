import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PointCloudViewer } from '../viewport/PointCloudViewer';
import { useConfigStore } from '../../store/useConfigStore';
import type { OrthographicCamera } from 'three';

/**
 * Syncs the Three.js orthographic camera with the SVG viewBox from CadWorkspace.
 * SVG viewBox is in mm, Three.js is in meters, and SVG Y is flipped.
 *
 * SVG coordinate system:
 *   viewBox.x, viewBox.y = top-left corner in SVG coords
 *   SVG Y points DOWN, but our mm system has Y pointing UP (svgY = -mmY)
 *
 * Three.js ortho camera (top-down, Y-up looking down):
 *   camera at Y=10, looking at Y=0
 *   up = [0, 0, -1]  → so X is right, Z is down on screen
 *   left/right = X axis (same as SVG X but in meters)
 *   top/bottom = Z axis (SVG Y maps to -Z in Three.js world)
 */
function CameraSync() {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const vb = useConfigStore((s) => s.cadViewBox);
  const size = useThree((s) => s.size);

  useEffect(() => {
    // SVG viewBox: x, y (top-left), w, h  (all in mm)
    // Convert mm → meters (÷1000)
    const left = vb.x / 1000;
    const right = (vb.x + vb.w) / 1000;
    // SVG Y is flipped relative to world Z:
    // SVG top (vb.y) = world -Z direction, SVG bottom (vb.y+vb.h) = further -Z
    // With camera up=[0,0,-1], screen-top maps to -Z, screen-bottom maps to +Z
    // So: top = -(vb.y)/1000, bottom = -(vb.y + vb.h)/1000
    const top = -vb.y / 1000;
    const bottom = -(vb.y + vb.h) / 1000;

    camera.left = left;
    camera.right = right;
    camera.top = top;
    camera.bottom = bottom;
    camera.updateProjectionMatrix();
  }, [vb, camera, size]);

  return null;
}

/**
 * Orthographic top-down view of the point cloud.
 * Camera is synced to SVG CadWorkspace viewBox — no own controls.
 * Renders behind the transparent SVG layer.
 */
export function CadPointCloudView() {
  const clipY = useConfigStore((s) => s.pointCloudClipY);
  const originY = useConfigStore((s) => s.pointCloudOriginY);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        orthographic
        camera={{
          position: [0, 10, 0],
          zoom: 1,
          near: 0.1,
          far: 1000,
          up: [0, 0, -1],
        }}
        style={{ background: '#0a0f1a' }}
      >
        <CameraSync />
        <PointCloudViewer />
      </Canvas>

      {/* HUD overlay with clip height info */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          color: '#aaa',
          fontSize: 11,
          fontFamily: 'monospace',
          background: 'rgba(0,0,0,0.6)',
          padding: '3px 8px',
          borderRadius: 3,
          pointerEvents: 'none',
        }}
      >
        Klipphöjd: {Math.round((clipY - originY) * 1000)} mm
      </div>
    </div>
  );
}
