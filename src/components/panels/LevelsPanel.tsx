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
  const editMode = useConfigStore((s) => s.levelEditMode);
  const setEditMode = useConfigStore((s) => s.setLevelEditMode);
  const activeMode = useConfigStore((s) => s.activeMode);
  const setActiveMode = useConfigStore((s) => s.setActiveMode);
  const clipY = useConfigStore((s) => s.pointCloudClipY);
  const originY = useConfigStore((s) => s.pointCloudOriginY);
  const setLevelFromClip = useConfigStore((s) => s.setLevelFromClip);
  const setClipToLevel = useConfigStore((s) => s.setClipToLevel);

  const levelNames: LevelName[] = ['Understycke', 'Mellanstycke', 'Overstycke'];

  const glazingHeight =
    levels.Overstycke.zPosition - levels.Understycke.zPosition;

  const isLevelsMode = activeMode === 'levels';

  return (
    <div>
      {/* Nivå + Redigera buttons */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => setActiveMode('levels')}
          className="btn"
          style={{
            flex: 1,
            background: isLevelsMode ? '#2196F3' : '#eee',
            color: isLevelsMode ? '#fff' : '#444',
            border: isLevelsMode ? 'none' : '1px solid #ccc',
          }}
        >
          Visa nivåer
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isLevelsMode) setActiveMode('levels');
            setEditMode(!editMode);
          }}
          className="btn"
          style={{
            flex: 1,
            background: editMode ? '#f59e0b' : '#eee',
            color: editMode ? '#fff' : '#444',
            border: editMode ? 'none' : '1px solid #ccc',
          }}
        >
          {editMode ? 'Spara' : 'Redigera'}
        </button>
      </div>

      {editMode && (
        <div style={{ fontSize: 10, color: '#888', marginBottom: 8, lineHeight: 1.4 }}>
          Dra nivålinjerna i 2D-vyn eller ändra värdena nedan.
        </div>
      )}

      {levelNames.map((name) => {
        const level = levels[name];
        return (
          <div
            key={name}
            style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: LEVEL_COLORS[name],
                flexShrink: 0,
              }}
            />
            <input
              type="checkbox"
              checked={level.visible}
              onChange={(e) => setLevelVisible(name, e.target.checked)}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {LEVEL_LABELS[name]}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number"
                  value={level.zPosition}
                  onChange={(e) => setLevelZ(name, Number(e.target.value))}
                  step={10}
                  style={{ width: 70 }}
                />
                <span style={{ fontSize: 11, color: '#888' }}>mm</span>
                <button
                  type="button"
                  title={name === 'Understycke'
                    ? 'Sätt botten = 0 vid aktuell klipphöjd'
                    : `Sätt relativt botten (${Math.round((clipY - originY) * 1000)} mm)`}
                  onClick={() => setLevelFromClip(name)}
                  style={{
                    padding: '2px 5px',
                    fontSize: 10,
                    background: name === 'Understycke' ? '#f59e0b' : '#2196F3',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 3,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {name === 'Understycke' ? '⊥ Noll' : '↑ Klipp'}
                </button>
                <button
                  type="button"
                  title={`Flytta klipplanet till ${level.zPosition} mm`}
                  onClick={() => setClipToLevel(name)}
                  style={{
                    padding: '2px 5px',
                    fontSize: 10,
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 3,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ✂ Visa
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ borderTop: '1px solid #eee', paddingTop: 8, marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: '#444' }}>Inglasningshöjd:</span>
          <span className="value">{glazingHeight} mm</span>
        </div>
      </div>
    </div>
  );
}
