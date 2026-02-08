import type { ReactNode } from 'react';

interface SplitViewProps {
  viewport: ReactNode;
  panel: ReactNode;
}

export function SplitView({ viewport, panel }: SplitViewProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* 3D Viewport - takes remaining space */}
      <div className="flex-1 relative">
        {viewport}
      </div>

      {/* Config Panel - fixed width right side */}
      <div className="w-80 bg-gray-900 border-l border-gray-700 overflow-y-auto p-3">
        {panel}
      </div>
    </div>
  );
}
