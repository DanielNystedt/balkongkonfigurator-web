import { useRef, useState, useCallback, useEffect } from 'react';
import { useConfigStore } from '../../store/useConfigStore';
import { CadGuidelineRenderer } from './CadGuidelineRenderer';
import { CadLevelOverlay } from './CadLevelOverlay';
import { distance2D } from '../../utils/math';
import type { Point2D } from '../../types/geometry';

const INITIAL_VIEW_SIZE = 6000;   // mm – initial visible width
const HIT_RADIUS_PX = 12;
const DRAG_THRESHOLD_PX = 4;


interface ViewBox { x: number; y: number; w: number; h: number }

// ─── Pure helpers ────────────────────────────────────────

function toMm(svg: SVGSVGElement, vb: ViewBox, cx: number, cy: number): Point2D {
  const r = svg.getBoundingClientRect();
  const svgX = vb.x + ((cx - r.left) / r.width) * vb.w;
  const svgY = vb.y + ((cy - r.top) / r.height) * vb.h;
  return { x: svgX, y: -svgY };
}

function hitRadius(svg: SVGSVGElement, vb: ViewBox): number {
  return (vb.w / svg.getBoundingClientRect().width) * HIT_RADIUS_PX;
}

function hitPoint(mm: Point2D, pts: Point2D[], r: number): number | null {
  let best: number | null = null, bestD = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = distance2D(mm.x, mm.y, pts[i].x, pts[i].y);
    if (d < r && d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function hitSegment(mm: Point2D, pts: Point2D[], r: number): number | null {
  let best: number | null = null, bestD = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = ptSegDist(mm, pts[i], pts[i + 1]);
    if (d < r && d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function ptSegDist(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x, dy = b.y - a.y, ls = dx * dx + dy * dy;
  if (ls < 1e-10) return distance2D(p.x, p.y, a.x, a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / ls));
  return distance2D(p.x, p.y, a.x + t * dx, a.y + t * dy);
}

function projectOnSeg(p: Point2D, a: Point2D, b: Point2D): Point2D {
  const dx = b.x - a.x, dy = b.y - a.y, ls = dx * dx + dy * dy;
  if (ls < 1e-10) return { ...a };
  const t = Math.max(0.05, Math.min(0.95, ((p.x - a.x) * dx + (p.y - a.y) * dy) / ls));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

// ─── Component ───────────────────────────────────────────

interface CadWorkspaceProps {
  /** When true, SVG bg is transparent (point cloud renders behind) */
  transparent?: boolean;
}

export function CadWorkspace({ transparent = false }: CadWorkspaceProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // viewBox always matches the container aspect ratio.
  // We track "center" + "mmPerPx" (zoom level) and derive w/h from container size.
  const centerRef = useRef<{ cx: number; cy: number }>({ cx: 0, cy: 0 });
  const zoomRef = useRef<number>(INITIAL_VIEW_SIZE); // visible width in mm
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 800, h: 600 });

  // Derived viewBox from center + zoom + container aspect ratio
  const aspect = containerSize.w / (containerSize.h || 1);
  const vbW = zoomRef.current;
  const vbH = vbW / aspect;
  const viewBox: ViewBox = {
    x: centerRef.current.cx - vbW / 2,
    y: centerRef.current.cy - vbH / 2,
    w: vbW,
    h: vbH,
  };

  // Force re-render counter (since we use refs for center/zoom)
  const [, forceRender] = useState(0);
  const rerender = () => forceRender((n) => n + 1);

  const [cursor, setCursor] = useState('default');

  // Mouse interaction refs
  const panRef = useRef<{ cx: number; cy: number; center: { cx: number; cy: number } } | null>(null);
  const dragRef = useRef<number | null>(null);
  const downRef = useRef<{ cx: number; cy: number } | null>(null);
  const movedRef = useRef(false);
  const levelDragRef = useRef(false);

  const store = () => useConfigStore.getState();

  // ─── Track container size with ResizeObserver ─────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ w: width, h: height });
        }
      }
    });
    ro.observe(el);
    // Initial size
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setContainerSize({ w: rect.width, h: rect.height });
    }
    return () => ro.disconnect();
  }, []);

  // ─── Publish viewBox to store for Three.js sync ─────
  const setCadViewBox = useConfigStore((s) => s.setCadViewBox);
  useEffect(() => {
    setCadViewBox(viewBox);
  }, [viewBox.x, viewBox.y, viewBox.w, viewBox.h, setCadViewBox]);

  // ─── Zoom (native listener to allow passive:false) ─────
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      // Zoom toward cursor
      const r = svg.getBoundingClientRect();
      const aspect = r.width / (r.height || 1);
      const curW = zoomRef.current;
      const curH = curW / aspect;
      const cx = centerRef.current.cx;
      const cy = centerRef.current.cy;
      const vbX = cx - curW / 2;
      const vbY = cy - curH / 2;

      // Mouse in SVG mm coords
      const mouseX = vbX + ((e.clientX - r.left) / r.width) * curW;
      const mouseY = vbY + ((e.clientY - r.top) / r.height) * curH;
      const mouseMmY = -mouseY; // SVG Y → mm Y

      const f = e.deltaY > 0 ? 1.1 : 0.9;
      const newW = curW * f;
      const newH = newW / aspect;

      // Keep mouse position stable in screen space
      const fracX = (e.clientX - r.left) / r.width;
      const fracY = (e.clientY - r.top) / r.height;
      const newVbX = mouseX - fracX * newW;
      const newVbY = mouseY - fracY * newH;

      zoomRef.current = newW;
      centerRef.current = {
        cx: newVbX + newW / 2,
        cy: newVbY + newH / 2,
      };
      rerender();
    };
    svg.addEventListener('wheel', handler, { passive: false });
    return () => svg.removeEventListener('wheel', handler);
  }, []);

  // ─── Mouse down ────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current; if (!svg) return;
    if (levelDragRef.current) return;

    // Pan (middle click or ctrl+left)
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      e.preventDefault();
      panRef.current = {
        cx: e.clientX,
        cy: e.clientY,
        center: { ...centerRef.current },
      };
      setCursor('grabbing');
      return;
    }
    if (e.button !== 0) return;

    downRef.current = { cx: e.clientX, cy: e.clientY };
    movedRef.current = false;

    const s = store();
    // Vertex drag — always enabled when points exist
    if (s.guidePoints.length > 0) {
      const mm = toMm(svg, viewBox, e.clientX, e.clientY);
      const idx = hitPoint(mm, s.guidePoints, hitRadius(svg, viewBox));
      if (idx !== null) {
        dragRef.current = idx;
        setCursor('grabbing');
        e.preventDefault();
      }
    }
  }, [viewBox]);

  // ─── Mouse move ────────────────────────────────────────
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current; if (!svg) return;

    // Pan
    if (panRef.current) {
      const p = panRef.current;
      const r = svg.getBoundingClientRect();
      const aspect = r.width / (r.height || 1);
      const curW = zoomRef.current;
      const curH = curW / aspect;
      const dxPx = e.clientX - p.cx;
      const dyPx = e.clientY - p.cy;
      centerRef.current = {
        cx: p.center.cx - (dxPx / r.width) * curW,
        cy: p.center.cy - (dyPx / r.height) * curH,
      };
      rerender();
      return;
    }

    // Drag vertex
    if (dragRef.current !== null) {
      if (!movedRef.current && downRef.current) {
        const dx = e.clientX - downRef.current.cx, dy = e.clientY - downRef.current.cy;
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD_PX) return;
        movedRef.current = true;
      }
      store().movePoint(dragRef.current, toMm(svg, viewBox, e.clientX, e.clientY));
      return;
    }

    // Preview while drawing
    if (store().isDrawing) {
      store().setPreviewPoint(toMm(svg, viewBox, e.clientX, e.clientY));
    }
  }, [viewBox]);

  // ─── Mouse up ──────────────────────────────────────────
  const onMouseUp = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current; if (!svg) return;

    // End pan
    if (panRef.current) {
      panRef.current = null;
      setCursor(store().isDrawing ? 'crosshair' : 'default');
      return;
    }

    // End vertex drag — never add a point
    if (dragRef.current !== null) {
      dragRef.current = null;
      setCursor('default');
      return;
    }

    if (e.button !== 0 || e.ctrlKey) return;

    // Check it was a click (not a drag)
    if (downRef.current) {
      const dx = e.clientX - downRef.current.cx, dy = e.clientY - downRef.current.cy;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) {
        downRef.current = null;
        return;
      }
    }
    downRef.current = null;

    const s = store();

    // DRAWING phase: click = add point
    if (s.isDrawing) {
      const mm = toMm(svg, viewBox, e.clientX, e.clientY);
      s.addPoint(mm);
      return;
    }

    // Start new guideline
    if (s.activeMode === 'draw-guide' && s.guidePoints.length === 0) {
      const mm = toMm(svg, viewBox, e.clientX, e.clientY);
      s.setIsDrawing(true);
      setCursor('crosshair');
      s.addPoint(mm);
      return;
    }

    // EDIT phase: click on segment → select
    if (s.guidePoints.length >= 2) {
      const mm = toMm(svg, viewBox, e.clientX, e.clientY);
      const si = hitSegment(mm, s.guidePoints, hitRadius(svg, viewBox));
      s.setSelectedSegmentIndex(si);
    }
  }, [viewBox]);

  // ─── Double click ──────────────────────────────────────
  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const svg = svgRef.current; if (!svg) return;
    const s = store();
    const mm = toMm(svg, viewBox, e.clientX, e.clientY);

    if (s.isDrawing) {
      if (s.guidePoints.length >= 2) s.undoLastPoint();
      s.setIsDrawing(false);
      setCursor('default');
      return;
    }

    const pts = s.guidePoints;
    if (pts.length > 0) {
      const r = hitRadius(svg, viewBox);
      const pi = hitPoint(mm, pts, r);
      if (pi !== null) { s.removePoint(pi); return; }
      const si = hitSegment(mm, pts, r);
      if (si !== null) {
        s.insertPointOnSegment(si, projectOnSeg(mm, pts[si], pts[si + 1]));
        return;
      }
    }
  }, [viewBox]);

  const onContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), []);

  // Global mouseup safety
  useEffect(() => {
    const h = () => {
      panRef.current = null;
      dragRef.current = null;
      downRef.current = null;
      setCursor(store().isDrawing ? 'crosshair' : 'default');
    };
    window.addEventListener('mouseup', h);
    return () => window.removeEventListener('mouseup', h);
  }, []);

  // Sync cursor with drawing state
  const isDrawing = useConfigStore((s) => s.isDrawing);
  useEffect(() => {
    if (!dragRef.current && !panRef.current && !levelDragRef.current) {
      setCursor(isDrawing ? 'crosshair' : 'default');
    }
  }, [isDrawing]);

  // Level drag blocking
  const onLevelDragStart = useCallback(() => {
    levelDragRef.current = true;
    setCursor('ns-resize');
  }, []);
  const onLevelDragEnd = useCallback(() => {
    levelDragRef.current = false;
    setCursor('default');
  }, []);

  const activeMode = useConfigStore((s) => s.activeMode);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        width={containerSize.w}
        height={containerSize.h}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="none"
        className={transparent ? '' : 'bg-[#0a0f1a]'}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        style={{ cursor, display: 'block' }}
      >
        {!transparent && <CadGrid viewBox={viewBox} />}
        <CadGuidelineRenderer viewBox={viewBox} />
        {activeMode === 'levels' && (
          <CadLevelOverlay
            viewBox={viewBox}
            svgRef={svgRef}
            onDragStart={onLevelDragStart}
            onDragEnd={onLevelDragEnd}
          />
        )}
      </svg>
    </div>
  );
}

// ─── Grid ────────────────────────────────────────────────

function CadGrid({ viewBox }: { viewBox: ViewBox }) {
  const gridSizes = [100, 250, 500, 1000, 2500, 5000];
  const gs = gridSizes.find(s => s >= viewBox.w / 20) ?? gridSizes[gridSizes.length - 1];
  const mj = gs >= 1000 ? 1 : gs >= 500 ? 2 : 5;
  const sx = Math.floor(viewBox.x / gs) * gs, sy = Math.floor(viewBox.y / gs) * gs;
  const ex = viewBox.x + viewBox.w, ey = viewBox.y + viewBox.h;
  const lines: React.ReactNode[] = [];
  let k = 0;
  for (let x = sx; x <= ex; x += gs) {
    const m = Math.round(x / gs) % mj === 0;
    lines.push(<line key={k++} x1={x} y1={viewBox.y} x2={x} y2={ey}
      stroke={m ? '#1e293b' : '#131b2e'} strokeWidth={viewBox.w * (m ? 0.0005 : 0.0003)} />);
  }
  for (let y = sy; y <= ey; y += gs) {
    const m = Math.round(y / gs) % mj === 0;
    lines.push(<line key={k++} x1={viewBox.x} y1={y} x2={ex} y2={y}
      stroke={m ? '#1e293b' : '#131b2e'} strokeWidth={viewBox.w * (m ? 0.0005 : 0.0003)} />);
  }
  const aw = viewBox.w * 0.001;
  return (
    <g>
      {lines}
      <line x1={viewBox.x} y1={0} x2={ex} y2={0} stroke="#ef4444" strokeWidth={aw} opacity={0.4} />
      <line x1={0} y1={viewBox.y} x2={0} y2={ey} stroke="#22c55e" strokeWidth={aw} opacity={0.4} />
    </g>
  );
}
