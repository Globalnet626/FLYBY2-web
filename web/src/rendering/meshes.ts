import * as THREE from "three";
import type {
  Appearance,
  ConvertedMesh,
  ConvertedPc2,
  ConvertedTer,
  Rgb,
} from "../assets/types";

function rgbToThree(c: Rgb): THREE.Color {
  return new THREE.Color(c.r / 255, c.g / 255, c.b / 255);
}

function pc2Color(c: Rgb): THREE.Color {
  // PC2 colors are byte-encoded display colors. Three.Color's numeric
  // constructor interprets them as linear values and makes the runway pale.
  return new THREE.Color().setRGB(
    c.r / 255,
    c.g / 255,
    c.b / 255,
    THREE.SRGBColorSpace,
  );
}

export function meshFromSrf(
  mesh: ConvertedMesh,
  appearance?: Appearance,
): THREE.Group {
  const root = new THREE.Group();
  root.name = mesh.sourceName;

  for (const g of mesh.groups) {
    const override = appearance?.palette?.[g.colorId];
    const color = rgbToThree(override ?? g.color);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(g.positions, 3),
    );
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(g.normals, 3));
    const mat = new THREE.MeshLambertMaterial({
      color,
      flatShading: true,
      emissive: g.bright ? color.clone().multiplyScalar(0.25) : new THREE.Color(0),
      // Double-sided until winding matches the original LEFT-twist constraint everywhere.
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat);
    m.userData.colorId = g.colorId;
    root.add(m);
  }
  return root;
}

export function meshFromPc2(pc2: ConvertedPc2, groundMap = false): THREE.Group {
  const root = new THREE.Group();
  root.name = pc2.sourceName;
  for (const [index, poly] of pc2.polygons.entries()) {
    if (poly.verts.length < 3) continue;
    const positions: number[] = [];
    const normals: number[] = [];
    // Fan triangulate in XY (z=0)
    for (let i = 1; i < poly.verts.length - 1; i++) {
      const tris = [poly.verts[0], poly.verts[i], poly.verts[i + 1]];
      for (const [x, y] of tris) {
        // Ground maps have coplanar base and markings. Separate their depth
        // planes so the depth buffer does not make the runway shimmer.
        positions.push(x, y, groundMap ? (index === 0 ? 0.2 : 0.5) : 0);
        normals.push(0, 0, 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    const mat = new THREE.MeshBasicMaterial({
      color: pc2Color(poly.color),
      side: THREE.DoubleSide,
      depthWrite: true,
      polygonOffset: groundMap,
      polygonOffsetFactor: groundMap ? (index === 0 ? -1 : -2) : 0,
      polygonOffsetUnits: groundMap ? (index === 0 ? -1 : -2) : 0,
    });
    root.add(new THREE.Mesh(geo, mat));
  }
  return root;
}

export function meshFromTer(ter: ConvertedTer): THREE.Mesh {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(ter.positions, 3),
  );
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(ter.normals, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(ter.colors, 3));
  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = ter.sourceName;
  return mesh;
}
