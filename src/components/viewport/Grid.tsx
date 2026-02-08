import { Grid as DreiGrid } from '@react-three/drei';

export function Grid() {
  return (
    <DreiGrid
      args={[20, 20]}
      cellSize={0.5}
      cellThickness={0.5}
      cellColor="#6b7280"
      sectionSize={5}
      sectionThickness={1}
      sectionColor="#374151"
      fadeDistance={30}
      fadeStrength={1}
      infiniteGrid
    />
  );
}
