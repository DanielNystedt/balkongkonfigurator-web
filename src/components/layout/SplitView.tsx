import { ViewTabs } from './ViewTabs';
import { ConfigPanel } from '../panels/ConfigPanel';

export function SplitView() {
  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Left panel — settings (white sidebar like reference) */}
      <div
        className="sidebar"
        style={{
          width: 300,
          background: '#fff',
          padding: 16,
          overflowY: 'auto',
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        <ConfigPanel />
      </div>

      {/* Viewport area — takes remaining space */}
      <div style={{ flex: 1, position: 'relative', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <ViewTabs />
      </div>
    </div>
  );
}
