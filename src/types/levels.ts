export type LevelName = 'Understycke' | 'Mellanstycke' | 'Overstycke';

export interface Level {
  name: LevelName;
  zPosition: number; // mm, global Z
  visible: boolean;
}

export interface LevelsConfig {
  levels: Record<LevelName, Level>;
}
