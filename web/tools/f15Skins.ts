import type { ConvertedMesh, MeshGroup, Rgb } from "../src/assets/types";

type Point = [number, number, number];
type Variant = "cipher" | "pixy";

const colors = {
  silver: { r: 176, g: 194, b: 202 },
  cipherBlue: { r: 20, g: 43, b: 74 },
  pixyRed: { r: 201, g: 39, b: 32 },
  tailGray: { r: 88, g: 100, b: 108 },
  glass: { r: 33, g: 50, b: 62 },
  white: { r: 235, g: 241, b: 240 },
  badgeRed: { r: 177, g: 38, b: 34 },
} satisfies Record<string, Rgb>;

function group(colorId: number, color: Rgb): MeshGroup {
  return { colorId, color, bright: false, positions: [], normals: [] };
}

function triangle(target: MeshGroup, points: Point[], normal: Point): void {
  for (const point of points) {
    target.positions.push(...point);
    target.normals.push(...normal);
  }
}

function polygon(target: MeshGroup, points: Point[], normal: Point): void {
  for (let i = 1; i < points.length - 1; i++) {
    triangle(target, [points[0], points[i], points[i + 1]], normal);
  }
}

function clipWing(points: Point[], side: number, boundary: number, outer: boolean): Point[] {
  const inside = (point: Point) => outer
    ? side * point[0] >= boundary - 1e-6
    : side * point[0] <= boundary + 1e-6;
  const output: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const aIn = inside(a), bIn = inside(b);
    if (aIn) output.push(a);
    if (aIn !== bIn) {
      const t = (side * boundary - a[0]) / (b[0] - a[0]);
      output.push([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ]);
    }
  }
  return output;
}

/** Paint the original F-15 geometry without changing its silhouette. */
export function createF15Skin(source: ConvertedMesh, variant: Variant): ConvertedMesh {
  const silver = group(61000, colors.silver);
  const accent = group(61001, variant === "cipher" ? colors.cipherBlue : colors.pixyRed);
  const tail = group(61002, variant === "cipher" ? colors.cipherBlue : colors.tailGray);
  const badgeWhite = group(61003, colors.white);
  const badgeRed = group(61004, colors.badgeRed);
  const decorated: MeshGroup[] = [silver, accent, tail];

  for (const original of source.groups) {
    if (original.colorId === 31) {
      decorated.push({ ...original, color: colors.glass });
      continue;
    }
    if (original.colorId !== 17748) {
      decorated.push({ ...original, color: original.color });
      continue;
    }
    for (let i = 0; i < original.positions.length; i += 9) {
      const points: Point[] = [0, 3, 6].map((offset) =>
        original.positions.slice(i + offset, i + offset + 3) as Point);
      const normal = original.normals.slice(i, i + 3) as Point;
      const xs = points.map((point) => point[0]);
      const ys = points.map((point) => point[1]);
      const zs = points.map((point) => point[2]);
      const wingTop = ys.every((y) => Math.abs(y - 0.6) < 0.001)
        && Math.max(...xs.map(Math.abs)) > 3
        && Math.min(...zs) >= -5.31 && Math.max(...zs) <= 0.51;
      if (wingTop) {
        const side = Math.sign(xs.reduce((sum, x) => sum + x, 0));
        if (variant === "cipher" || side > 0) {
          polygon(silver, clipWing(points, side, 3.55, false), normal);
          polygon(accent, clipWing(points, side, 3.55, true), normal);
        } else triangle(silver, points, normal);
        continue;
      }
      const fin = ys.some((y) => y > 3)
        && xs.every((x) => Math.abs(Math.abs(x) - 1.6) < 0.001);
      const stabilatorTop = ys.every((y) => Math.abs(y - 0.2) < 0.001)
        && Math.max(...xs.map(Math.abs)) > 3 && Math.max(...zs) < -6;
      if (fin && xs[0] > 0) triangle(tail, points, normal);
      else if (stabilatorTop && variant === "cipher") triangle(accent, points, normal);
      else triangle(silver, points, normal);
    }
  }

  // Small Galm-style red and white wing flashes remain legible in top view.
  for (const side of [-1, 1]) {
    const x = side * 5.2;
    const flash: Point[] = [
      [x, 0.617, -4.05], [x - side * 0.19, 0.617, -4.43],
      [x + side * 0.18, 0.617, -4.35],
    ];
    polygon(badgeWhite, flash, [0, 1, 0]);
    polygon(badgeRed, [
      [x, 0.621, -4.15], [x - side * 0.07, 0.621, -4.34],
      [x + side * 0.08, 0.621, -4.31],
    ], [0, 1, 0]);
  }
  decorated.push(badgeWhite, badgeRed);
  return { sourceName: `F-15C ${variant.toUpperCase()} (Galm)`, groups: decorated.filter((g) => g.positions.length) };
}
