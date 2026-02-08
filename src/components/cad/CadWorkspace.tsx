import { useRef, useState, useCallback, useEffect } from 'react';
import { useConfigStore } from '../../store/useConfigStore';
import { CadGuidelineRenderer } from './CadGuidelineRenderer';
import { distance2D } from '../../utils/math';
import type { Point2D } from '../../types/geometry';

const INITIAL_VIEW_SIZE = 6000;
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

export function CadWorkspace() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState<ViewBox>({
    x: -INITIAL_VIEW_SIZE / 2, y: -INITIAL_VIEW_SIZE / 2,
    w: INITIAL_VIEW_SIZE, h: INITIAL_VIEW_SIZE,
  });
  const [cursor, setCursor] = useState('default');

  // Mouse interaction refs
  const panRef = useRef<{ cx: number; cy: number; vb: ViewBox } | null>(null);
  const dragRef = useRef<number | null>(null);
  const downRef = useRef<{ cx: number; cy: number } | null>(null);
  const movedRef = useRef(false);

  const store = () => useConfigStore.getState();

  // ─── Zoom ──────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const svg = svgRef.current; if (!svg) return;
    const mm = toMm(svg, viewBox, e.clientX, e.clientY);
    const sy = -mm.y, f = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox(vb => {
      const nw = vb.w * f, nh = vb.h * f;
      return {
        x: mm.x - ((mm.x - vb.x) / vb.w) * nw,
        y: sy - ((sy - vb.y) / vb.h) * nh,
        w: nw, h: nh,
      };
    });
  }, [viewBox]);

  // ─── Mouse down ────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current; if (!svg) return;

    // Pan
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      e.preventDefault();
      panRef.current = { cx: e.clientX, cy: e.clientY, vb: { ...viewBox } };
      setCursor('grabbing');
      return;
    }
    if (e.button !== 0) return;

    downRef.current = { cx: e.clientX, cy: e.clientY };
    movedRef.current = false;

    const s = store();
    // EDIT phase: prepare vertex drag
    if (!s.isDrawing && s.guidePoints.length >= 2) {
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
      const p = panRef.current, r = svg.getBoundingClientRect();
      setViewBox({
        ...p.vb,
        x: p.vb.x - (e.clientX - p.cx) * (p.vb.w / r.width),
        y: p.vb.y - (e.clientY - p.cy) * (p.vb.h / r.height),
      });
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

    // Check it was a click (not a drag on empty space)
    if (downRef.current) {
      const dx = e.clientX - downRef.current.cx, dy = e.clientY - downRef.current.cy;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) {
        downRef.current = null;
        return;
      }
    }
    downRef.current = null;

    const s = store();

    // DRAWING phase: click = add point immediately
    if (s.isDrawing) {
      const mm = toMm(svg, viewBox, e.clientX, e.clientY);
      s.addPoint(mm);
      return;
    }

    // Start new guideline (only if no points exist)
    if (s.activeMode === 'draw-guide' && s.guidePoints.length === 0) {
      const mm = toMm(svg, viewBox, e.clientX, e.clientY);
      s.setIsDrawing(true);
      setCursor('crosshair');
      s.addPoint(mm);
      return;
    }

    // EDIT phase: click on empty space → nothing
  }, [viewBox]);

  // ─── Double click ──────────────────────────────────────
  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const svg = svgRef.current; if (!svg) return;
    const s = store();
    const mm = toMm(svg, viewBox, e.clientX, e.clientY);

    // DRAWING: the 2 mouseups before dblclick added 2 points at same spot.
    // Remove the duplicate (second one), keep the first. Then finish.
    if (s.isDrawing) {
      if (s.guidePoints.length >= 2) {
        s.undoLastPoint(); // remove duplicate
      }
      s.setIsDrawing(false);
      setCursor('default');
      return;
    }

    // EDIT: dblclick on vertex → remove
    const pts = s.guidePoints;
    if (pts.length > 0) {
      const r = hitRadius(svg, viewBox);
      const pi = hitPoint(mm, pts, r);
      if (pi !== null) { s.removePoint(pi); return; }

      // EDIT: dblclick on segment → insert vertex
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
    if (!dragRef.current && !panRef.current) {
      setCursor(isDrawing ? 'crosshair' : 'default');
    }
  }, [isDrawing]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full bg-gray-950"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{ cursor }}
    >
      <CadGrid viewBox={viewBox} />
      <CadGuidelineRenderer viewBox={viewBox} />
    </svg>
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
      stroke={m ? '#374151' : '#1f2937'} strokeWidth={viewBox.w * (m ? 0.0005 : 0.0003)} />);
  }
  for (let y = sy; y <= ey; y += gs) {
    const m = Math.round(y / gs) % mj === 0;
    lines.push(<line key={k++} x1={viewBox.x} y1={y} x2={ex} y2={y}
      stroke={m ? '#374151' : '#1f2937'} strokeWidth={viewBox.w * (m ? 0.0005 : 0.0003)} />);
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
