import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useConfigStore } from '../../store/useConfigStore';
import { loadPly, getPlyGeometry, onPlyProgress } from '../../utils/plyCache';

/**
 * Custom ShaderMaterial that clips the point cloud at a Y plane,
 * shows a red slice-line near the clip plane, and adjusts brightness.
 * Mirrors the experiment's Master.js shader exactly.
 */
function makePointCloudMaterial(uniforms: {
  u_clipY: THREE.IUniform<number>;
  u_pointSize: THREE.IUniform<number>;
  u_brightness: THREE.IUniform<number>;
}) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      uniform float u_pointSize;
      varying vec3 vColor;
      varying vec3 vWorldPos;

      void main() {
        vColor = color;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = u_pointSize;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float u_clipY;
      uniform float u_brightness;
      varying vec3 vColor;
      varying vec3 vWorldPos;

      void main() {
        if (vWorldPos.y > u_clipY) discard;
        float dist = u_clipY - vWorldPos.y;
        vec3 finalColor = vColor * u_brightness;
        if (dist < 0.002) {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        } else {
          gl_FragColor = vec4(finalColor, 1.0);
        }
      }
    `,
    vertexColors: true,
    transparent: true,
    depthTest: true,
    depthWrite: true,
  });
}

export function PointCloudViewer() {
  const enabled = useConfigStore((s) => s.pointCloudEnabled);
  const file = useConfigStore((s) => s.pointCloudFile);
  const clipY = useConfigStore((s) => s.pointCloudClipY);
  const brightness = useConfigStore((s) => s.pointCloudBrightness);
  const pointSize = useConfigStore((s) => s.pointCloudPointSize);
  const originY = useConfigStore((s) => s.pointCloudOriginY);

  const groupRef = useRef<THREE.Group>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Shared uniforms so we can update without recreating the material
  const uniforms = useMemo(
    () => ({
      u_clipY: { value: clipY },
      u_pointSize: { value: pointSize },
      u_brightness: { value: brightness },
    }),
    // Only create once — we update .value in useFrame
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Update uniforms reactively — pointSize now in raw pixels (gl_PointSize)
  useFrame(() => {
    uniforms.u_clipY.value = clipY - originY;
    uniforms.u_pointSize.value = pointSize;
    uniforms.u_brightness.value = brightness;
  });

  const material = useMemo(() => makePointCloudMaterial(uniforms), [uniforms]);

  // Load PLY file via global cache — only loads once
  useEffect(() => {
    if (!enabled || !file) return;

    // Check if already cached
    const cached = getPlyGeometry(file);
    if (cached) {
      setGeometry(cached.geometry);
      return;
    }

    setLoading(true);
    setProgress(0);

    const unsub = onPlyProgress(file, (pct) => setProgress(pct));
    loadPly(file)
      .then((entry) => {
        setGeometry(entry.geometry);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    return unsub;
  }, [file, enabled]);

  if (!enabled) return null;

  // Shift the cloud so that the chosen origin (botten) aligns with Y=0
  return (
    <group ref={groupRef} position={[0, -originY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {geometry && <points geometry={geometry} material={material} renderOrder={0} frustumCulled={false} />}
      {loading && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="#2196F3" wireframe />
        </mesh>
      )}
    </group>
  );
}
