import { useConfigStore } from '../../store/useConfigStore';
import type { ActiveMode } from '../../store/useConfigStore';

const MODES: { mode: ActiveMode; label: string; shortcut: string }[] = [
  { mode: 'select', label: 'Markera', shortcut: 'V' },
  { mode: 'draw-guide', label: 'Rita guide', shortcut: 'G' },
  { mode: 'levels', label: 'Nivåer', shortcut: 'L' },
];

export function Toolbar() {
  const activeMode = useConfigStore((s) => s.activeMode);
  const setActiveMode = useConfigStore((s) => s.setActiveMode);
  const isDrawing = useConfigStore((s) => s.isDrawing);
  const setIsDrawing = useConfigStore((s) => s.setIsDrawing);
  const clearGuide = useConfigStore((s) => s.clearGuide);

  return (
    <div className="flex items-center gap-2 bg-navy-900 border-b border-navy-700 px-3 py-1.5">
      <span className="text-sm font-bold text-white mr-3 tracking-wide">
        BALKONGKONFIGURATOR
      </span>

      <div className="w-px h-5 bg-navy-700" />

      <div className="flex gap-1">
        {MODES.map(({ mode, label, shortcut }) => (
          <button
            key={mode}
            onClick={() => setActiveMode(mode)}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeMode === mode
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'bg-navy-800 text-gray-400 hover:bg-navy-700 hover:text-gray-200'
            }`}
            title={`${label} (${shortcut})`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Drawing action buttons */}
      {activeMode === 'draw-guide' && (
        <>
          <div className="w-px h-5 bg-navy-700" />
          {isDrawing && (
            <button
              type="button"
              onClick={() => setIsDrawing(false)}
              className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
            >
              Sluta form
            </button>
          )}
          <button
            type="button"
            onClick={() => clearGuide()}
            className="px-3 py-1 text-xs font-medium rounded bg-red-700 text-red-100 hover:bg-red-600 transition-colors"
          >
            Rensa allt
          </button>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Snap indicator */}
      <SnapToggle />
    </div>
  );
}

function SnapToggle() {
  const snapEnabled = useConfigStore((s) => s.snapEnabled);
  const toggleSnap = useConfigStore((s) => s.toggleSnap);

  return (
    <button
      type="button"
      onClick={toggleSnap}
      className={`px-2 py-1 text-xs rounded transition-colors ${
        snapEnabled
          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
          : 'bg-navy-800 text-gray-500 border border-navy-700'
      }`}
      title="Snap (S)"
    >
      Snap: {snapEnabled ? 'PÅ' : 'AV'}
    </button>
  );
}
