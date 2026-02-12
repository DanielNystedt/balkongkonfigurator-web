import {
  usePanelBuilderStore,
  END_CAP_INFO,
  END_CAP_TYPES,
  DEFAULT_GLASS_OFFSET,
  DEFAULT_TOP_LOCK_WIDTH,
  DEFAULT_BOTTOM_LOCK_WIDTH,
  GLASS_HEIGHT_DEDUCTION,
  GLASS_MODULE_HEIGHT_DEDUCTION,
  type EndCapType,
  type LockVariant,
} from '../../store/panelBuilderStore';

const LOCK_VARIANT_LABELS: Record<LockVariant, string> = {
  single: 'Enkellås',
  double: 'Dubbellås',
  none: 'Inget lås',
};

const inputStyle: React.CSSProperties = {
  width: 70,
  padding: '3px 5px',
  fontSize: 12,
  border: '1px solid #ccc',
  borderRadius: 3,
  textAlign: 'right',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '3px 0',
  fontSize: 11,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 14,
};

const headerStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 12,
  marginBottom: 6,
  color: '#333',
};

function OffsetRow({
  label,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  value: number;
  defaultValue: number;
  onChange: (v: number) => void;
}) {
  const isModified = value !== defaultValue;
  return (
    <div style={rowStyle}>
      <span style={{ color: isModified ? '#e65100' : '#555', flex: 1 }}>
        {label}
        {isModified && ' *'}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        step={0.1}
        style={{
          ...inputStyle,
          borderColor: isModified ? '#e65100' : '#ccc',
        }}
      />
      <span style={{ fontSize: 10, color: '#999', marginLeft: 4, width: 24 }}>mm</span>
    </div>
  );
}

export function OffsetSettings() {
  const glassOffsets = usePanelBuilderStore((s) => s.glassOffsets);
  const topLockWidths = usePanelBuilderStore((s) => s.topLockWidths);
  const bottomLockWidths = usePanelBuilderStore((s) => s.bottomLockWidths);
  const glassHeightDeduction = usePanelBuilderStore((s) => s.glassHeightDeduction);
  const glassModuleHeightDeduction = usePanelBuilderStore((s) => s.glassModuleHeightDeduction);
  const setGlassOffset = usePanelBuilderStore((s) => s.setGlassOffset);
  const setTopLockWidth = usePanelBuilderStore((s) => s.setTopLockWidth);
  const setBottomLockWidth = usePanelBuilderStore((s) => s.setBottomLockWidth);
  const setGlassHeightDeduction = usePanelBuilderStore((s) => s.setGlassHeightDeduction);
  const setGlassModuleHeightDeduction = usePanelBuilderStore((s) => s.setGlassModuleHeightDeduction);
  const resetOffsetsToDefaults = usePanelBuilderStore((s) => s.resetOffsetsToDefaults);

  const lockVariants: LockVariant[] = ['single', 'double', 'none'];

  return (
    <div>
      <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>
        Offset-inställningar
      </h3>
      <p style={{ fontSize: 10, color: '#888', margin: '0 0 12px' }}>
        Alla värden i mm. Orange = ändrat från standard.
      </p>

      {/* Glass offsets per end cap */}
      <div style={sectionStyle}>
        <div style={headerStyle}>Glasoffset per ändlock</div>
        <p style={{ fontSize: 9, color: '#999', margin: '0 0 6px' }}>
          Hur mycket glaset sticker ut förbi glashållaren
        </p>
        {END_CAP_TYPES.map((type) => (
          <OffsetRow
            key={type}
            label={type}
            value={glassOffsets[type]}
            defaultValue={DEFAULT_GLASS_OFFSET[type]}
            onChange={(v) => setGlassOffset(type, v)}
          />
        ))}
      </div>

      {/* Top lock (överlås) deductions */}
      <div style={sectionStyle}>
        <div style={headerStyle}>Överlås avdrag (övre glaslist)</div>
        {lockVariants.map((v) => (
          <OffsetRow
            key={`top-${v}`}
            label={LOCK_VARIANT_LABELS[v]}
            value={topLockWidths[v]}
            defaultValue={DEFAULT_TOP_LOCK_WIDTH[v]}
            onChange={(val) => setTopLockWidth(v, val)}
          />
        ))}
      </div>

      {/* Bottom lock (undre lås) deductions */}
      <div style={sectionStyle}>
        <div style={headerStyle}>Undrelås avdrag (undre glaslist)</div>
        {lockVariants.map((v) => (
          <OffsetRow
            key={`bot-${v}`}
            label={LOCK_VARIANT_LABELS[v]}
            value={bottomLockWidths[v]}
            defaultValue={DEFAULT_BOTTOM_LOCK_WIDTH[v]}
            onChange={(val) => setBottomLockWidth(v, val)}
          />
        ))}
      </div>

      {/* Glass height deductions */}
      <div style={sectionStyle}>
        <div style={headerStyle}>Höjdavdrag</div>
        <OffsetRow
          label="Glashöjd"
          value={glassHeightDeduction}
          defaultValue={GLASS_HEIGHT_DEDUCTION}
          onChange={setGlassHeightDeduction}
        />
        <OffsetRow
          label="Glasmodulhöjd"
          value={glassModuleHeightDeduction}
          defaultValue={GLASS_MODULE_HEIGHT_DEDUCTION}
          onChange={setGlassModuleHeightDeduction}
        />
      </div>

      {/* Reset button */}
      <button
        onClick={resetOffsetsToDefaults}
        style={{
          width: '100%',
          padding: '6px 10px',
          fontSize: 11,
          background: '#f44336',
          color: '#fff',
          border: 'none',
          borderRadius: 3,
          cursor: 'pointer',
        }}
      >
        Återställ till standardvärden
      </button>
    </div>
  );
}
