import { useConfigStore } from '../../store/useConfigStore';

export function PointCloudPanel() {
  const enabled = useConfigStore((s) => s.pointCloudEnabled);
  const setEnabled = useConfigStore((s) => s.setPointCloudEnabled);
  const brightness = useConfigStore((s) => s.pointCloudBrightness);
  const setBrightness = useConfigStore((s) => s.setPointCloudBrightness);
  const pointSize = useConfigStore((s) => s.pointCloudPointSize);
  const setPointSize = useConfigStore((s) => s.setPointCloudPointSize);
  const originY = useConfigStore((s) => s.pointCloudOriginY);
  const clipY = useConfigStore((s) => s.pointCloudClipY);

  const relativeClipMm = Math.round((clipY - originY) * 1000);

  return (
    <div>
      {/* Enable toggle */}
      <div className="checkbox-row">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <label>Visa punktmoln</label>
      </div>

      {/* Read-only clip value */}
      {enabled && (
        <div className="control">
          <label>
            Klipphöjd{' '}
            <span className="value">{relativeClipMm} mm</span>
          </label>
          <div style={{ fontSize: 9, color: '#999' }}>
            Dra den vertikala slidern i viewporten.
          </div>
        </div>
      )}

      {/* Brightness slider */}
      <div className="control">
        <label>
          Ljusstyrka{' '}
          <span className="value">{brightness.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={0.1}
          max={3}
          step={0.1}
          value={brightness}
          onChange={(e) => setBrightness(parseFloat(e.target.value))}
          disabled={!enabled}
        />
      </div>

      {/* Point size slider */}
      <div className="control">
        <label>
          Punktstorlek{' '}
          <span className="value">{pointSize.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={0.1}
          max={5}
          step={0.1}
          value={pointSize}
          onChange={(e) => setPointSize(parseFloat(e.target.value))}
          disabled={!enabled}
        />
      </div>

      <div className="shortcut-info">
        Klipphöjd visas relativt botten (0 = golvnivå).<br />
        Röd linje vid snittet.
      </div>
    </div>
  );
}
