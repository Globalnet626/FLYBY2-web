export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z);
  if (len < 1e-8) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Keen-edge / Newell average normal for a polygon. */
export function averageNormal(pts: Vec3[]): Vec3 {
  const n = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    n.x += (a.y - b.y) * (a.z + b.z);
    n.y += (a.z - b.z) * (a.x + b.x);
    n.z += (a.x - b.x) * (a.y + b.y);
  }
  if (Math.hypot(n.x, n.y, n.z) < 1e-8 && pts.length >= 3) {
    for (let i = 1; i < pts.length - 1; i++) {
      const c = cross(sub(pts[i], pts[0]), sub(pts[i + 1], pts[0]));
      if (Math.hypot(c.x, c.y, c.z) > 1e-8) return normalize(c);
    }
  }
  return normalize(n);
}

export function decodeGrb555(col15: number): {
  r: number;
  g: number;
  b: number;
  colorId: number;
} {
  const g = ((col15 >> 10) & 31) * (255 / 31);
  const r = ((col15 >> 5) & 31) * (255 / 31);
  const b = (col15 & 31) * (255 / 31);
  return {
    colorId: col15,
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
  };
}

/** Fan triangulation; reverse when computed normal opposes provided face normal. */
export function triangulate(
  indices: number[],
  positions: Vec3[],
  faceNormal: Vec3 | null,
): number[] {
  let order = indices.slice();
  if (order.length < 3) return [];
  const pts = order.map((i) => positions[i]);
  const computed = averageNormal(pts);
  if (faceNormal && Math.hypot(faceNormal.x, faceNormal.y, faceNormal.z) > 1e-6) {
    if (dot(computed, faceNormal) < 0) order = order.reverse();
  }
  const tris: number[] = [];
  for (let i = 1; i < order.length - 1; i++) {
    tris.push(order[0], order[i], order[i + 1]);
  }
  return tris;
}
