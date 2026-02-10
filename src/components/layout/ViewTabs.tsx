import { useState, useRef, useCallback, useEffect } from 'react';
import { useConfigStore } from '../../store/useConfigStore';
import type { ActiveView } from '../../store/useConfigStore';
import { ViewportCanvas } from '../viewport/ViewportCanvas';
import { CadView2D } from '../cad/CadView2D';
import { ClipSlider } from '../viewport/ClipSlider';

const TABS: { view: ActiveView; label: string }[] = [
  { view: '2d', label: '2D' },
  { view: '3d', label: '3D Modell' },
  { view: '2d3d', label: '2D/3D' },
];

export function ViewTabs() {
  const activeView = useConfigStore((s) => s.activeView);
  const setActiveView = useConfigStore((s) => s.setActiveView);

  // Split position for 2d3d mode (percentage for left pane)
  const [splitPercent, setSplitPercent] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(15, Math.min(85, (x / rect.width) * 100));
      setSplitPercent(pct);
    }
    function onMouseUp() {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const render2D = () => (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <CadView2D />
      <ClipSlider />
    </div>
  );

  const render3D = () => (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ViewportCanvas />
      <ClipSlider />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', background: '#2a2a4e', padding: 8, gap: 8, flexShrink: 0 }}>
        {TABS.map(({ view, label }) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            style={{
              padding: '6px 16px',
              background: activeView === view ? '#2196F3' : '#444',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: 'relative' }} ref={containerRef}>
        {activeView === '2d' && render2D()}
        {activeView === '3d' && render3D()}
        {activeView === '2d3d' && (
          <div style={{ display: 'flex', height: '100%', width: '100%', position: 'absolute', inset: 0 }}>
            <div style={{ position: 'relative', overflow: 'hidden', width: `${splitPercent}%` }}>
              {render2D()}
            </div>
            <div
              style={{
                width: 4,
                background: '#555',
                cursor: 'col-resize',
                flexShrink: 0,
              }}
              onMouseDown={onMouseDown}
              onMouseEnter={(e) => { (e.target as HTMLDivElement).style.background = '#2196F3'; }}
              onMouseLeave={(e) => { if (!dragging.current) (e.target as HTMLDivElement).style.background = '#555'; }}
            />
            <div style={{ position: 'relative', overflow: 'hidden', flex: 1 }}>
              {render3D()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
