import { useConfigStore } from '../../store/useConfigStore';
import type { OpeningDirection, LockSymbol } from '../../types/panel';

const OPENING_CYCLE: OpeningDirection[] = ['>', '<', 'X'];
const LOCK_CYCLE: LockSymbol[] = ['-', '|', '||'];

function cycleValue<T>(current: T, options: T[]): T {
  const idx = options.indexOf(current);
  return options[(idx + 1) % options.length];
}

/** Short lock name for display */
function shortLock(lock: string | null): string {
  if (!lock) return '–';
  const map: Record<string, string> = {
    'Slutlock hona': 'SL♀',
    'Slutlock hane': 'SL♂',
    '90 graderslock hona': '90♀',
    '90 graderslock hane': '90♂',
    'Variabelt andlock': 'VA',
    'Moteslock hona': 'ML♀',
    'Moteslock hane': 'ML♂',
    'Overlas dubbel': 'ÖD',
    'Overlas': 'ÖL',
    'Vridlas': 'VL',
    'D-Vanster': 'DV',
    'D-Hoger': 'DH',
    'D-Vridlas': 'DVL',
    'Undre las dubbel': 'ULD',
    'Undre las': 'UL',
  };
  return map[lock] ?? lock.slice(0, 3);
}

export function PanelConfigPanel() {
  const selectedIdx = useConfigStore((s) => s.selectedSegmentIndex);
  const edgeConfigs = useConfigStore((s) => s.edgeConfigs);
  const getEdgeData = useConfigStore((s) => s.getEdgeData);
  const addPanel = useConfigStore((s) => s.addPanel);
  const removePanel = useConfigStore((s) => s.removePanel);
  const updatePanelField = useConfigStore((s) => s.updatePanelField);
  const autoGeneratePanels = useConfigStore((s) => s.autoGeneratePanels);

  if (selectedIdx === null) {
    return <EmptyState text="Välj ett segment" />;
  }

  const edge = edgeConfigs[selectedIdx];
  if (!edge || edge.wallOrGlazingStatus === 'wall') {
    return <EmptyState text="Paneler visas bara för inglasning" />;
  }

  const panels = edge.panels;
  const data = getEdgeData(selectedIdx);
  const fittings = data?.panelFittings ?? [];

  return (
    <div>
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => autoGeneratePanels(selectedIdx)}
          className="btn"
          style={{ flex: 1, background: '#2196F3', color: '#fff' }}
        >
          Auto-generera
        </button>
        <button
          type="button"
          onClick={() => addPanel(selectedIdx)}
          className="btn btn-secondary"
          style={{ flex: 1 }}
        >
          + Lägg till
        </button>
      </div>

      {/* Panel list */}
      {panels.length === 0 ? (
        <EmptyState text='Inga paneler. Klicka "Auto-generera".' />
      ) : (
        <div>
          {panels.map((panel, pi) => {
            const fitting = fittings[pi];
            return (
              <div
                key={pi}
                style={{
                  background: '#f5f5f5',
                  borderRadius: 4,
                  padding: 6,
                  marginBottom: 4,
                }}
              >
                {/* Top row: number, width, controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: '#888', width: 16, textAlign: 'center', flexShrink: 0 }}>
                    {pi + 1}
                  </span>

                  <input
                    type="number"
                    value={panel.length}
                    onChange={(e) =>
                      updatePanelField(selectedIdx, pi, 'length', Number(e.target.value))
                    }
                    step={10}
                    min={100}
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <span style={{ fontSize: 10, color: '#888' }}>mm</span>

                  {/* Opening direction */}
                  <button
                    type="button"
                    onClick={() =>
                      updatePanelField(
                        selectedIdx,
                        pi,
                        'opening',
                        cycleValue(panel.opening, OPENING_CYCLE),
                      )
                    }
                    style={{
                      width: 28,
                      fontSize: 11,
                      fontWeight: 'bold',
                      borderRadius: 3,
                      padding: '2px 0',
                      border: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                      background: panel.opening === 'X' ? '#ddd' : '#2196F3',
                      color: panel.opening === 'X' ? '#444' : '#fff',
                    }}
                    title={
                      panel.opening === '>'
                        ? 'Höger'
                        : panel.opening === '<'
                          ? 'Vänster'
                          : 'Fast glas'
                    }
                  >
                    {panel.opening}
                  </button>

                  {/* Lock */}
                  <button
                    type="button"
                    onClick={() =>
                      updatePanelField(
                        selectedIdx,
                        pi,
                        'lock',
                        cycleValue(panel.lock, LOCK_CYCLE),
                      )
                    }
                    style={{
                      width: 24,
                      fontSize: 11,
                      fontWeight: 'bold',
                      background: '#ddd',
                      color: '#444',
                      borderRadius: 3,
                      padding: '2px 0',
                      border: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    title={
                      panel.lock === '|'
                        ? 'Enkellås'
                        : panel.lock === '||'
                          ? 'Dubbellås'
                          : 'Inget lås'
                    }
                  >
                    {panel.lock === '-' ? '–' : panel.lock}
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => removePanel(selectedIdx, pi)}
                    style={{
                      fontSize: 12,
                      color: '#e53935',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                      padding: '0 2px',
                    }}
                    title="Ta bort panel"
                  >
                    ×
                  </button>
                </div>

                {/* Bottom row: fitting info */}
                {fitting && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#888', paddingLeft: 16, marginTop: 4 }}>
                    <span
                      style={{ background: '#eee', padding: '0 4px', borderRadius: 2 }}
                      title={`V: ${fitting.topLeft ?? '–'}`}
                    >
                      {shortLock(fitting.topLeft)}
                    </span>
                    <span style={{ color: '#ccc' }}>|</span>
                    <span style={{ color: '#444' }}>
                      {fitting.glassWidth} mm glas
                    </span>
                    <span style={{ color: '#ccc' }}>|</span>
                    <span
                      style={{ background: '#eee', padding: '0 4px', borderRadius: 2 }}
                      title={`H: ${fitting.topRight ?? '–'}`}
                    >
                      {shortLock(fitting.topRight)}
                    </span>
                    {fitting.topLock && (
                      <>
                        <span style={{ color: '#ccc' }}>·</span>
                        <span
                          style={{ color: '#f59e0b' }}
                          title={`Lås: ${fitting.topLock}`}
                        >
                          {shortLock(fitting.topLock)}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Offsets row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: '#888', paddingLeft: 16, marginTop: 2 }}>
                  <span>Offs V: {panel.offsetLeft}</span>
                  <span>Offs H: {panel.offsetRight}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {panels.length > 0 && (
        <div style={{ borderTop: '1px solid #eee', paddingTop: 6, marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
            <span style={{ color: '#444' }}>Paneler:</span>
            <span className="value">{panels.length} st</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
            <span style={{ color: '#444' }}>Total bredd:</span>
            <span className="value">
              {panels.reduce((sum, p) => sum + p.length, 0)} mm
            </span>
          </div>
          {data && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
              <span style={{ color: '#444' }}>Spel:</span>
              <span style={{
                fontWeight: 600,
                color: Math.abs(data.spelGuide) > 5 ? '#f59e0b' : '#2196F3',
              }}>
                {data.spelGuide} mm
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 12, color: '#888', textAlign: 'center', padding: '12px 0' }}>
      {text}
    </div>
  );
}
