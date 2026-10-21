export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface MeshGroup {
  colorId: number;
  color: Rgb;
  bright: boolean;
  /** Flat array of xyz triples for triangulated positions. */
  positions: number[];
  normals: number[];
}

export interface ConvertedMesh {
  sourceName: string;
  groups: MeshGroup[];
  /** Explicit nozzle locations for imported models without bright SRF exhaust faces. */
  exhausts?: Array<{ x: number; y: number; z: number; width: number; height: number; length: number }>;
}

export interface Pc2Polygon {
  color: Rgb;
  /** Local XY verts; converted to XYZ with z=0 then posed. */
  verts: Array<[number, number]>;
}

export interface ConvertedPc2 {
  sourceName: string;
  polygons: Pc2Polygon[];
}

export interface ConvertedTer {
  sourceName: string;
  positions: number[];
  normals: number[];
  colors: number[];
}

export interface FieldPlacement {
  kind: "srf" | "pc2" | "plt" | "ter";
  file: string;
  pos: [number, number, number];
  /** heading, pitch, bank in Impulse angle units */
  att: [number, number, number];
  /** PC2 maps are pitched -90? onto the ground; PLT stays upright. */
  groundMap?: boolean;
}

export interface ConvertedField {
  sourceName: string;
  sky: Rgb;
  ground: Rgb;
  placements: FieldPlacement[];
}

export interface AircraftEntry {
  id: string;
  sourceName: string;
  mesh: string;
}

export interface AssetManifest {
  version: 1;
  altitude: number;
  smokeMode: string;
  field: string;
  aircraft: AircraftEntry[];
  notice: string;
}

export interface AircraftAsset {
  id: string;
  sourceName: string;
  mesh: ConvertedMesh;
}

export interface Appearance {
  /** Optional per colorId RGB override. */
  palette?: Record<number, Rgb>;
}
