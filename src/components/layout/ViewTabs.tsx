import { useConfigStore } from '../../store/useConfigStore';
import type { ActiveView } from '../../store/useConfigStore';
import { ViewportCanvas } from '../viewport/ViewportCanvas';
import { CadWorkspace } from '../cad/CadWorkspace';

const TABS: { view: ActiveView; label: string }[] = [
  { view: '2d', label: '2D Plan' },
  { view: '3d', label: '3D Vy' },
];

export function ViewTabs() {
  const activeView = useConfigStore((s) => s.activeView);
  const setActiveView = useConfigStore((s) => s.setActiveView);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex bg-gray-900 border-b border-gray-700">
        {TABS.map(({ view, label }) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`px-4 py-1.5 text-xs font-medium transition-colors border-b-2 ${
              activeView === view
                ? 'text-white border-blue-500 bg-gray-800'
                : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {activeView === '2d' ? <CadWorkspace /> : <ViewportCanvas />}
      </div>
    </div>
  );
}
