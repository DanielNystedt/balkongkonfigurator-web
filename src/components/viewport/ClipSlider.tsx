import { useConfigStore } from '../../store/useConfigStore';

const MARGIN = 0.1; // 100mm margin beyond bounds

/**
 * Vertical clip-height slider rendered beside the viewport.
 * Bottom = low clip, Top = high clip — matches the red slice line visually.
 * Range is limited to 100mm below lowest point ↔ 100mm above highest point.
 */
export function ClipSlider() {
  const enabled = useConfigStore((s) => s.pointCloudEnabled);
  const clipY = useConfigStore((s) => s.pointCloudClipY);
  const setClipY = useConfigStore((s) => s.setPointCloudClipY);
  const originY = useConfigStore((s) => s.pointCloudOriginY);
  const boundsY = useConfigStore((s) => s.pointCloudBoundsY);

  if (!enabled) return null;

  const relativeClipMm = Math.round((clipY - originY) * 1000);

  // Slider min/max = point cloud bounds ± 100mm margin
  const sliderMin = boundsY[0] - MARGIN;
  const sliderMax = boundsY[1] + MARGIN;

  return (
    <div
      style={{
        position: 'absolute',
        right: 12,
        top: 12,
        bottom: 12,
        width: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        zIndex: 10,
        pointerEvents: 'auto',
      }}
    >
      {/* Value label top */}
      <div
        style={{
          color: '#ef4444',
          fontSize: 11,
          fontFamily: 'monospace',
          fontWeight: 700,
          textShadow: '0 0 4px rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        {relativeClipMm}
      </div>

      {/* Vertical range slider */}
      <input
        type="range"
        min={sliderMin}
        max={sliderMax}
        step={0.001}
        value={clipY}
        onChange={(e) => setClipY(parseFloat(e.target.value))}
        style={{
          writingMode: 'vertical-lr',
          direction: 'rtl',
          flex: 1,
          width: 28,
          margin: 0,
          cursor: 'ns-resize',
          accentColor: '#ef4444',
        }}
      />

      {/* Unit label bottom */}
      <div
        style={{
          color: '#888',
          fontSize: 9,
          fontFamily: 'monospace',
          userSelect: 'none',
        }}
      >
        mm
      </div>
    </div>
  );
}
