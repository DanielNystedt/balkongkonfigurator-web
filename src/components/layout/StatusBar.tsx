import { useConfigStore } from '../../store/useConfigStore';

const MODE_LABELS: Record<string, string> = {
  select: 'Markera',
  'draw-guide': 'Rita',
  levels: 'Nivåer',
};

export function StatusBar() {
  const activeMode = useConfigStore((s) => s.activeMode);
  const guidePoints = useConfigStore((s) => s.guidePoints);
  const isDrawing = useConfigStore((s) => s.isDrawing);
  const pcEnabled = useConfigStore((s) => s.pointCloudEnabled);
  const pcClipY = useConfigStore((s) => s.pointCloudClipY);
  const pcOriginY = useConfigStore((s) => s.pointCloudOriginY);

  const pointCount = guidePoints.length;
  const segmentCount = pointCount > 1 ? pointCount - 1 : 0;

  return (
    <div style={{
      background: '#222',
      color: '#aaa',
      padding: '5px 10px',
      fontSize: 10,
      fontFamily: 'monospace',
      display: 'flex',
      gap: 16,
      flexShrink: 0,
    }}>
      <span><span style={{ color: '#4CAF50' }}>Verktyg:</span> {MODE_LABELS[activeMode] ?? activeMode}</span>
      {isDrawing && (
        <span style={{ color: '#4CAF50' }}>● Ritar...</span>
      )}
      <span><span style={{ color: '#4CAF50' }}>Punkter:</span> {pointCount}</span>
      <span><span style={{ color: '#4CAF50' }}>Segment:</span> {segmentCount}</span>
      {pcEnabled && (
        <span><span style={{ color: '#2196F3' }}>Punktmoln:</span> Klipp {Math.round((pcClipY - pcOriginY) * 1000)} mm</span>
      )}
    </div>
  );
}
