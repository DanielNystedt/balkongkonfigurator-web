import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Center } from '@react-three/drei';
import { GlassPanel3D } from './GlassPanel3D';
import { OffsetSettings } from './OffsetSettings';
import {
  usePanelBuilderStore,
  END_CAP_INFO,
  END_CAP_TYPES,
  PART_KEYS,
  PART_LABELS,
  type EndCapType,
  type LockVariant,
  type PartKey,
} from '../../store/panelBuilderStore';

// ─── Part rotation controls ──────────────────────────────────────
const AXIS_LABELS = ['X', 'Y', 'Z'] as const;

function PartRotationControls() {
  const partRotations = usePanelBuilderStore((s) => s.partRotations);
  const rotatePart = usePanelBuilderStore((s) => s.rotatePart);
  const logAllRotations = usePanelBuilderStore((s) => s.logAllRotations);

  const btnStyle: React.CSSProperties = {
    width: 22,
    height: 22,
    padding: 0,
    fontSize: 12,
    fontWeight: 700,
    border: '1px solid #ccc',
    borderRadius: 3,
    cursor: 'pointer',
    background: '#fff',
    lineHeight: '20px',
    textAlign: 'center',
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Rotera delar (90°-steg)</div>

      {PART_KEYS.map((part) => {
        const steps = partRotations[part];
        return (
          <div key={part} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: '#555', width: 70, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {PART_LABELS[part]}
            </span>
            {([0, 1, 2] as const).map((axis) => (
              <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <button
                  style={btnStyle}
                  title={`${AXIS_LABELS[axis]} −90°`}
                  onClick={() => rotatePart(part, axis, -1)}
                >
                  ◀
                </button>
                <span style={{ fontSize: 9, width: 24, textAlign: 'center', color: '#888' }}>
                  {AXIS_LABELS[axis]}{steps[axis] * 90}°
                </span>
                <button
                  style={btnStyle}
                  title={`${AXIS_LABELS[axis]} +90°`}
                  onClick={() => rotatePart(part, axis, 1)}
                >
                  ▶
                </button>
              </div>
            ))}
          </div>
        );
      })}

      <button
        onClick={logAllRotations}
        style={{
          marginTop: 6,
          padding: '4px 10px',
          fontSize: 11,
          background: '#2196F3',
          color: '#fff',
          border: 'none',
          borderRadius: 3,
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Logga rotationer (console)
      </button>
    </div>
  );
}

// ─── Config sidebar ──────────────────────────────────────────────
function PanelConfigSidebar() {
  const panelWidth = usePanelBuilderStore((s) => s.panelWidth);
  const panelHeight = usePanelBuilderStore((s) => s.panelHeight);
  const endCapLeftType = usePanelBuilderStore((s) => s.endCapLeftType);
  const endCapRightType = usePanelBuilderStore((s) => s.endCapRightType);
  const lockType = usePanelBuilderStore((s) => s.lockType);
  const setPanelWidth = usePanelBuilderStore((s) => s.setPanelWidth);
  const setPanelHeight = usePanelBuilderStore((s) => s.setPanelHeight);
  const setEndCapLeftType = usePanelBuilderStore((s) => s.setEndCapLeftType);
  const setEndCapRightType = usePanelBuilderStore((s) => s.setEndCapRightType);
  const setLockType = usePanelBuilderStore((s) => s.setLockType);
  const glassOffsets = usePanelBuilderStore((s) => s.glassOffsets);
  const topLockWidths = usePanelBuilderStore((s) => s.topLockWidths);
  const bottomLockWidths = usePanelBuilderStore((s) => s.bottomLockWidths);
  const glassHeightDed = usePanelBuilderStore((s) => s.glassHeightDeduction);

  // Derived display values (using editable offsets)
  const leftOffset = glassOffsets[endCapLeftType];
  const rightOffset = glassOffsets[endCapRightType];
  const glassWidth = panelWidth;  // glass fills full panel width
  const glassHeight = panelHeight - glassHeightDed;
  const upperProfileLen = panelWidth - leftOffset - rightOffset;
  const lowerProfileLen = panelWidth - leftOffset - rightOffset - bottomLockWidths[lockType];

  const endCapOptions = END_CAP_TYPES.map((key) => ({
    value: key,
    label: END_CAP_INFO[key].label,
  }));

  const lockOptions: { value: LockVariant; label: string }[] = [
    { value: 'single', label: 'Enkellås (överlås 30mm / undrelås 5mm)' },
    { value: 'double', label: 'Dubbellås (överlås 30mm / undrelås 5mm)' },
    { value: 'none', label: 'Inget lås' },
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 6px',
    fontSize: 13,
    border: '1px solid #ccc',
    borderRadius: 3,
    boxSizing: 'border-box',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    background: '#fff',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
    display: 'block',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: 14,
  };

  const infoRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: '#888',
    padding: '2px 0',
  };

  return (
    <>
      {/* Dimensions */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Dimensioner</div>

        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>Panelbredd (mm)</label>
          <input
            type="number"
            value={panelWidth}
            onChange={(e) => setPanelWidth(Number(e.target.value) || 0)}
            min={100}
            max={1200}
            step={10}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>Panelhöjd (mm)</label>
          <input
            type="number"
            value={panelHeight}
            onChange={(e) => setPanelHeight(Number(e.target.value) || 0)}
            min={500}
            max={3000}
            step={10}
            style={inputStyle}
          />
        </div>
      </div>

      {/* End caps */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Ändlock</div>

        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>Vänster</label>
          <select
            value={endCapLeftType}
            onChange={(e) => setEndCapLeftType(e.target.value as EndCapType)}
            style={selectStyle}
          >
            {endCapOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>Höger</label>
          <select
            value={endCapRightType}
            onChange={(e) => setEndCapRightType(e.target.value as EndCapType)}
            style={selectStyle}
          >
            {endCapOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lock */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Lås</div>
        <select
          value={lockType}
          onChange={(e) => setLockType(e.target.value as LockVariant)}
          style={selectStyle}
        >
          {lockOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Part rotations */}
      <PartRotationControls />

      {/* Computed info */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, color: '#2196F3' }}>
          Beräknade mått
        </div>
        <div style={infoRowStyle}>
          <span>Glasbredd:</span>
          <span>{glassWidth.toFixed(1)} mm</span>
        </div>
        <div style={infoRowStyle}>
          <span>Glashöjd:</span>
          <span>{glassHeight.toFixed(1)} mm</span>
        </div>
        <div style={infoRowStyle}>
          <span>Övre glaslist:</span>
          <span>{upperProfileLen.toFixed(1)} mm</span>
        </div>
        <div style={infoRowStyle}>
          <span>Undre glaslist:</span>
          <span>{lowerProfileLen.toFixed(1)} mm</span>
        </div>
        <div style={infoRowStyle}>
          <span>Glasoffset V:</span>
          <span>{leftOffset} mm</span>
        </div>
        <div style={infoRowStyle}>
          <span>Glasoffset H:</span>
          <span>{rightOffset} mm</span>
        </div>
        <div style={infoRowStyle}>
          <span>Överlås avdrag:</span>
          <span>{topLockWidths[lockType]} mm</span>
        </div>
        <div style={infoRowStyle}>
          <span>Undrelås avdrag:</span>
          <span>{bottomLockWidths[lockType]} mm</span>
        </div>
      </div>
    </>
  );
}

// ─── Loading fallback ────────────────────────────────────────────
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.1, 0.1, 0.1]} />
      <meshBasicMaterial color="#2196F3" wireframe />
    </mesh>
  );
}

// ─── Tab styles ─────────────────────────────────────────────────
const tabBtnBase: React.CSSProperties = {
  flex: 1,
  padding: '8px 4px',
  fontSize: 11,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  transition: 'background 0.15s',
};

// ─── Main view ───────────────────────────────────────────────────
export function PanelBuilderView() {
  const [activeTab, setActiveTab] = useState<'config' | 'settings'>('config');

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      {/* 3D Viewport */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas
          camera={{ position: [0, 0, 2.5], fov: 45, near: 0.01, far: 100 }}
          style={{ background: '#2a2a3e' }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <directionalLight position={[-3, 3, -3]} intensity={0.3} />

          <Suspense fallback={<LoadingFallback />}>
            <Center>
              <GlassPanel3D />
            </Center>
          </Suspense>

          <gridHelper args={[4, 40, '#444', '#333']} position={[0, -1.5, 0]} />

          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.1}
            minDistance={0.3}
            maxDistance={10}
          />
        </Canvas>
      </div>

      {/* Sidebar with tabs */}
      <div
        style={{
          width: 260,
          background: '#f8f8f8',
          borderLeft: '1px solid #ddd',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
          <button
            onClick={() => setActiveTab('config')}
            style={{
              ...tabBtnBase,
              background: activeTab === 'config' ? '#f8f8f8' : '#e0e0e0',
              color: activeTab === 'config' ? '#333' : '#888',
              borderBottom: activeTab === 'config' ? '2px solid #2196F3' : '2px solid transparent',
            }}
          >
            Konfigurator
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              ...tabBtnBase,
              background: activeTab === 'settings' ? '#f8f8f8' : '#e0e0e0',
              color: activeTab === 'settings' ? '#333' : '#888',
              borderBottom: activeTab === 'settings' ? '2px solid #e65100' : '2px solid transparent',
            }}
          >
            Inställningar
          </button>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {activeTab === 'config' ? <PanelConfigSidebar /> : <OffsetSettings />}
        </div>
      </div>
    </div>
  );
}
