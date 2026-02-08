import { useEffect } from 'react';
import { Toolbar } from './components/layout/Toolbar';
import { StatusBar } from './components/layout/StatusBar';
import { SplitView } from './components/layout/SplitView';
import { ViewTabs } from './components/layout/ViewTabs';
import { LevelsPanel } from './components/panels/LevelsPanel';
import { useConfigStore } from './store/useConfigStore';

export default function App() {
  const isDrawing = useConfigStore((s) => s.isDrawing);
  const setIsDrawing = useConfigStore((s) => s.setIsDrawing);
  const undoLastPoint = useConfigStore((s) => s.undoLastPoint);
  const clearGuide = useConfigStore((s) => s.clearGuide);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isDrawing) {
          // Cancel drawing: clear all points
          clearGuide();
        }
      }
      if (e.key === 'Enter' && isDrawing) {
        // Finish drawing (stop adding points)
        setIsDrawing(false);
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && isDrawing) {
        e.preventDefault();
        undoLastPoint();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, setIsDrawing, undoLastPoint, clearGuide]);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <Toolbar />
      <SplitView
        viewport={<ViewTabs />}
        panel={<LevelsPanel />}
      />
      <StatusBar />
    </div>
  );
}
