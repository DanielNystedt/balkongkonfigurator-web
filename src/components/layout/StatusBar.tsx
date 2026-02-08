import { useConfigStore } from '../../store/useConfigStore';

const MODE_LABELS: Record<string, string> = {
  select: 'Markera - klicka för att välja element',
  'draw-guide': 'Rita guide - klicka för att placera punkter, Enter/dubbelklick avslutar, Escape avbryter',
  levels: 'Nivåer - justera Z-plan i panelen till höger',
};

export function StatusBar() {
  const activeMode = useConfigStore((s) => s.activeMode);
  const guidePoints = useConfigStore((s) => s.guidePoints);
  const isDrawing = useConfigStore((s) => s.isDrawing);
  const snapEnabled = useConfigStore((s) => s.snapEnabled);

  const pointCount = guidePoints.length;
  const segmentCount = pointCount > 1 ? pointCount - 1 : 0;

  return (
    <div className="flex items-center justify-between bg-gray-900 border-t border-gray-700 px-3 py-1 text-xs text-gray-400">
      <span>{MODE_LABELS[activeMode] ?? activeMode}</span>
      <div className="flex gap-4">
        {isDrawing && (
          <span className="text-green-400">● Ritar...</span>
        )}
        <span>{pointCount} punkter, {segmentCount} segment</span>
        <span className={snapEnabled ? 'text-blue-400' : 'text-gray-600'}>
          Snap: {snapEnabled ? 'PÅ' : 'AV'}
        </span>
      </div>
    </div>
  );
}
