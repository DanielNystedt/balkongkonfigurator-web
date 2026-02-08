import { useConfigStore } from '../../store/useConfigStore';
import type { LevelName } from '../../types/levels';

const LEVEL_LABELS: Record<LevelName, string> = {
  Understycke: 'Understycke (botten)',
  Mellanstycke: 'Mellanstycke (mitten)',
  Overstycke: 'Överstycke (topp)',
};

const LEVEL_COLORS: Record<LevelName, string> = {
  Understycke: '#3b82f6',
  Mellanstycke: '#22c55e',
  Overstycke: '#ef4444',
};

export function LevelsPanel() {
  const levels = useConfigStore((s) => s.levels.levels);
  const setLevelZ = useConfigStore((s) => s.setLevelZ);
  const setLevelVisible = useConfigStore((s) => s.setLevelVisible);

  const levelNames: LevelName[] = ['Understycke', 'Mellanstycke', 'Overstycke'];

  const glazingHeight =
    levels.Overstycke.zPosition - levels.Understycke.zPosition;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
        Nivåer (Z-plan)
      </h3>

      {levelNames.map((name) => {
        const level = levels[name];
        return (
          <div
            key={name}
            className="flex items-center gap-2 rounded-md bg-gray-800 p-2"
          >
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: LEVEL_COLORS[name] }}
            />
            <input
              type="checkbox"
              checked={level.visible}
              onChange={(e) => setLevelVisible(name, e.target.checked)}
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400 truncate">
                {LEVEL_LABELS[name]}
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={level.zPosition}
                  onChange={(e) => setLevelZ(name, Number(e.target.value))}
                  className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-0.5 text-sm text-white"
                  step={10}
                />
                <span className="text-xs text-gray-500">mm</span>
              </div>
            </div>
          </div>
        );
      })}

      <div className="border-t border-gray-700 pt-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Inglasningshöjd:</span>
          <span className="text-white font-medium">{glazingHeight} mm</span>
        </div>
      </div>
    </div>
  );
}
