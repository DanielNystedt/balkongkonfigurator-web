import { useState, useEffect } from 'react';
import { useConfigStore } from '../../store/useConfigStore';
import type { ActiveMode } from '../../store/useConfigStore';
import { CollapsibleSection } from './CollapsibleSection';
import { ProjectPanel } from './ProjectPanel';
import { ProfilePanel } from './ProfilePanel';
import { LevelsPanel } from './LevelsPanel';
import { FrameWidthPanel } from './FrameWidthPanel';
import { SegmentPanel } from './SegmentPanel';
import { PanelConfigPanel } from './PanelConfigPanel';
import { PointCloudPanel } from './PointCloudPanel';
import { saveState, loadState, hasSavedState } from '../../utils/persistence';

const MODES: { mode: ActiveMode; label: string }[] = [
  { mode: 'select', label: 'Markera' },
  { mode: 'draw-guide', label: 'Rita' },
  { mode: 'levels', label: 'Nivåer' },
];

export function ConfigPanel() {
  const selectedIdx = useConfigStore((s) => s.selectedSegmentIndex);
  const edgeConfigs = useConfigStore((s) => s.edgeConfigs);
  const activeMode = useConfigStore((s) => s.activeMode);
  const setActiveMode = useConfigStore((s) => s.setActiveMode);
  const isDrawing = useConfigStore((s) => s.isDrawing);
  const setIsDrawing = useConfigStore((s) => s.setIsDrawing);
  const clearGuide = useConfigStore((s) => s.clearGuide);
  const snapEnabled = useConfigStore((s) => s.snapEnabled);
  const toggleSnap = useConfigStore((s) => s.toggleSnap);
  const snapAngle = useConfigStore((s) => s.snapAngle);
  const toggleSnapAngle = useConfigStore((s) => s.toggleSnapAngle);
  const freeGlassWidth = useConfigStore((s) => s.freeGlassWidth);
  const toggleFreeGlassWidth = useConfigStore((s) => s.toggleFreeGlassWidth);

  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Auto-load saved state on first mount
  useEffect(() => {
    if (hasSavedState()) {
      loadState();
    }
  }, []);

  const hasSegment = selectedIdx !== null;
  const edge = hasSegment ? edgeConfigs[selectedIdx] : null;
  const isGlazing = edge?.wallOrGlazingStatus !== 'wall';

  const handleSave = () => {
    const ok = saveState();
    setSaveMsg(ok ? 'Sparat!' : 'Fel vid sparning');
    setTimeout(() => setSaveMsg(null), 2000);
  };

  const handleLoad = () => {
    const ok = loadState();
    setSaveMsg(ok ? 'Laddat!' : 'Inget sparat att ladda');
    setTimeout(() => setSaveMsg(null), 2000);
  };

  return (
    <div>
      {/* Title */}
      <a href="#" style={{ fontSize: 11, color: '#888', textDecoration: 'none' }}>&larr; Tillbaka</a>
      <h2>Balkongkonfigurator</h2>

      {/* RITVERKTYG section */}
      <div className="section">
        <div className="section-title">Ritverktyg</div>
        <div className="tool-group">
          {MODES.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className="tool-btn"
              style={activeMode === mode ? { background: '#2196F3', color: '#fff', borderColor: '#2196F3' } : {}}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => isDrawing ? setIsDrawing(false) : null}
          className="btn btn-secondary"
        >
          Stäng form
        </button>
        <button
          type="button"
          onClick={() => clearGuide()}
          className="btn btn-danger"
        >
          Rensa allt
        </button>
        <div className="shortcut-info">
          <strong>Tangenter:</strong><br />
          S = Markera, G = Rita, L = Nivåer<br />
          Enter = Stäng form<br />
          Delete = Ta bort markerat punkt/segment<br />
          Esc = Avbryt
        </div>
      </div>

      {/* SNAP section */}
      <div className="section">
        <div className="section-title">Snap</div>
        <div className="checkbox-row">
          <input type="checkbox" checked={snapEnabled} onChange={toggleSnap} />
          <label>Rutnät</label>
        </div>
        <div className="checkbox-row">
          <input type="checkbox" checked={snapAngle} onChange={toggleSnapAngle} />
          <label>Vinkel (45°)</label>
        </div>
        <div className="checkbox-row">
          <input type="checkbox" checked={true} readOnly />
          <label>Ändpunkter</label>
        </div>
        <div className="control">
          <label>Rutstorlek <span className="value">100 mm</span></label>
          <input type="range" min={50} max={500} step={50} defaultValue={100} />
        </div>
      </div>

      {/* Glasmått */}
      <div className="section">
        <div className="section-title">Glasmått</div>
        <div className="checkbox-row">
          <input type="checkbox" checked={freeGlassWidth} onChange={toggleFreeGlassWidth} />
          <label>Fritt glasmått</label>
        </div>
        <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
          {freeGlassWidth
            ? 'Paneler fördelas jämnt med fritt mått (max 700mm)'
            : 'Paneler använder standardmått (430–700mm i steg om 30mm)'}
        </div>
      </div>

      <CollapsibleSection id="project" title="Projekt">
        <ProjectPanel />
      </CollapsibleSection>

      <CollapsibleSection id="profile" title="Profiler">
        <ProfilePanel />
      </CollapsibleSection>

      <CollapsibleSection id="levels" title="Nivåer">
        <LevelsPanel />
      </CollapsibleSection>

      <CollapsibleSection id="frameWidth" title="Rambredder">
        <FrameWidthPanel />
      </CollapsibleSection>

      <CollapsibleSection
        id="segment"
        title="Segment"
        badge={hasSegment ? `Sida ${selectedIdx + 1}` : undefined}
        disabled={!hasSegment}
      >
        <SegmentPanel />
      </CollapsibleSection>

      <CollapsibleSection
        id="panels"
        title="Paneler"
        badge={hasSegment && isGlazing && edge ? `${edge.panels.length} st` : undefined}
        disabled={!hasSegment || !isGlazing}
      >
        <PanelConfigPanel />
      </CollapsibleSection>

      <CollapsibleSection id="pointcloud" title="Punktmoln">
        <PointCloudPanel />
      </CollapsibleSection>

      {/* Save / Load */}
      <div className="section" style={{ marginTop: 12, borderTop: '1px solid #ddd', paddingTop: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={handleSave}
            className="btn"
            style={{
              flex: 1,
              background: '#22c55e',
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Spara
          </button>
          <button
            type="button"
            onClick={handleLoad}
            className="btn"
            style={{
              flex: 1,
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Ladda
          </button>
        </div>
        {saveMsg && (
          <div style={{
            textAlign: 'center',
            marginTop: 4,
            fontSize: 12,
            color: saveMsg.includes('Fel') || saveMsg.includes('Inget') ? '#ef4444' : '#22c55e',
            fontWeight: 600,
          }}>
            {saveMsg}
          </div>
        )}
      </div>
    </div>
  );
}
