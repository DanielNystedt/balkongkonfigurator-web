import type { Panel } from './panel';

export interface EdgeConfig {
  wallOrGlazingStatus: 'wall' | 'glazing';
  panels: Panel[];
}
