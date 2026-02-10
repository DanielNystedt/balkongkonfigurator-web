import type { ReactNode } from 'react';
import { useConfigStore } from '../../store/useConfigStore';

interface CollapsibleSectionProps {
  id: string;
  title: string;
  badge?: string;
  disabled?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({ id, title, badge, disabled, children }: CollapsibleSectionProps) {
  const expanded = useConfigStore((s) => s.expandedSections[id] ?? true);
  const toggleSection = useConfigStore((s) => s.toggleSection);

  return (
    <div className="section" style={disabled ? { opacity: 0.4 } : {}}>
      <div
        onClick={() => !disabled && toggleSection(id)}
        className="section-title"
        style={{ cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span>{title}</span>
        {badge && (
          <span style={{ color: '#2196F3', fontWeight: 600 }}>{badge}</span>
        )}
      </div>
      {expanded && !disabled && children}
    </div>
  );
}
