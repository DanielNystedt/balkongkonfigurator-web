import { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import { useConfigStore } from '../../store/useConfigStore';
import type { Point2D } from '../../types/geometry';

/** Convert mm (X/Y horizontal) to Three.js (meters, Y-up). */
function toThree(p: Point2D): [number, number, number] {
  return [p.x / 1000, 0.01, -p.y / 1000];
}

/** Midpoint between two points in mm. */
function midpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// ─── Polyline using drei Line ───────────────────────────────
function PolyLine({ points, color, lineWidth = 2 }: {
  points: Point2D[];
  color: string;
  lineWidth?: number;
}) {
  const positions = useMemo(
    () => points.map((p) => toThree(p)),
    [points],
  );

  if (positions.length < 2) return null;

  return (
    <Line
      points={positions}
      color={color}
      lineWidth={lineWidth}
    />
  );
}

// ─── Single segment line ────────────────────────────────────
function SegmentLine({ start, end, color }: {
  start: Point2D;
  end: Point2D;
  color: string;
}) {
  const positions = useMemo(
    () => [toThree(start), toThree(end)] as [
      [number, number, number],
      [number, number, number],
    ],
    [start, end],
  );

  return (
    <Line
      points={positions}
      color={color}
      lineWidth={2}
    />
  );
}

// ─── Vertex dot ─────────────────────────────────────────────
function VertexDot({ point, color = '#ffffff' }: { point: Point2D; color?: string }) {
  const [x, y, z] = toThree(point);
  return (
    <mesh position={[x, y, z]}>
      <sphereGeometry args={[0.03, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

// ─── Dimension label ────────────────────────────────────────
function DimensionLabel({ start, end, length, color = '#aaa' }: {
  start: Point2D;
  end: Point2D;
  length: number;
  color?: string;
}) {
  const mid = midpoint(start, end);
  const [x, , z] = toThree(mid);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = len > 0 ? -dy / len : 0;
  const ny = len > 0 ? dx / len : 0;
  const offsetMm = 40;
  const labelPos: [number, number, number] = [
    x + (nx * offsetMm) / 1000,
    0.02,
    z - (ny * offsetMm) / 1000,
  ];

  return (
    <Html position={labelPos} center style={{ pointerEvents: 'none' }}>
      <div
        style={{
          color,
          fontSize: '11px',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          textShadow: '0 0 3px black, 0 0 6px black',
        }}
      >
        {Math.round(length)} mm
      </div>
    </Html>
  );
}

// ─── Angle label ────────────────────────────────────────────
function AngleLabel({ vertex, angle }: { vertex: Point2D; angle: number }) {
  const [x, , z] = toThree(vertex);
  return (
    <Html position={[x, 0.02, z]} center style={{ pointerEvents: 'none' }}>
      <div
        style={{
          color: '#c084fc',
          fontSize: '11px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          textShadow: '0 0 3px black, 0 0 6px black',
        }}
      >
        {angle.toFixed(1)}°
      </div>
    </Html>
  );
}

// ─── Main component ─────────────────────────────────────────
export function GuidelineDrawing() {
  const guidePoints = useConfigStore((s) => s.guidePoints);
  const getSegments = useConfigStore((s) => s.getSegments);
  const getAngles = useConfigStore((s) => s.getAngles);
  const getOffsetPoints = useConfigStore((s) => s.getOffsetPoints);

  const segments = getSegments();
  const angles = getAngles();
  const offsetPoints = getOffsetPoints();

  if (guidePoints.length === 0) return null;

  return (
    <group>
      {/* Red main polyline segments */}
      {segments.map((seg, i) => (
        <group key={`seg-${i}`}>
          <SegmentLine start={seg.start} end={seg.end} color="#ef4444" />
          <DimensionLabel
            start={seg.start}
            end={seg.end}
            length={seg.length}
            color="#9ca3af"
          />
        </group>
      ))}

      {/* Orange offset line */}
      {offsetPoints.length >= 2 && (
        <PolyLine points={offsetPoints} color="#f97316" />
      )}

      {/* Vertex dots */}
      {guidePoints.map((pt, i) => (
        <VertexDot key={`pt-${i}`} point={pt} color="#ffffff" />
      ))}

      {/* Angle labels at corners */}
      {angles.map((a, i) => (
        <AngleLabel key={`angle-${i}`} vertex={a.vertex} angle={a.angle} />
      ))}
    </group>
  );
}
