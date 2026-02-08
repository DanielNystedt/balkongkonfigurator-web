export interface Point2D {
  x: number; // millimeters
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface Vector3D extends Vector2D {
  z: number;
}
