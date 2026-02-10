import { useRef, useCallback } from 'react';
import { useConfigStore } from '../../store/useConfigStore';
import type { LevelName } from '../../types/levels';

const LEVEL_COLORS: Record<LevelName, string> = {
  Understycke: '#3b82f6',
  Mellanstycke: '#22c55e',
  Overstycke: '#ef4444',
};

const LEVEL_LABELS: Record<LevelName, string> = {
  Understycke: 'Understycke',
  Mellanstycke: 'Mellanstycke',
  Overstycke: 'Överstycke',
};

const LEVEL_NAMES: LevelName[] = ['Understycke', 'Mellanstycke', 'Overstycke'];

interface Props {
  viewBox: { x: number; y: number; w: number; h: number };
  svgRef: React.RefObject<SVGSVGElement | null>;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function CadLevelOverlay({ viewBox, svgRef, onDragStart, onDragEnd }: Props) {
  const levels = useConfigStore((s) => s.levels.levels);
  const editMode = useConfigStore((s) => s.levelEditMode);
  const setLevelZ = useConfigStore((s) => s.setLevelZ);

  const draggingRef = useRef<LevelName | null>(null);

  const toSvgY = (z: number) => -z; // z=0 → svgY=0, z=2100 → svgY=-2100

  const fromClientY = useCallback(
    (clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return 0;
      const r = svg.getBoundingClientRect();
      const svgY = viewBox.y + ((clientY - r.top) / r.height) * viewBox.h;
      return -svgY; // convert svgY back to z
    },
    [viewBox, svgRef],
  );

  const onPointerDown = useCallback(
    (name: LevelName) => (e: React.PointerEvent) => {
      if (!editMode) return;
      e.stopPropagation();
      e.preventDefault();
      (e.target as SVGElement).setPointerCapture(e.pointerId);
      draggingRef.current = name;
      onDragStart?.();
    },
    [editMode, onDragStart],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      e.stopPropagation();
      const z = Math.round(fromClientY(e.clientY) / 10) * 10; // snap to 10mm
      setLevelZ(draggingRef.current, z);
    },
    [fromClientY, setLevelZ],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      (e.target as SVGElement).releasePointerCapture(e.pointerId);
      draggingRef.current = null;
      onDragEnd?.();
    },
    [onDragEnd],
  );

  const strokeW = viewBox.w * 0.001;
  const fontSize = viewBox.w * 0.012;
  const hitZone = viewBox.h * 0.015; // invisible wider hit area for dragging

  return (
    <g onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      {LEVEL_NAMES.map((name) => {
        const level = levels[name];
        if (!level.visible) return null;
        const y = toSvgY(level.zPosition);
        const color = LEVEL_COLORS[name];

        return (
          <g key={name}>
            {/* Dashed level line */}
            <line
              x1={viewBox.x}
              y1={y}
              x2={viewBox.x + viewBox.w}
              y2={y}
              stroke={color}
              strokeWidth={strokeW}
              strokeDasharray={`${strokeW * 8} ${strokeW * 4}`}
              opacity={0.8}
            />

            {/* Label */}
            <text
              x={viewBox.x + viewBox.w * 0.02}
              y={y - fontSize * 0.4}
              fill={color}
              fontSize={fontSize}
              fontFamily="system-ui, sans-serif"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {LEVEL_LABELS[name]} ({level.zPosition} mm)
            </text>

            {/* Invisible wide hit zone for dragging */}
            {editMode && (
              <rect
                x={viewBox.x}
                y={y - hitZone / 2}
                width={viewBox.w}
                height={hitZone}
                fill="transparent"
                style={{ cursor: 'ns-resize' }}
                onPointerDown={onPointerDown(name)}
              />
            )}

            {/* Drag handle circles at edges */}
            {editMode && (
              <>
                <circle
                  cx={viewBox.x + viewBox.w * 0.5}
                  cy={y}
                  r={strokeW * 4}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={strokeW * 0.5}
                  style={{ cursor: 'ns-resize' }}
                  onPointerDown={onPointerDown(name)}
                />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}
