import { useEffect } from 'react';
import { StatusBar } from './components/layout/StatusBar';
import { SplitView } from './components/layout/SplitView';
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
          clearGuide();
        }
      }
      if (e.key === 'Enter' && isDrawing) {
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
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
      <SplitView />
      <StatusBar />
    </div>
  );
}
