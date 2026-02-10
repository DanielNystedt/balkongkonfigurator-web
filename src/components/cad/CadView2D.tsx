/**
 * CadView2D — Unified 2D view using Three.js orthographic camera.
 *
 * The guide, point cloud, and everything else share ONE coordinate system.
 * Camera is locked top-down (Y axis). Pan with middle mouse / ctrl+left, zoom with wheel.
 * Click/drag on the XZ plane for drawing/editing guide points.
 *
 * Coordinate mapping:
 *   mm X  → Three.js  X / 1000  (meters)
 *   mm Y  → Three.js -Z / 1000  (Y-up → Z-forward flip)
 *   Three.js Y = height axis (point cloud, levels)
 */
import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PointCloudViewer } from '../viewport/PointCloudViewer';
import { GuidelineDrawing } from '../viewport/GuidelineDrawing';
import { LevelPlane } from '../viewport/LevelPlane';
import { useConfigStore } from '../../store/useConfigStore';
import { distance2D } from '../../utils/math';
import type { Point2D } from '../../types/geometry';

// ─── Convert screen click to mm via raycasting XZ plane ──
const XZ_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();
const _intersection = new THREE.Vector3();

function screenToMm(
  clientX: number,
  clientY: number,
  camera: THREE.Camera,
  domRect: DOMRect,
): Point2D | null {
  _mouse.x = ((clientX - domRect.left) / domRect.width) * 2 - 1;
  _mouse.y = -((clientY - domRect.top) / domRect.height) * 2 + 1;
  _raycaster.setFromCamera(_mouse, camera);
  const hit = _raycaster.ray.intersectPlane(XZ_PLANE, _intersection);
  if (!hit) return null;
  // world meters → mm, and flip Z → mm Y
  return { x: hit.x * 1000, y: -hit.z * 1000 };
}

// ─── Ortho camera controller (pan + zoom, no rotation) ──

function OrthoController() {
  const { camera, gl, size } = useThree();
  const cam = camera as THREE.OrthographicCamera;

  // Pan state
  const panRef = useRef<{ startX: number; startY: number; camX: number; camZ: number } | null>(null);

  // Keep frustum aspect ratio matching the canvas — width stays, height adapts
  useEffect(() => {
    if (size.width === 0 || size.height === 0) return;
    const aspect = size.width / size.height;
    const halfW = (cam.right - cam.left) / 2;
    const halfH = halfW / aspect;
    cam.top = halfH;
    cam.bottom = -halfH;
    cam.updateProjectionMatrix();
  }, [size.width, size.height, cam]);

  useEffect(() => {
    const canvas = gl.domElement;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();

      // Mouse position in NDC
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Current world coords at mouse (before zoom)
      const worldX = cam.position.x + ndcX * (cam.right - cam.left) / 2;
      const worldZ = cam.position.z - ndcY * (cam.top - cam.bottom) / 2;

      const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
      const halfW = (cam.right - cam.left) / 2;
      const halfH = (cam.top - cam.bottom) / 2;
      const newHalfW = halfW * factor;
      const newHalfH = halfH * factor;

      // Adjust camera position so world point under mouse stays fixed
      cam.position.x = worldX - ndcX * newHalfW;
      cam.position.z = worldZ + ndcY * newHalfH;

      cam.left = -newHalfW;
      cam.right = newHalfW;
      cam.top = newHalfH;
      cam.bottom = -newHalfH;
      cam.updateProjectionMatrix();
    };

    const onPointerDown = (e: PointerEvent) => {
      // Right mouse button for pan
      if (e.button === 2) {
        e.preventDefault();
        panRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          camX: cam.position.x,
          camZ: cam.position.z,
        };
        canvas.setPointerCapture(e.pointerId);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!panRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const viewW = cam.right - cam.left;
      const viewH = cam.top - cam.bottom;
      const dxPx = e.clientX - panRef.current.startX;
      const dyPx = e.clientY - panRef.current.startY;
      cam.position.x = panRef.current.camX - (dxPx / rect.width) * viewW;
      cam.position.z = panRef.current.camZ + (dyPx / rect.height) * viewH;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (panRef.current) {
        panRef.current = null;
        canvas.releasePointerCapture(e.pointerId);
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
    };
  }, [cam, gl]);

  return null;
}

// ─── Drawing interaction layer (click/drag guide points) ──

const HIT_RADIUS_M = 0.06; // meters — for point hit detection
const DRAG_THRESHOLD_PX = 4;

function DrawingInteraction() {
  const { camera, gl } = useThree();
  const store = () => useConfigStore.getState();

  const dragRef = useRef<number | null>(null);
  const downRef = useRef<{ cx: number; cy: number } | null>(null);
  const movedRef = useRef(false);
  const isPanRef = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;
    const getRect = () => canvas.getBoundingClientRect();

    function hitPoint(mm: Point2D, pts: Point2D[]): number | null {
      // Convert hit radius from meters to mm
      const cam = camera as THREE.OrthographicCamera;
      const viewWMeters = cam.right - cam.left;
      const rect = getRect();
      const metersPerPx = viewWMeters / rect.width;
      const hitRadiusMm = metersPerPx * 12 * 1000; // 12px hit zone

      let best: number | null = null;
      let bestD = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const d = distance2D(mm.x, mm.y, pts[i].x, pts[i].y);
        if (d < hitRadiusMm && d < bestD) { bestD = d; best = i; }
      }
      return best;
    }

    function hitSegment(mm: Point2D, pts: Point2D[]): number | null {
      const cam = camera as THREE.OrthographicCamera;
      const viewWMeters = cam.right - cam.left;
      const rect = getRect();
      const metersPerPx = viewWMeters / rect.width;
      const hitRadiusMm = metersPerPx * 12 * 1000;

      let best: number | null = null;
      let bestD = Infinity;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, ls = dx * dx + dy * dy;
        let d: number;
        if (ls < 1e-10) {
          d = distance2D(mm.x, mm.y, a.x, a.y);
        } else {
          const t = Math.max(0, Math.min(1, ((mm.x - a.x) * dx + (mm.y - a.y) * dy) / ls));
          d = distance2D(mm.x, mm.y, a.x + t * dx, a.y + t * dy);
        }
        if (d < hitRadiusMm && d < bestD) { bestD = d; best = i; }
      }
      return best;
    }

    const onPointerDown = (e: PointerEvent) => {
      // Skip if it's a pan (right click, handled by OrthoController)
      if (e.button === 2) {
        isPanRef.current = true;
        return;
      }
      if (e.button !== 0) return;
      isPanRef.current = false;

      downRef.current = { cx: e.clientX, cy: e.clientY };
      movedRef.current = false;

      const s = store();
      if (s.guidePoints.length > 0) {
        const mm = screenToMm(e.clientX, e.clientY, camera, getRect());
        if (mm) {
          const idx = hitPoint(mm, s.guidePoints);
          if (idx !== null) {
            dragRef.current = idx;
            canvas.style.cursor = 'grabbing';
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isPanRef.current) return;

      if (dragRef.current !== null) {
        if (!movedRef.current && downRef.current) {
          const dx = e.clientX - downRef.current.cx;
          const dy = e.clientY - downRef.current.cy;
          if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD_PX) return;
          movedRef.current = true;
        }
        const mm = screenToMm(e.clientX, e.clientY, camera, getRect());
        if (mm) store().movePoint(dragRef.current, mm);
        return;
      }

      // Preview while drawing
      if (store().isDrawing) {
        const mm = screenToMm(e.clientX, e.clientY, camera, getRect());
        if (mm) store().setPreviewPoint(mm);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isPanRef.current) {
        isPanRef.current = false;
        return;
      }

      // End drag
      if (dragRef.current !== null) {
        dragRef.current = null;
        canvas.style.cursor = '';
        return;
      }

      if (e.button !== 0) return;

      // Was it a click (not a drag)?
      if (downRef.current) {
        const dx = e.clientX - downRef.current.cx;
        const dy = e.clientY - downRef.current.cy;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) {
          downRef.current = null;
          return;
        }
      }
      downRef.current = null;

      const s = store();
      const mm = screenToMm(e.clientX, e.clientY, camera, getRect());
      if (!mm) return;

      // Drawing: add point
      if (s.isDrawing) {
        s.addPoint(mm);
        return;
      }

      // Start new guideline
      if (s.activeMode === 'draw-guide' && s.guidePoints.length === 0) {
        s.setIsDrawing(true);
        s.addPoint(mm);
        return;
      }

      // Edit: click segment → select
      if (s.guidePoints.length >= 2) {
        const si = hitSegment(mm, s.guidePoints);
        s.setSelectedSegmentIndex(si);
      }
    };

    const onDblClick = (e: MouseEvent) => {
      e.preventDefault();
      const s = store();
      const mm = screenToMm(e.clientX, e.clientY, camera, getRect());
      if (!mm) return;

      if (s.isDrawing) {
        if (s.guidePoints.length >= 2) s.undoLastPoint();
        s.setIsDrawing(false);
        return;
      }

      const pts = s.guidePoints;
      if (pts.length > 0) {
        const pi = hitPoint(mm, pts);
        if (pi !== null) { s.removePoint(pi); return; }
        const si = hitSegment(mm, pts);
        if (si !== null) {
          const a = pts[si], b = pts[si + 1];
          const dx = b.x - a.x, dy = b.y - a.y, ls = dx * dx + dy * dy;
          const t = ls < 1e-10 ? 0.5 : Math.max(0.05, Math.min(0.95, ((mm.x - a.x) * dx + (mm.y - a.y) * dy) / ls));
          s.insertPointOnSegment(si, { x: a.x + t * dx, y: a.y + t * dy });
        }
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    // Use capture phase for drawing so it fires before OrthoController
    canvas.addEventListener('pointerdown', onPointerDown, true);
    canvas.addEventListener('pointermove', onPointerMove, true);
    canvas.addEventListener('pointerup', onPointerUp, true);
    canvas.addEventListener('dblclick', onDblClick);
    canvas.addEventListener('contextmenu', onContextMenu);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown, true);
      canvas.removeEventListener('pointermove', onPointerMove, true);
      canvas.removeEventListener('pointerup', onPointerUp, true);
      canvas.removeEventListener('dblclick', onDblClick);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, [camera, gl]);

  return null;
}

// ─── Crosshair axis lines ───────────────────────────────

function AxisLines() {
  const { camera } = useThree();
  const cam = camera as THREE.OrthographicCamera;
  const lineRef = useRef<{ xLine: THREE.Line; zLine: THREE.Line } | null>(null);

  useFrame(() => {
    const half = Math.max(Math.abs(cam.right - cam.left), Math.abs(cam.top - cam.bottom)) * 2;
    if (lineRef.current) {
      const { xLine, zLine } = lineRef.current;
      const posArr1 = (xLine.geometry as THREE.BufferGeometry).attributes.position;
      posArr1.setXYZ(0, cam.position.x - half, 0.001, 0);
      posArr1.setXYZ(1, cam.position.x + half, 0.001, 0);
      posArr1.needsUpdate = true;
      const posArr2 = (zLine.geometry as THREE.BufferGeometry).attributes.position;
      posArr2.setXYZ(0, 0, 0.001, cam.position.z - half);
      posArr2.setXYZ(1, 0, 0.001, cam.position.z + half);
      posArr2.needsUpdate = true;
    }
  });

  const geom1 = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-100, 0, 0, 100, 0, 0], 3));
    return g;
  }, []);
  const geom2 = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -100, 0, 0, 100], 3));
    return g;
  }, []);
  const matRed = useMemo(() => new THREE.LineBasicMaterial({ color: '#ef4444', opacity: 0.4, transparent: true, depthTest: false, depthWrite: false }), []);
  const matGreen = useMemo(() => new THREE.LineBasicMaterial({ color: '#22c55e', opacity: 0.4, transparent: true, depthTest: false, depthWrite: false }), []);

  // Create line objects with renderOrder so guide draws on top
  const xLineObj = useMemo(() => { const l = new THREE.Line(geom1, matRed); l.renderOrder = 1; return l; }, [geom1, matRed]);
  const zLineObj = useMemo(() => { const l = new THREE.Line(geom2, matGreen); l.renderOrder = 1; return l; }, [geom2, matGreen]);

  return (
    <>
      <primitive object={xLineObj} ref={(obj: THREE.Line) => {
        if (obj && !lineRef.current) lineRef.current = { xLine: obj, zLine: null as any };
        if (obj && lineRef.current) lineRef.current.xLine = obj;
      }} />
      <primitive object={zLineObj} ref={(obj: THREE.Line) => {
        if (obj && lineRef.current) lineRef.current.zLine = obj;
      }} />
    </>
  );
}

// ─── Angle tracking lines (45°/90° projection from last point) ──

function AngleTrackingLines() {
  const isDrawing = useConfigStore((s) => s.isDrawing);
  const guidePoints = useConfigStore((s) => s.guidePoints);
  const snapAngle = useConfigStore((s) => s.snapAngle);
  const mellanZ = useConfigStore((s) => s.levels.levels.Mellanstycke.zPosition);
  const height = mellanZ / 1000;

  const lines = useMemo(() => {
    if (!isDrawing || !snapAngle || guidePoints.length === 0) return [];

    const last = guidePoints[guidePoints.length - 1];
    const origin: [number, number, number] = [last.x / 1000, height + 0.002, -last.y / 1000];
    const reach = 20; // 20m reach — long enough to always be visible
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];

    return angles.map((deg) => {
      const rad = (deg * Math.PI) / 180;
      // mm X → Three.js X, mm Y → Three.js -Z
      const end: [number, number, number] = [
        origin[0] + Math.cos(rad) * reach,
        height + 0.002,
        origin[2] - Math.sin(rad) * reach,
      ];
      return { from: origin, to: end, is90: deg % 90 === 0 };
    });
  }, [isDrawing, snapAngle, guidePoints, height]);

  if (lines.length === 0) return null;

  return (
    <group renderOrder={2}>
      {lines.map((l, i) => (
        <line key={i} renderOrder={2}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([...l.from, ...l.to])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={l.is90 ? '#3b82f6' : '#f59e0b'}
            opacity={0.25}
            transparent
            depthTest={false}
            depthWrite={false}
          />
        </line>
      ))}
    </group>
  );
}

// ─── Level planes visible in 2D (reads store toggle) ────

function LevelPlanes2D() {
  const levels = useConfigStore((s) => s.levels.levels);
  const show = useConfigStore((s) => s.showLevels2D);
  if (!show) return null;
  return (
    <>
      {Object.values(levels).map((level) => (
        <LevelPlane key={level.name} level={level} />
      ))}
    </>
  );
}

// ─── Main 2D view component ─────────────────────────────

export function CadView2D() {
  const clipY = useConfigStore((s) => s.pointCloudClipY);
  const originY = useConfigStore((s) => s.pointCloudOriginY);
  const showLevels = useConfigStore((s) => s.showLevels2D);
  const setShowLevels = useConfigStore((s) => s.setShowLevels2D);

  // Initial ortho size: 3m in each direction (= 6000mm total)
  const initHalf = 3; // meters

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        orthographic
        camera={{
          position: [0, 10, 0],
          left: -initHalf,
          right: initHalf,
          top: initHalf,
          bottom: -initHalf,
          near: 0.01,
          far: 100,
          up: [0, 0, -1],
        }}
        style={{ background: '#0a0f1a' }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0);
        }}
      >
        <OrthoController />
        <DrawingInteraction />
        <AxisLines />
        <PointCloudViewer />
        <GuidelineDrawing />
        <AngleTrackingLines />
        <LevelPlanes2D />
      </Canvas>

      {/* HUD */}
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

      {/* Level toggle button */}
      <button
        onClick={() => setShowLevels(!showLevels)}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: showLevels ? 'rgba(34,197,94,0.8)' : 'rgba(80,80,80,0.8)',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          padding: '4px 10px',
          fontSize: 11,
          fontFamily: 'monospace',
          cursor: 'pointer',
        }}
      >
        Nivåer {showLevels ? 'PÅ' : 'AV'}
      </button>
    </div>
  );
}
