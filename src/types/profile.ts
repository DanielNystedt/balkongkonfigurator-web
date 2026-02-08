export type BarlinaType = '100x100' | '50x100x100' | '100x50' | 'L-Stal' | 'Ingen';
export type BottenprofilType = '50x30' | '50x50' | 'Ingen';
export type BrostningsramType =
  | 'Vit Panel'
  | 'Vit & Gra Panel'
  | 'Fast Glas'
  | 'Oppningsbart Glas'
  | 'Brand';

export interface ProfileConfig {
  isHelinglasning: boolean;
  barlinaType: BarlinaType;
  bottenprofilType: BottenprofilType;
  vaggEnabled: boolean;
  brostningEnabled: boolean;
  brostningsramType: BrostningsramType;
}

export interface CutLengths {
  underprofile: number;
  overprofile: number;
  coverprofile: number;
  overhallare: number;
}
