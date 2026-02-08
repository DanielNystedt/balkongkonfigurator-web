import { useConfigStore } from '../../store/useConfigStore';
import type { ActiveMode } from '../../store/useConfigStore';

const MODES: { mode: ActiveMode; label: string; shortcut: string }[] = [
  { mode: 'select', label: 'Markera', shortcut: 'V' },
  { mode: 'draw-guide', label: 'Rita guide', shortcut: 'G' },
  { mode: 'levels', label: 'Nivaer', shortcut: 'L' },
];

export function Toolbar() {
  const activeMode = useConfigStore((s) => s.activeMode);
  const setActiveMode = useConfigStore((s) => s.setActiveMode);

  return (
    <div className="flex items-center gap-1 bg-gray-900 border-b border-gray-700 px-3 py-1.5">
      <span className="text-sm font-bold text-white mr-4">
        Balkongkonfigurator
      </span>
      <div className="flex gap-1">
        {MODES.map(({ mode, label, shortcut }) => (
          <button
            key={mode}
            onClick={() => setActiveMode(mode)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              activeMode === mode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            title={`${label} (${shortcut})`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
