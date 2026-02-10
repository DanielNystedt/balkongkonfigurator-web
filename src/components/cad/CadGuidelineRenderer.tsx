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

/**
 * Compute the signed area of a polyline (not necessarily closed).
 * Positive = counter-clockwise, Negative = clockwise (in internal y-up coords).
 * For an open polyline (like our guide), this tells us the winding direction.
 */
function polylineSignedArea(points: Point2D[]): number {
  let area = 0;
  for (let i = 0; i < points.length - 1; i++) {
    area += (points[i + 1].x - points[i].x) * (points[i + 1].y + points[i].y);
  }
  return area;
}

// ─── Panel visualization along a segment ─────────────────────
function PanelViz({
  start,
  end,
  panels,
  scale,
  isSelected,
  outwardSign,
}: {
  start: Point2D;
  end: Point2D;
  panels: { length: number; offsetLeft: number; offsetRight: number; opening: string }[];
  scale: number;
  isSelected: boolean;
  outwardSign: number; // +1 or -1 to flip perpendicular direction
}) {
  if (panels.length === 0) return null;

  const s = toSvg(start);
  const e = toSvg(end);
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const segLen = Math.sqrt(dx * dx + dy * dy);
  if (segLen < 1) return null;

  // Unit direction along segment
  const ux = dx / segLen;
  const uy = dy / segLen;
  // Perpendicular — direction controlled by outwardSign
  // Base: (-uy, ux) is left-side perpendicular in SVG coords
  const nx = -uy * outwardSign;
  const ny = ux * outwardSign;

  const panelHeight = 30 * scale; // visual height of panel rectangles
  const gap = 2 * scale;

  const rects: React.ReactNode[] = [];
  let pos = 0; // current position along segment

  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    pos += p.offsetLeft;
    const panelStart = pos;
    const panelEnd = pos + p.length;
    pos = panelEnd + p.offsetRight;

    // Panel rectangle corners (offset perpendicular from segment)
    const x1 = s.x + ux * panelStart;
    const y1 = s.y + uy * panelStart;
    const x2 = s.x + ux * panelEnd;
    const y2 = s.y + uy * panelEnd;

    const offN = panelHeight * 0.1; // small offset from line
    // Rectangle: 4 corners
    const ax = x1 + nx * offN;
    const ay = y1 + ny * offN;
    const bx = x2 + nx * offN;
    const by = y2 + ny * offN;
    const cx = x2 + nx * (offN + panelHeight);
    const cy = y2 + ny * (offN + panelHeight);
    const ddx = x1 + nx * (offN + panelHeight);
    const ddy = y1 + ny * (offN + panelHeight);

    const isFixed = p.opening === 'X';
    const fillColor = isFixed
      ? 'rgba(100,150,255,0.15)'
      : isSelected
        ? 'rgba(96,165,250,0.2)'
        : 'rgba(239,68,68,0.12)';
    const strokeColor = isFixed
      ? '#6496ff'
      : isSelected
        ? '#60a5fa'
        : '#ef4444';

    rects.push(
      <g key={`panel-${i}`}>
        <polygon
          points={`${ax},${ay} ${bx},${by} ${cx},${cy} ${ddx},${ddy}`}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={scale * 0.8}
        />
        {/* Opening direction arrow or X for fixed */}
        {(() => {
          const midX = (ax + bx + cx + ddx) / 4;
          const midY = (ay + by + cy + ddy) / 4;
          const aLen = Math.min(p.length * 0.25, 60);
          if (isFixed) {
            // X mark
            const sz = 8 * scale;
            return (
              <g>
                <line x1={midX - sz} y1={midY - sz} x2={midX + sz} y2={midY + sz}
                  stroke={strokeColor} strokeWidth={scale * 0.8} opacity={0.6} />
                <line x1={midX + sz} y1={midY - sz} x2={midX - sz} y2={midY + sz}
                  stroke={strokeColor} strokeWidth={scale * 0.8} opacity={0.6} />
              </g>
            );
          }
          // Arrow: > or <
          const dir = p.opening === '>' ? 1 : -1;
          const tipX = midX + ux * aLen * 0.4 * dir;
          const tipY = midY + uy * aLen * 0.4 * dir;
          const tailX = midX - ux * aLen * 0.4 * dir;
          const tailY = midY - uy * aLen * 0.4 * dir;
          const wingSize = 6 * scale;
          const w1x = tipX - ux * wingSize * dir + nx * wingSize;
          const w1y = tipY - uy * wingSize * dir + ny * wingSize;
          const w2x = tipX - ux * wingSize * dir - nx * wingSize;
          const w2y = tipY - uy * wingSize * dir - ny * wingSize;
          return (
            <g opacity={0.6}>
              <line x1={tailX} y1={tailY} x2={tipX} y2={tipY}
                stroke={strokeColor} strokeWidth={scale * 0.8} />
              <line x1={tipX} y1={tipY} x2={w1x} y2={w1y}
                stroke={strokeColor} strokeWidth={scale * 0.8} />
              <line x1={tipX} y1={tipY} x2={w2x} y2={w2y}
                stroke={strokeColor} strokeWidth={scale * 0.8} />
            </g>
          );
        })()}
        {/* Panel width label */}
        <text
          x={(ax + bx + cx + ddx) / 4}
          y={(ay + by + cy + ddy) / 4 + panelHeight * 0.35}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={strokeColor}
          fontSize={8 * scale}
          fontFamily="monospace"
          opacity={0.7}
        >
          {p.length}
        </text>
      </g>,
    );
  }

  return <g>{rects}</g>;
}

// ─── Main renderer ───────────────────────────────────────────
export function CadGuidelineRenderer({ viewBox }: { viewBox: ViewBox }) {
  const guidePoints = useConfigStore((s) => s.guidePoints);
  const previewPoint = useConfigStore((s) => s.previewPoint);
  const isDrawing = useConfigStore((s) => s.isDrawing);
  const getSegments = useConfigStore((s) => s.getSegments);
  const getAngles = useConfigStore((s) => s.getAngles);
  const getOffsetPoints = useConfigStore((s) => s.getOffsetPoints);
  const selectedSegmentIndex = useConfigStore((s) => s.selectedSegmentIndex);
  const edgeConfigs = useConfigStore((s) => s.edgeConfigs);
  const getEdgeData = useConfigStore((s) => s.getEdgeData);

  // Scale factor: how many mm per pixel-ish unit for text/dots
  const scale = viewBox.w / 800;

  const segments = getSegments();
  const angles = getAngles();
  const offsetPoints = getOffsetPoints();

  // Determine outward direction for panel visualization.
  // The offset line (orange) is on the INSIDE of the balcony (toward building).
  // Panels should be drawn on the OUTSIDE (away from building = opposite side from offset).
  // The offset chain uses perpendicular(-dy/len, dx/len) with distance -10,
  // which effectively places the offset on the right side of travel direction.
  // We use the polyline signed area (in internal y-up coords) to detect turn direction:
  //   area > 0 for this L-shape → the "inside" of the L is upper-right
  //   → outward (away from inside) needs right-side perpendicular in SVG = sign -1
  const area = polylineSignedArea(guidePoints);
  const outwardSign = area >= 0 ? -1 : 1;

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
      {/* Main polyline segments — color-coded by selection & wall/glazing */}
      {segments.map((seg, i) => {
        const s = toSvg(seg.start);
        const e = toSvg(seg.end);
        const isSelected = selectedSegmentIndex === i;
        const isWall = edgeConfigs[i]?.wallOrGlazingStatus === 'wall';
        const segColor = isSelected
          ? '#60a5fa'   // bright blue when selected
          : isWall
            ? '#f87171' // red for wall
            : '#ef4444'; // darker red for glazing (default)
        // Geometric length (matches the actual line since we resize it)
        const displayLength = seg.length;
        return (
          <g key={`seg-${i}`}>
            {/* Selection highlight glow */}
            {isSelected && (
              <line
                x1={s.x} y1={s.y} x2={e.x} y2={e.y}
                stroke="#3b82f6"
                strokeWidth={strokeW * 3}
                opacity={0.3}
              />
            )}
            <line
              x1={s.x} y1={s.y} x2={e.x} y2={e.y}
              stroke={segColor}
              strokeWidth={isSelected ? strokeW * 1.5 : strokeW}
            />
            <DimensionLabel
              start={seg.start}
              end={seg.end}
              length={displayLength}
              segmentIndex={seg.index}
              color={isSelected ? '#93c5fd' : '#9ca3af'}
              scale={scale}
            />
            {/* Panel rectangles along segment */}
            {edgeConfigs[i]?.wallOrGlazingStatus !== 'wall' &&
              edgeConfigs[i]?.panels?.length > 0 && (
              <PanelViz
                start={seg.start}
                end={seg.end}
                panels={edgeConfigs[i].panels}
                scale={scale}
                isSelected={isSelected}
                outwardSign={outwardSign}
              />
            )}
          </g>
        );
      })}

      {/* Orange offset polyline */}
      {offsetPoints.length >= 2 && (
        <polyline
          points={offsetPoints.map((p) => { const sv = toSvg(p); return `${sv.x},${sv.y}`; }).join(' ')}
          fill="none"
          stroke="#f97316"
          strokeWidth={strokeW * 0.8}
        />
      )}

      {/* Per-segment module/profile labels on offset line */}
      {offsetPoints.length >= 2 && segments.map((seg, i) => {
        if (i >= offsetPoints.length - 1) return null;
        const data = getEdgeData(i);
        if (!data || edgeConfigs[i]?.wallOrGlazingStatus === 'wall') return null;
        if (edgeConfigs[i]?.panels.length === 0) return null;
        const oStart = toSvg(offsetPoints[i]);
        const oEnd = toSvg(offsetPoints[i + 1]);
        const mx = (oStart.x + oEnd.x) / 2;
        const my = (oStart.y + oEnd.y) / 2;
        const dx = oEnd.x - oStart.x;
        const dy = oEnd.y - oStart.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = len > 0 ? -dy / len : 0;
        const ny = len > 0 ? dx / len : 0;
        const fs = 10 * scale;
        const hasSpel = Math.abs(data.spelGuide) > 1;
        return (
          <g key={`cut-${i}`}>
            {/* Module length (sum of panels + offsets) */}
            <text
              x={mx + nx * -18 * scale}
              y={my + ny * -18 * scale}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#f97316"
              fontSize={fs}
              fontFamily="monospace"
            >
              Modul: {Math.round(data.totalModuleLength)} mm
            </text>
            {/* Cut length */}
            <text
              x={mx + nx * -32 * scale}
              y={my + ny * -32 * scale}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#fb923c"
              fontSize={fs * 0.85}
              fontFamily="monospace"
              opacity={0.7}
            >
              Kap: {Math.round(data.cutLengths.underskena)} mm
            </text>
            {/* Spel warning */}
            {hasSpel && (
              <text
                x={mx + nx * -46 * scale}
                y={my + ny * -46 * scale}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={Math.abs(data.spelGuide) > 5 ? '#facc15' : '#9ca3af'}
                fontSize={fs * 0.85}
                fontFamily="monospace"
              >
                Spel: {data.spelGuide} mm
              </text>
            )}
          </g>
        );
      })}

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
