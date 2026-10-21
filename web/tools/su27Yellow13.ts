import type { ConvertedMesh, MeshGroup, Rgb } from "../src/assets/types";

type Point = [number, number, number];

const colors = {
  gray: { r: 88, g: 96, b: 101 },
  lightGray: { r: 128, g: 136, b: 138 },
  darkGray: { r: 57, g: 64, b: 70 },
  yellow: { r: 236, g: 186, b: 28 },
  nose: { r: 194, g: 199, b: 191 },
  glass: { r: 29, g: 49, b: 57 },
  marking: { r: 246, g: 223, b: 134 },
} satisfies Record<string, Rgb>;

function group(colorId: number, color: Rgb): MeshGroup {
  return { colorId, color, bright: false, positions: [], normals: [] };
}

function triangle(group: MeshGroup, points: Point[], normal: Point): void {
  for (const point of points) {
    group.positions.push(...point);
    group.normals.push(...normal);
  }
}

function polygon(group: MeshGroup, points: Point[], normal: Point): void {
  for (let i = 1; i < points.length - 1; i++) {
    triangle(group, [points[0], points[i], points[i + 1]], normal);
  }
}

function clip(points: Point[], axis: 0 | 1 | 2, threshold: number, high: boolean): Point[] {
  const inside = (point: Point) => high
    ? point[axis] >= threshold - 1e-6
    : point[axis] <= threshold + 1e-6;
  const result: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const aIn = inside(a), bIn = inside(b);
    if (aIn) result.push(a);
    if (aIn !== bIn) {
      const t = (threshold - a[axis]) / (b[axis] - a[axis]);
      result.push([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ]);
    }
  }
  return result;
}

export function createSu27Yellow13(source: ConvertedMesh): ConvertedMesh {
  const gray = group(62000, colors.gray);
  const light = group(62001, colors.lightGray);
  const dark = group(62002, colors.darkGray);
  const yellow = group(62003, colors.yellow);
  const marking = group(62004, colors.marking);
  const result: MeshGroup[] = [gray, light, dark, yellow, marking];

  for (const original of source.groups) {
    if (original.colorId === 16927) {
      result.push({ ...original, color: colors.nose });
      continue;
    }
    if (original.colorId === 8208) {
      result.push({ ...original, color: colors.glass });
      continue;
    }
    if (original.colorId !== 16408) {
      result.push({ ...original, color: original.color });
      continue;
    }
    for (let i = 0; i < original.positions.length; i += 9) {
      const points = [0, 3, 6].map((offset) =>
        original.positions.slice(i + offset, i + offset + 3) as Point);
      const normal = original.normals.slice(i, i + 3) as Point;
      const xs = points.map((point) => point[0]);
      const ys = points.map((point) => point[1]);
      const zs = points.map((point) => point[2]);
      const wingTop = ys.every((y) => Math.abs(y - 0.4) < 0.001)
        && Math.max(...xs.map(Math.abs)) > 6
        && Math.min(...zs) >= -6.51 && Math.max(...zs) <= 0.01;
      if (wingTop) {
        const side = Math.sign(xs.reduce((sum, x) => sum + x, 0));
        const outer = side > 0
          ? clip(points, 0, 6.35, true)
          : clip(points, 0, -6.35, false);
        const inner = side > 0
          ? clip(points, 0, 6.35, false)
          : clip(points, 0, -6.35, true);
        polygon(side > 0 ? light : gray, inner, normal);
        polygon(yellow, outer, normal);
        continue;
      }
      const fin = xs.every((x) => Math.abs(Math.abs(x) - 2.3) < 0.001)
        && Math.max(...ys) > 3;
      if (fin) {
        polygon(dark, clip(points, 1, 3.25, false), normal);
        polygon(yellow, clip(points, 1, 3.25, true), normal);
        continue;
      }
      if (Math.min(...zs) < -10.2 && xs.every((x) => Math.abs(x) < 1)) {
        triangle(yellow, points, normal);
      } else if (Math.max(...ys) > 0.3 && Math.max(...zs) < 5 && Math.min(...zs) > -9
        && Math.abs(xs.reduce((sum, x) => sum + x, 0) / 3) < 3.2) {
        // Faceted gray patches follow the existing low-poly body panels.
        const cx = xs.reduce((sum, x) => sum + x, 0) / 3;
        const cz = zs.reduce((sum, z) => sum + z, 0) / 3;
        triangle((Math.floor(Math.abs(cx) * 2 + cz * 0.7) % 3 === 0) ? light : gray, points, normal);
      } else triangle(gray, points, normal);
    }
  }

  // The 013 is laid on the outward face of each fin, above its dark root.
  const glyphs: Record<string, string[]> = {
    "0": ["111", "101", "101", "101", "111"],
    "1": ["010", "110", "010", "010", "111"],
    "3": ["111", "001", "111", "001", "111"],
  };
  for (const side of [-1, 1]) {
    for (const [letterIndex, digit] of [..."013"].entries()) {
      glyphs[digit].forEach((row, rowIndex) => {
        for (const [column, pixel] of [...row].entries()) {
          if (pixel !== "1") continue;
          const z = -6.45 - letterIndex * 0.45 - column * 0.11;
          const y = 2.85 - rowIndex * 0.11;
          polygon(marking, [
            [side * 2.315, y, z], [side * 2.315, y, z - 0.095],
            [side * 2.315, y - 0.095, z - 0.095], [side * 2.315, y - 0.095, z],
          ], [side, 0, 0]);
        }
      });
    }
  }

  return { sourceName: "Su-27 Yellow 13 (Aquila-inspired)", groups: result.filter((g) => g.positions.length) };
}
