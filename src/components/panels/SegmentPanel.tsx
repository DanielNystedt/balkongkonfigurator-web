import { useConfigStore } from '../../store/useConfigStore';

export function SegmentPanel() {
  const selectedIdx = useConfigStore((s) => s.selectedSegmentIndex);
  const getEdgeData = useConfigStore((s) => s.getEdgeData);
  const edgeConfigs = useConfigStore((s) => s.edgeConfigs);
  const setEdgeWallOrGlazing = useConfigStore((s) => s.setEdgeWallOrGlazing);

  if (selectedIdx === null) {
    return <EmptyState text="Välj ett segment i CAD-vyn" />;
  }

  const data = getEdgeData(selectedIdx);
  if (!data) {
    return <EmptyState text="Välj ett segment i CAD-vyn" />;
  }

  const edgeConfig = edgeConfigs[selectedIdx];
  const isGlazing = edgeConfig?.wallOrGlazingStatus !== 'wall';

  return (
    <div>
      {/* Wall / Glazing toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => setEdgeWallOrGlazing(selectedIdx, 'glazing')}
          className="btn"
          style={{
            flex: 1,
            background: isGlazing ? '#2196F3' : '#eee',
            color: isGlazing ? '#fff' : '#444',
            border: isGlazing ? 'none' : '1px solid #ccc',
          }}
        >
          Inglasning
        </button>
        <button
          type="button"
          onClick={() => setEdgeWallOrGlazing(selectedIdx, 'wall')}
          className="btn"
          style={{
            flex: 1,
            background: !isGlazing ? '#e53935' : '#eee',
            color: !isGlazing ? '#fff' : '#444',
            border: !isGlazing ? 'none' : '1px solid #ccc',
          }}
        >
          Vägg
        </button>
      </div>

      {/* Segment info */}
      <div>
        <InfoRow label="Sida" value={`${data.sideNumber}`} />
        <InfoRow label="Längd" value={`${Math.round(data.edgeLength)} mm`} />
        {data.startAngle !== 0 && (
          <InfoRow label="Startvinkel" value={`${data.startAngle}°`} />
        )}
        {data.endAngle !== 0 && (
          <InfoRow label="Slutvinkel" value={`${data.endAngle}°`} />
        )}
        {data.startConnectedToWall && (
          <InfoRow label="Start" value="Vägg" highlight />
        )}
        {data.endConnectedToWall && (
          <InfoRow label="Slut" value="Vägg" highlight />
        )}
      </div>

      {/* Profile offsets */}
      {isGlazing && (
        <div style={{ borderTop: '1px solid #eee', paddingTop: 6, marginTop: 6 }}>
          <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Profiloffsets</div>
          <InfoRow label="Offset V" value={`${data.profileOffsetLeft} mm`} />
          <InfoRow label="Offset H" value={`${data.profileOffsetRight} mm`} />
        </div>
      )}

      {/* Module summary */}
      {isGlazing && edgeConfig.panels.length > 0 && (
        <div style={{ borderTop: '1px solid #eee', paddingTop: 6, marginTop: 6 }}>
          <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Modulmått</div>
          <InfoRow label="Modullängd" value={`${data.totalModuleLength} mm`} />
          <InfoRow
            label="Spel guide"
            value={`${data.spelGuide} mm`}
            warn={Math.abs(data.spelGuide) > 5}
          />
        </div>
      )}

      {/* Cut lengths */}
      {isGlazing && (
        <div style={{ borderTop: '1px solid #eee', paddingTop: 6, marginTop: 6 }}>
          <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Kaplängder</div>
          <InfoRow label="Underskena" value={`${data.cutLengths.underskena} mm`} />
          <InfoRow label="Överskena" value={`${data.cutLengths.overskena} mm`} />
          <InfoRow label="Överhållare" value={`${data.cutLengths.overhallare} mm`} />
          <InfoRow label="Täcklist" value={`${data.cutLengths.coverprofile} mm`} />
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
      <span style={{ color: '#444' }}>{label}</span>
      <span
        style={{
          fontWeight: 600,
          color: warn ? '#f59e0b' : highlight ? '#e53935' : '#2196F3',
        }}
      >
        {value}
      </span>
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
