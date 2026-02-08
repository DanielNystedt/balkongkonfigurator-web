import type { Point3D } from './geometry';
import type { Panel } from './panel';

export interface GuidelineVertex {
  id: string;
  position: Point3D;
  connectedEdgeIds: string[];
}

export interface GuidelineEdge {
  id: string;
  startVertexId: string;
  endVertexId: string;

  // Computed from geometry
  length: number; // mm
  initialLength: number; // mm, stored for "spel guide" difference

  // Classification
  wallOrGlazingStatus: 'glazing' | 'wall';
  sideNumber: number; // 1-based position in chain

  // Angles (degrees) - computed from adjacent edges
  startAngle: number;
  endAngle: number;
  cutAngleLeft: number; // 0 if connected to wall
  cutAngleRight: number; // 0 if connected to wall
  startConnectedToWall: boolean;
  endConnectedToWall: boolean;

  // Profile offsets (mm) - computed from angles
  profileOffsetLeft: number;
  profileOffsetRight: number;

  // Panel data
  panels: Panel[];
  totalModuleLength: number; // mm

  // Profile cut lengths (mm) - computed
  cutLengthUnderprofile: number;
  cutLengthOverprofile: number;
  cutLengthCoverprofile: number;
  cutLengthOverhallare: number;
}
