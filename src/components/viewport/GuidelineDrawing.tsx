import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Html, Line } from '@react-three/drei';
import { useConfigStore } from '../../store/useConfigStore';
import type { Point2D } from '../../types/geometry';

/** Convert mm (X/Y horizontal) to Three.js (meters, Y-up) at given height. */
function toThree(p: Point2D, y: number): [number, number, number] {
  return [p.x / 1000, y, -p.y / 1000];
}

/** Midpoint between two points in mm. */
function midpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// ─── Polyline using drei Line ───────────────────────────────
function PolyLine({ points, color, lineWidth = 2, height }: {
  points: Point2D[];
  color: string;
  lineWidth?: number;
  height: number;
}) {
  const positions = useMemo(
    () => points.map((p) => toThree(p, height)),
    [points, height],
  );

  if (positions.length < 2) return null;

  return (
    <Line
      points={positions}
      color={color}
      lineWidth={lineWidth}
      depthTest={false}
      renderOrder={10}
    />
  );
}

// ─── Single segment line ────────────────────────────────────
function SegmentLine({ start, end, color, height }: {
  start: Point2D;
  end: Point2D;
  color: string;
  height: number;
}) {
  const positions = useMemo(
    () => [toThree(start, height), toThree(end, height)] as [
      [number, number, number],
      [number, number, number],
    ],
    [start, end, height],
  );

  return (
    <Line
      points={positions}
      color={color}
      lineWidth={2}
      depthTest={false}
      renderOrder={10}
    />
  );
}

// ─── Vertex dot ─────────────────────────────────────────────
function VertexDot({ point, color = '#ffffff', height }: { point: Point2D; color?: string; height: number }) {
  const [x, y, z] = toThree(point, height);
  return (
    <mesh position={[x, y, z]} renderOrder={11}>
      <sphereGeometry args={[0.012, 8, 8]} />
      <meshBasicMaterial color={color} depthTest={false} />
    </mesh>
  );
}

// ─── Editable dimension label ───────────────────────────────
function DimensionLabel({ start, end, length, segmentIndex, height }: {
  start: Point2D;
  end: Point2D;
  length: number;
  segmentIndex: number;
  height: number;
}) {
  const updateSegmentLength = useConfigStore((s) => s.updateSegmentLength);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const mid = midpoint(start, end);
  const [x, , z] = toThree(mid, height);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = len > 0 ? -dy / len : 0;
  const ny = len > 0 ? dx / len : 0;
  const offsetMm = 50;
  const labelPos: [number, number, number] = [
    x + (nx * offsetMm) / 1000,
    height + 0.01,
    z - (ny * offsetMm) / 1000,
  ];

  const startEdit = useCallback(() => {
    setValue(String(Math.round(length)));
    setEditing(true);
  }, [length]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      updateSegmentLength(segmentIndex, num);
    }
    setEditing(false);
  }, [value, segmentIndex, updateSegmentLength]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setEditing(false);
    e.stopPropagation();
  }, [commit]);

  return (
    <Html position={labelPos} center style={{ pointerEvents: 'auto', zIndex: 100 }}>
      {editing ? (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          style={{
            width: 70,
            fontSize: '22px',
            fontFamily: 'monospace',
            color: '#ef4444',
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid #ef4444',
            borderRadius: 3,
            textAlign: 'center',
            outline: 'none',
            padding: '1px 4px',
          }}
        />
      ) : (
        <div
          onClick={startEdit}
          style={{
            color: '#ef4444',
            fontSize: '22px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            textShadow: '0 0 4px black, 0 0 8px black',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          {Math.round(length)} mm
        </div>
      )}
    </Html>
  );
}

// ─── Non-editable preview dimension label ───────────────────
function PreviewDimensionLabel({ start, end, length, height }: {
  start: Point2D;
  end: Point2D;
  length: number;
  height: number;
}) {
  const mid = midpoint(start, end);
  const [x, , z] = toThree(mid, height);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = len > 0 ? -dy / len : 0;
  const ny = len > 0 ? dx / len : 0;
  const offsetMm = 50;
  const labelPos: [number, number, number] = [
    x + (nx * offsetMm) / 1000,
    height + 0.01,
    z - (ny * offsetMm) / 1000,
  ];

  return (
    <Html position={labelPos} center style={{ pointerEvents: 'none', zIndex: 100 }}>
      <div
        style={{
          color: '#60a5fa',
          fontSize: '22px',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          textShadow: '0 0 4px black, 0 0 8px black',
        }}
      >
        {Math.round(length)} mm
      </div>
    </Html>
  );
}

// ─── Editable angle label ──────────────────────────────────
function AngleLabel({ vertex, angle, vertexIndex, height }: {
  vertex: Point2D;
  angle: number;
  vertexIndex: number;
  height: number;
}) {
  const updateAngle = useConfigStore((s) => s.updateAngle);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [x, , z] = toThree(vertex, height);

  const startEdit = useCallback(() => {
    setValue(angle.toFixed(1));
    setEditing(true);
  }, [angle]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0 && num < 360) {
      updateAngle(vertexIndex, num);
    }
    setEditing(false);
  }, [value, vertexIndex, updateAngle]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setEditing(false);
    e.stopPropagation();
  }, [commit]);

  return (
    <Html position={[x, height + 0.01, z]} center style={{ pointerEvents: 'auto', zIndex: 100 }}>
      {editing ? (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          style={{
            width: 60,
            fontSize: '20px',
            fontFamily: 'monospace',
            color: '#c084fc',
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid #c084fc',
            borderRadius: 3,
            textAlign: 'center',
            outline: 'none',
            padding: '1px 4px',
          }}
        />
      ) : (
        <div
          onClick={startEdit}
          style={{
            color: '#c084fc',
            fontSize: '20px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            textShadow: '0 0 4px black, 0 0 8px black',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          {angle.toFixed(1)}°
        </div>
      )}
    </Html>
  );
}

// ─── Main component ─────────────────────────────────────────
export function GuidelineDrawing() {
  const guidePoints = useConfigStore((s) => s.guidePoints);
  const previewPoint = useConfigStore((s) => s.previewPoint);
  const isDrawing = useConfigStore((s) => s.isDrawing);
  const getSegments = useConfigStore((s) => s.getSegments);
  const getAngles = useConfigStore((s) => s.getAngles);
  const getOffsetPoints = useConfigStore((s) => s.getOffsetPoints);
  // Guide always renders on the Mellanstycke (middle) plane
  const mellanZ = useConfigStore((s) => s.levels.levels.Mellanstycke.zPosition);
  const guideHeight = mellanZ / 1000; // mm → meters

  const segments = getSegments();
  const angles = getAngles();
  const offsetPoints = getOffsetPoints();

  // Preview segment: from last guide point to snapped preview
  const lastPt = guidePoints.length > 0 ? guidePoints[guidePoints.length - 1] : null;
  const showPreview = isDrawing && lastPt && previewPoint;
  const previewLength = showPreview
    ? Math.sqrt((previewPoint.x - lastPt.x) ** 2 + (previewPoint.y - lastPt.y) ** 2)
    : 0;

  if (guidePoints.length === 0 && !showPreview) return null;

  return (
    <group renderOrder={10}>
      {/* Red main polyline segments */}
      {segments.map((seg, i) => (
        <group key={`seg-${i}`}>
          <SegmentLine start={seg.start} end={seg.end} color="#ef4444" height={guideHeight} />
          <DimensionLabel
            start={seg.start}
            end={seg.end}
            length={seg.length}
            segmentIndex={i}
            height={guideHeight}
          />
        </group>
      ))}

      {/* Preview segment while drawing */}
      {showPreview && (
        <group>
          <SegmentLine start={lastPt} end={previewPoint} color="#60a5fa" height={guideHeight} />
          {previewLength > 10 && (
            <PreviewDimensionLabel
              start={lastPt}
              end={previewPoint}
              length={previewLength}
              height={guideHeight}
            />
          )}
        </group>
      )}

      {/* Orange offset line */}
      {offsetPoints.length >= 2 && (
        <PolyLine points={offsetPoints} color="#f97316" height={guideHeight} />
      )}

      {/* Vertex dots */}
      {guidePoints.map((pt, i) => (
        <VertexDot key={`pt-${i}`} point={pt} color="#ffffff" height={guideHeight} />
      ))}

      {/* Angle labels at corners — clickable to edit */}
      {angles.map((a, i) => (
        <AngleLabel
          key={`angle-${i}`}
          vertex={a.vertex}
          angle={a.angle}
          vertexIndex={a.index}
          height={guideHeight}
        />
      ))}
    </group>
  );
}
