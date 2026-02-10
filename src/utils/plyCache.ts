import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { useConfigStore } from '../store/useConfigStore';

/**
 * Global PLY geometry cache — loads the file once and shares the geometry
 * between all PointCloudViewer instances (2D + 3D).
 */

interface CacheEntry {
  geometry: THREE.BufferGeometry;
  /** Raw PLY Z bounds (becomes Three.js Y after -90° rotation) */
  boundsZ: [number, number];
}

const cache = new Map<string, CacheEntry>();
const loading = new Map<string, Promise<CacheEntry>>();
const progressListeners = new Map<string, Set<(pct: number) => void>>();

export function getPlyGeometry(file: string): CacheEntry | null {
  return cache.get(file) ?? null;
}

export function isPlyLoading(file: string): boolean {
  return loading.has(file);
}

export function onPlyProgress(file: string, cb: (pct: number) => void): () => void {
  if (!progressListeners.has(file)) progressListeners.set(file, new Set());
  progressListeners.get(file)!.add(cb);
  return () => { progressListeners.get(file)?.delete(cb); };
}

export function loadPly(file: string): Promise<CacheEntry> {
  // Already cached
  const cached = cache.get(file);
  if (cached) return Promise.resolve(cached);

  // Already loading — share the promise
  const existing = loading.get(file);
  if (existing) return existing;

  const promise = new Promise<CacheEntry>((resolve, reject) => {
    const loader = new PLYLoader();
    loader.load(
      file,
      (geo) => {
        geo.computeVertexNormals();
        geo.computeBoundingBox();

        // Center the geometry like the experiment does
        const center = new THREE.Vector3();
        geo.boundingBox!.getCenter(center).negate();
        geo.translate(center.x, center.y, center.z);

        // After centering, recompute bounds and save Z range
        geo.computeBoundingBox();
        const bb = geo.boundingBox!;
        const boundsZ: [number, number] = [bb.min.z, bb.max.z];

        // Save to store
        useConfigStore.getState().setPointCloudBoundsY(boundsZ[0], boundsZ[1]);

        const entry: CacheEntry = { geometry: geo, boundsZ };
        cache.set(file, entry);
        loading.delete(file);
        resolve(entry);
      },
      (xhr) => {
        if (xhr.total > 0) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          progressListeners.get(file)?.forEach((cb) => cb(pct));
        }
      },
      (err) => {
        loading.delete(file);
        console.error('PLY load error:', err);
        reject(err);
      },
    );
  });

  loading.set(file, promise);
  return promise;
}
