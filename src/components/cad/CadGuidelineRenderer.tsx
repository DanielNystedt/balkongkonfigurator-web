import { useState, useRef, useEffect, useCallback } from 'react';
import { useConfigStore } from '../../store/useConfigStore';
import type { Point2D } from '../../types/geometry';
import { distance2D } from '../../utils/math';

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Convert internal mm (y-up) to SVG coords (y-down): just negate Y */
function toSvg(p: Point2D): { x: number; y: number } {
  return { x: p.x, y: -p.y };
}

// ─── Editable dimension label ───────────────────────────────
function DimensionLabel({
  start,
  end,
  length,
  segmentIndex,
  color,
  scale,
}: {
  start: Point2D;
  end: Point2D;
  length: number;
  segmentIndex: number;
  color: string;
  scale: number;
}) {
  const updateSegmentLength = useConfigStore((s) => s.updateSegmentLength);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const s = toSvg(start);
  const e = toSvg(end);
  const mx = (s.x + e.x) / 2;
  const my = (s.y + e.y) / 2;

  // Offset perpendicular to segment
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = len > 0 ? -dy / len : 0;
  const ny = len > 0 ? dx / len : 0;
  const offset = 30 * scale;
  const lx = mx + nx * offset;
  const ly = my + ny * offset;

  const fontSize = 12 * scale;

  const handleClick = useCallback(
    (ev: React.MouseEvent) => {
      ev.stopPropagation();
      setValue(Math.round(length).toString());
      setEditing(true);
    },
    [length],
  );

  const commit = useCallback(() => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      updateSegmentLength(segmentIndex, num);
    }
    setEditing(false);
  }, [value, segmentIndex, updateSegmentLength]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (editing) {
    const inputW = 70 * scale;
    const inputH = 18 * scale;
    return (
      <foreignObject
        x={lx - inputW / 2}
        y={ly - inputH / 2}
        width={inputW}
        height={inputH}
        style={{ pointerEvents: 'auto' }}
      >
        <input
          ref={inputRef}
          type="number"
          value={value}
          onChange={(ev) => setValue(ev.target.value)}
          onKeyDown={(ev) => {
            ev.stopPropagation();
            if (ev.key === 'Enter') commit();
            if (ev.key === 'Escape') setEditing(false);
          }}
          onBlur={commit}
          onMouseDown={(ev) => ev.stopPropagation()}
          style={{
            width: '100%',
            height: '100%',
            fontSize: `${fontSize * 0.9}px`,
            textAlign: 'center',
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #3b82f6',
            borderRadius: '2px',
            outline: 'none',
            padding: 0,
          }}
        />
      </foreignObject>
    );
  }

  return (
    <text
      x={lx}
      y={ly}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={color}
      fontSize={fontSize}
      fontFamily="monospace"
      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
      onMouseDown={(ev) => ev.stopPropagation()}
      onMouseUp={(ev) => ev.stopPropagation()}
      onClick={handleClick}
    >
      {Math.round(length)} mm
    </text>
  );
}

// ─── Editable angle label ───────────────────────────────────
function AngleLabel({
  vertex,
  angle,
  vertexIndex,
  scale,
}: {
  vertex: Point2D;
  angle: number;
  vertexIndex: number;
  scale: number;
}) {
  const updateAngle = useConfigStore((s) => s.updateAngle);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sv = toSvg(vertex);
  const fontSize = 12 * scale;

  const handleClick = useCallback(
    (ev: React.MouseEvent) => {
      ev.stopPropagation();
      setValue(angle.toFixed(1));
      setEditing(true);
    },
    [angle],
  );

  const commit = useCallback(() => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0 && num < 360) {
      updateAngle(vertexIndex, num);
    }
    setEditing(false);
  }, [value, vertexIndex, updateAngle]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (editing) {
    const inputW = 60 * scale;
    const inputH = 18 * scale;
    return (
      <foreignObject
        x={sv.x - inputW / 2}
        y={sv.y - inputH * 1.5}
        width={inputW}
        height={inputH}
        style={{ pointerEvents: 'auto' }}
      >
        <input
          ref={inputRef}
          type="number"
          value={value}
          onChange={(ev) => setValue(ev.target.value)}
          onKeyDown={(ev) => {
            ev.stopPropagation();
            if (ev.key === 'Enter') commit();
            if (ev.key === 'Escape') setEditing(false);
          }}
          onBlur={commit}
          onMouseDown={(ev) => ev.stopPropagation()}
          style={{
            width: '100%',
            height: '100%',
            fontSize: `${fontSize * 0.9}px`,
            textAlign: 'center',
            background: '#1e293b',
            color: '#c084fc',
            border: '1px solid #7c3aed',
            borderRadius: '2px',
            outline: 'none',
            padding: 0,
          }}
        />
      </foreignObject>
    );
  }

  return (
    <text
      x={sv.x}
      y={sv.y - 15 * scale}
      textAnchor="middle"
      dominantBaseline="middle"
      fill="#c084fc"
      fontSize={fontSize}
      fontFamily="monospace"
      fontWeight="bold"
      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
      onMouseDown={(ev) => ev.stopPropagation()}
      onMouseUp={(ev) => ev.stopPropagation()}
      onClick={handleClick}
    >
      {angle.toFixed(1)}°
    </text>
  );
}

// ─── Vertex dot ─────────────────────────────────────────────
function VertexDot({
  point,
  color,
  radius,
}: {
  point: Point2D;
  color: string;
  radius: number;
}) {
  const sv = toSvg(point);

  return (
    <circle
      cx={sv.x}
      cy={sv.y}
      r={radius}
      fill={color}
      stroke="#fff"
      strokeWidth={radius * 0.3}
      style={{ pointerEvents: 'none' }}
    />
  );
}

// ─── Main renderer ───────────────────────────────────────────
export function CadGuidelineRenderer({ viewBox }: { viewBox: ViewBox }) {
  const guidePoints = useConfigStore((s) => s.guidePoints);
  const previewPoint = useConfigStore((s) => s.previewPoint);
  const isDrawing = useConfigStore((s) => s.isDrawing);
  const getSegments = useConfigStore((s) => s.getSegments);
  const getAngles = useConfigStore((s) => s.getAngles);
  const getOffsetPoints = useConfigStore((s) => s.getOffsetPoints);

  // Scale factor: how many mm per pixel-ish unit for text/dots
  const scale = viewBox.w / 800;

  const segments = getSegments();
  const angles = getAngles();
  const offsetPoints = getOffsetPoints();

  const strokeW = 2 * scale;
  const dotR = 5 * scale;

  // Preview segment (only while drawing)
  let previewSeg: { start: Point2D; end: Point2D; length: number } | null = null;
  if (isDrawing && previewPoint && guidePoints.length > 0) {
    const last = guidePoints[guidePoints.length - 1];
    previewSeg = {
      start: last,
      end: previewPoint,
      length: distance2D(last.x, last.y, previewPoint.x, previewPoint.y),
    };
  }

  if (guidePoints.length === 0 && !previewSeg) return null;

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Red main polyline segments */}
      {segments.map((seg, i) => {
        const s = toSvg(seg.start);
        const e = toSvg(seg.end);
        return (
          <g key={`seg-${i}`}>
            <line
              x1={s.x} y1={s.y} x2={e.x} y2={e.y}
              stroke="#ef4444"
              strokeWidth={strokeW}
            />
            <DimensionLabel
              start={seg.start}
              end={seg.end}
              length={seg.length}
              segmentIndex={seg.index}
              color="#9ca3af"
              scale={scale}
            />
          </g>
        );
      })}

      {/* Orange offset polyline */}
      {offsetPoints.length >= 2 && (
        <polyline
          points={offsetPoints.map((p) => { const s = toSvg(p); return `${s.x},${s.y}`; }).join(' ')}
          fill="none"
          stroke="#f97316"
          strokeWidth={strokeW * 0.8}
        />
      )}

      {/* Green preview segment (dashed) — only while drawing */}
      {previewSeg && (() => {
        const s = toSvg(previewSeg.start);
        const e = toSvg(previewSeg.end);
        return (
          <g>
            <line
              x1={s.x} y1={s.y} x2={e.x} y2={e.y}
              stroke="#22c55e"
              strokeWidth={strokeW}
              strokeDasharray={`${20 * scale} ${12 * scale}`}
            />
            <text
              x={(s.x + e.x) / 2}
              y={(s.y + e.y) / 2 - 15 * scale}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#22c55e"
              fontSize={12 * scale}
              fontFamily="monospace"
            >
              {Math.round(previewSeg.length)} mm
            </text>
          </g>
        );
      })()}

      {/* Vertex dots */}
      {guidePoints.map((pt, i) => (
        <VertexDot
          key={`pt-${i}`}
          point={pt}
          color="#ffffff"
          radius={dotR}
        />
      ))}

      {/* Angle labels — needs pointer events for inline editing */}
      <g style={{ pointerEvents: 'auto' }}>
        {angles.map((a) => (
          <AngleLabel
            key={`angle-${a.index}`}
            vertex={a.vertex}
            angle={a.angle}
            vertexIndex={a.index}
            scale={scale}
          />
        ))}
      </g>

      {/* Dimension labels — needs pointer events for inline editing */}
      {/* (already rendered inside segments loop above) */}
    </g>
  );
}
