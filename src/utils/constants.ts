// All magic numbers extracted from the Ruby SketchUp plugin source code.
// Each value is documented with its source file and line reference.

// Lock width compensation values (mm) — 070_set_glas_attribute.rb
export const LOCK_WIDTHS: Record<string, number> = {
  '90 graderslock hane': 11.5,
  '90 graderslock hona': 11.5,
  'Variabelt andlock': 7.9,
  'Slutlock hane': 25,
  'Slutlock hona': 25,
  'Moteslock hane': 5.0,
  'Moteslock hona': 5.0,
  'Overlas dubbel': 30,
  'Overlas': 30,
  'Undre las dubbel': 5.0,
  'Undre las': 5.0,
};

// Glass height offsets (mm) — 070_set_glas_attribute.rb
export const GLASS_HEIGHT_OFFSET = 210.3;
export const GLASS_MODULE_HEIGHT_OFFSET = 170.3;
export const PC_COMPONENT_OFFSET = 86;

// Interpolation tables for offset calculation — 030_Config_glazing.rb
export const INTERPOLATION_ANGLES = [145, 140, 135, 130, 125, 120, 115, 110, 105, 100, 95, 90];
export const WALL_OFFSETS = [83.65, 78.39, 75.21, 73.2, 72.26, 72.17, 72.8, 74.08, 75.94, 78.38, 81.39, 85];
export const GLAZING_OFFSETS = [42.6, 28.44, 21.36, 12.58, 4.58, 2.89, -10.02, -16.95, -23.81, -30.71, -37.74, -45];

// Miter distance constants (mm) — 060_screw_and_guide.rb
export const MITER_DISTANCE_UNDERSKENA = 85;
export const MITER_DISTANCE_OVERSKENA = 80.5;
export const MITER_DISTANCE_OVERHALLARE = -37.1;
export const MITER_DISTANCE_COVERPROFILE = -88.09;
export const COVER_PROFILE_WALL_OFFSET = 54;

// Panel division — 030_Config_glazing.rb / 275_Multi_Guide_HTML.rb
export const MAX_PANEL_WIDTH = 700; // mm
export const MIN_PANEL_WIDTH = 430; // mm — minimum standard size
export const PANEL_STEP = 30; // mm — increment between standard sizes
export const STANDARD_PANEL_SIZES = [430, 460, 490, 520, 550, 580, 610, 640, 670, 700]; // mm
export const FREE_WIDTH_THRESHOLD = 400; // mm — below this average, use free width
export const COMBO_TOLERANCE = 5.0; // mm — panels can exceed available by up to this
export const MIDDLE_PANEL_OFFSET = 2.0; // mm — normal meeting lock offset per side
export const PASSRUTA_PANEL_OFFSET = 6.0; // mm — variable end lock offset (fixed glass)

// Default offsets — 030_Config_glazing.rb
export const DEFAULT_OFFSET_ANGLE_ZERO = 46.5; // mm
export const DEFAULT_OFFSET_WALL_90 = 91.5; // mm (50.5 + 45 - 4)
export const POSITIVE_ANGLE_FACTOR = 67.89;
export const NEGATIVE_ANGLE_FACTOR = 57.11;
export const OFFSET_ADDEND = 5.0; // 2.0 + 3.0

// Variable compensation interpolation — 090_FrameBuilder.rb
export const VARIABLE_COMP_ANGLES = [90, 70, 45, 44, 37, 32, 23, 5];
export const VARIABLE_COMP_VALUES = [2, 2, 3.5, 3.7, 4.3, 4.6, 5.2, 8];

// Guide offset defaults — 050_Make_guide.rb
export const GUIDE_OFFSET_DISTANCE = -10; // mm
export const GUIDE_START_INSET = 20; // mm
export const GUIDE_END_INSET = 20; // mm

// Frame builder offsets — 090_FrameBuilder.rb
export const BROSTNING_OFFSET_DIST = -85; // mm
export const UNDERLJUS_SPLIT_OFFSET = -45; // mm

// Default level Z positions (mm)
export const DEFAULT_LEVELS = {
  Understycke: 0,
  Mellanstycke: 1000,
  Overstycke: 2100,
} as const;

// Default project config
export const DEFAULT_PROJECT_CONFIG = {
  guid: null as string | null,
  ordernamn: '',
  brfNamn: '',
  balkongtyp: '',
  instruktionTillProduktion: '',
  balkong: '',
  glastyp: 'Kristall' as const,
  glasuppdelning: '',
};

// Default profile config
export const DEFAULT_PROFILE_CONFIG = {
  isHelinglasning: false,
  barlinaType: 'Ingen' as const,
  bottenprofilType: 'Ingen' as const,
  vaggEnabled: false,
  brostningEnabled: false,
  brostningsramType: 'Vit Panel' as const,
};

// Default frame width settings (mm)
export const DEFAULT_FRAME_WIDTH_SETTINGS = {
  maxWidthGlass: 1200,
  maxWidthCovered: 1700,
  maxWidthWall: 2000,
};

// Default accordion section states
export const DEFAULT_EXPANDED_SECTIONS: Record<string, boolean> = {
  project: false,
  profile: true,
  levels: true,
  frameWidth: false,
  segment: true,
  panels: true,
  pointcloud: true,
};
