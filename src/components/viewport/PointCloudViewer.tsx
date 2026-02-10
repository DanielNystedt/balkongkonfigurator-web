import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useConfigStore } from '../../store/useConfigStore';
import { loadPly, getPlyGeometry, onPlyProgress } from '../../utils/plyCache';

const MAX_GUIDE_PLANES = 20;

/**
 * Custom ShaderMaterial that:
 * 1. Clips the point cloud at a Y plane (existing)
 * 2. Shows a red slice-line near the clip plane (existing)
 * 3. Highlights points near vertical guide segments in red (bounded to segment extent)
 */
function makePointCloudMaterial(uniforms: Record<string, THREE.IUniform>) {
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
      uniform int u_guideSegCount;
      uniform vec2 u_guideSegA[${MAX_GUIDE_PLANES}];
      uniform vec2 u_guideSegB[${MAX_GUIDE_PLANES}];
      uniform float u_guidePlaneYMin;
      uniform float u_guidePlaneYMax;
      uniform float u_showGuidePlanes;
      varying vec3 vColor;
      varying vec3 vWorldPos;

      void main() {
        if (vWorldPos.y > u_clipY) discard;
        float clipDist = u_clipY - vWorldPos.y;
        vec3 finalColor = vColor * u_brightness;

        // Clip plane red highlight
        if (clipDist < 0.002) {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
          return;
        }

        // Guide segment proximity highlight (bounded to segment endpoints)
        if (u_showGuidePlanes > 0.5
            && vWorldPos.y >= u_guidePlaneYMin
            && vWorldPos.y <= u_guidePlaneYMax) {
          vec2 p = vec2(vWorldPos.x, vWorldPos.z);
          for (int i = 0; i < ${MAX_GUIDE_PLANES}; i++) {
            if (i >= u_guideSegCount) break;
            vec2 a = u_guideSegA[i];
            vec2 b = u_guideSegB[i];
            vec2 ab = b - a;
            vec2 ap = p - a;
            float lenSq = dot(ab, ab);
            // Project point onto segment, clamp t to [0,1]
            float t = clamp(dot(ap, ab) / lenSq, 0.0, 1.0);
            vec2 closest = a + t * ab;
            float d = length(p - closest);
            if (d < 0.003) {
              gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
              return;
            }
          }
        }

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    vertexColors: true,
    transparent: false,
    depthTest: true,
    depthWrite: true,
  });
}

/**
 * Compute segment endpoints from guide points in Three.js XZ coordinates.
 * Returns arrays of start (A) and end (B) points as Vector2.
 */
function computeGuideSegments(guidePoints: { x: number; y: number }[]): {
  segA: THREE.Vector2[];
  segB: THREE.Vector2[];
} {
  const segA: THREE.Vector2[] = [];
  const segB: THREE.Vector2[] = [];
  for (let i = 0; i < guidePoints.length - 1 && i < MAX_GUIDE_PLANES; i++) {
    const a = guidePoints[i];
    const b = guidePoints[i + 1];
    // Convert mm to Three.js meters: x/1000, z = -y/1000
    segA.push(new THREE.Vector2(a.x / 1000, -a.y / 1000));
    segB.push(new THREE.Vector2(b.x / 1000, -b.y / 1000));
  }
  return { segA, segB };
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

  // Shared uniforms — created once, updated in useFrame
  const uniforms = useMemo(
    () => ({
      u_clipY: { value: 2.0 },
      u_pointSize: { value: 1.0 },
      u_brightness: { value: 1.0 },
      u_guideSegCount: { value: 0 },
      u_guideSegA: { value: Array.from({ length: MAX_GUIDE_PLANES }, () => new THREE.Vector2()) },
      u_guideSegB: { value: Array.from({ length: MAX_GUIDE_PLANES }, () => new THREE.Vector2()) },
      u_guidePlaneYMin: { value: 0.0 },
      u_guidePlaneYMax: { value: 2.1 },
      u_showGuidePlanes: { value: 0.0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Update uniforms every frame
  useFrame(() => {
    const state = useConfigStore.getState();

    uniforms.u_clipY.value = clipY - originY;
    uniforms.u_pointSize.value = pointSize;
    uniforms.u_brightness.value = brightness;

    // Guide planes
    const show = state.showGuidePlanes;
    uniforms.u_showGuidePlanes.value = show ? 1.0 : 0.0;

    if (show && state.guidePoints.length >= 2) {
      const { segA, segB } = computeGuideSegments(state.guidePoints);
      uniforms.u_guideSegCount.value = segA.length;
      for (let i = 0; i < MAX_GUIDE_PLANES; i++) {
        if (i < segA.length) {
          uniforms.u_guideSegA.value[i].copy(segA[i]);
          uniforms.u_guideSegB.value[i].copy(segB[i]);
        }
      }
      const levels = state.levels.levels;
      uniforms.u_guidePlaneYMin.value = levels.Understycke.zPosition / 1000;
      uniforms.u_guidePlaneYMax.value = levels.Overstycke.zPosition / 1000;
    } else {
      uniforms.u_guideSegCount.value = 0;
    }
  });

  const material = useMemo(() => makePointCloudMaterial(uniforms), [uniforms]);

  // Load PLY file via global cache — only loads once
  useEffect(() => {
    if (!enabled || !file) return;

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
