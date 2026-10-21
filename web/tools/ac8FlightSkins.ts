import type { ConvertedMesh, MeshGroup, Rgb } from "../src/assets/types";

type Point = [number, number, number];
type Flight = "joker" | "queen";
type Airframe = "f18" | "f14";

const paint = {
  gray: { r: 174, g: 184, b: 189 },
  underside: { r: 142, g: 153, b: 160 },
  white: { r: 228, g: 233, b: 231 },
  black: { r: 23, g: 29, b: 35 },
  red: { r: 174, g: 40, b: 42 },
  glass: { r: 31, g: 51, b: 62 },
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

function clipY(points: Point[], height: number, upper: boolean): Point[] {
  const inside = (point: Point) => upper
    ? point[1] >= height - 1e-6
    : point[1] <= height + 1e-6;
  const output: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const aIn = inside(a), bIn = inside(b);
    if (aIn) output.push(a);
    if (aIn !== bIn) {
      const t = (height - a[1]) / (b[1] - a[1]);
      output.push([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ]);
    }
  }
  return output;
}

const glyphs: Record<string, string[]> = {
  "0": ["111", "101", "101", "101", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  M: ["101", "111", "111", "101", "101"],
  F: ["111", "100", "111", "100", "100"],
};

function finLettering(target: MeshGroup, airframe: Airframe, text: string, yTop: number, zFront: number, pixelSize: number): void {
  for (const side of [-1, 1]) {
    for (const [letterIndex, letter] of [...text].entries()) {
      glyphs[letter].forEach((row, rowIndex) => {
        for (const [column, pixel] of [...row].entries()) {
          if (pixel !== "1") continue;
          const y = yTop - rowIndex * pixelSize;
          const z = zFront - letterIndex * pixelSize * 4 - column * pixelSize;
          const surface = (atY: number) => airframe === "f18"
            ? 0.94 + (atY - 0.7) * 0.39
            : 1.30 + (atY - 0.5) * 0.095;
          const w = pixelSize * 0.82;
          polygon(target, [
            [side * (surface(y) + 0.025), y, z],
            [side * (surface(y) + 0.025), y, z - w],
            [side * (surface(y - w) + 0.025), y - w, z - w],
            [side * (surface(y - w) + 0.025), y - w, z],
          ], [side, 0, 0]);
        }
      });
    }
  }
}

/** Low-poly AC8-inspired squadron colors on the port's existing airframes. */
export function createAc8FlightSkin(source: ConvertedMesh, airframe: Airframe, flight: Flight): ConvertedMesh {
  const gray = group(63000, paint.gray);
  const underside = group(63001, paint.underside);
  const white = group(63002, paint.white);
  const accent = group(63003, flight === "joker" ? paint.black : paint.red);
  const lettering = group(63004, flight === "joker" ? paint.red : paint.black);
  const emblemInk = group(63005, paint.black);
  const result: MeshGroup[] = [gray, underside, white, accent, lettering, emblemInk];

  for (const original of source.groups) {
    if (original.colorId === 20) {
      result.push({ ...original, color: paint.glass });
      continue;
    }
    if (original.colorId !== 14607) {
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
      const fin = Math.max(...ys) > 2
        && Math.max(...zs) < -3.4
        && Math.abs(xs.reduce((sum, x) => sum + x, 0) / 3) > 0.8;
      if (fin) {
        polygon(white, clipY(points, airframe === "f18" ? 1.55 : 1.35, true), normal);
        polygon(accent, clipY(points, airframe === "f18" ? 1.55 : 1.35, false), normal);
      } else if (Math.max(...ys) < 0.1) triangle(underside, points, normal);
      else triangle(gray, points, normal);
    }
  }

  if (airframe === "f18") {
    // Joker's 203 and MF tail code are visible in AC8 aircraft references.
    finLettering(lettering, airframe, "203", 2.68, -5.55, 0.105);
  }
  addFlightEmblem(airframe, flight, white, emblemInk);
  return {
    sourceName: airframe === "f18"
      ? "F/A-18 Joker Flight (AC8-inspired)"
      : "F-14A Queen Flight (AC8-inspired adaptation)",
    groups: result.filter((entry) => entry.positions.length),
  };
}

function addFlightEmblem(airframe: Airframe, flight: Flight, card: MeshGroup, ink: MeshGroup): void {
  // A few broad polygons keep the playing-card silhouette legible at gallery size.
  for (const side of [-1, 1]) {
    const top = airframe === "f18" ? 2.19 : 2.22;
    const front = airframe === "f18" ? -5.40 : -5.80;
    const width = airframe === "f18" ? 0.95 : 1.10;
    const height = airframe === "f18" ? 0.96 : 1.08;
    const point = (u: number, v: number, layer: number): Point => {
      const y = top - v * height;
      const x = airframe === "f18"
        ? 0.94 + (y - 0.7) * 0.39
        : 1.30 + (y - 0.5) * 0.095;
      return [side * (x + 0.032 + layer * 0.005), y, front - u * width];
    };
    const shape = (target: MeshGroup, coords: Array<[number, number]>, layer: number) =>
      polygon(target, coords.map(([u, v]) => point(u, v, layer)), [side, 0, 0]);

    // The offset cards behind the face carry the black fan outline.
    shape(ink, [[0.03, 0.06], [0.71, 0.02], [0.91, 0.9], [0.21, 0.96]], 0);
    shape(card, [[0.07, 0.09], [0.69, 0.06], [0.85, 0.86], [0.24, 0.9]], 1);
    shape(ink, [[0.10, 0.06], [0.81, 0.04], [0.91, 0.94], [0.16, 0.91]], 2);
    shape(card, [[0.15, 0.10], [0.78, 0.09], [0.86, 0.89], [0.20, 0.86]], 3);
    shape(ink, [[0.18, 0.07], [0.91, 0.1], [0.83, 0.9], [0.15, 0.86]], 4);
    shape(card, [[0.21, 0.11], [0.87, 0.14], [0.79, 0.86], [0.19, 0.82]], 5);

    if (flight === "joker") {
      // Crown with three points and a large hooked J.
      shape(ink, [[0.34, 0.32], [0.39, 0.28], [0.47, 0.34], [0.54, 0.17],
        [0.57, 0.35], [0.65, 0.29], [0.72, 0.36], [0.67, 0.43], [0.42, 0.4]], 6);
      shape(ink, [[0.43, 0.43], [0.72, 0.43], [0.7, 0.49], [0.64, 0.49],
        [0.61, 0.77], [0.52, 0.8], [0.39, 0.74], [0.42, 0.67],
        [0.48, 0.72], [0.53, 0.71], [0.56, 0.49], [0.43, 0.49]], 6);
    } else {
      // Three-point queen crown, block Q, and its small heart suit.
      shape(ink, [[0.35, 0.33], [0.34, 0.22], [0.44, 0.3], [0.49, 0.16],
        [0.55, 0.3], [0.67, 0.22], [0.64, 0.36]], 6);
      shape(ink, [[0.4, 0.43], [0.61, 0.43], [0.67, 0.49], [0.64, 0.72],
        [0.58, 0.78], [0.44, 0.76], [0.39, 0.69], [0.37, 0.5]], 6);
      shape(card, [[0.46, 0.5], [0.56, 0.5], [0.58, 0.55], [0.56, 0.68],
        [0.49, 0.69], [0.46, 0.64]], 7);
      shape(ink, [[0.55, 0.69], [0.7, 0.81], [0.66, 0.83], [0.52, 0.75]], 8);
      shape(ink, [[0.25, 0.24], [0.29, 0.2], [0.34, 0.24], [0.33, 0.3], [0.29, 0.34], [0.25, 0.3]], 6);
    }

    // Crossing banner, reduced to a handful of strokes at this scale.
    shape(ink, [[0.12, 0.63], [0.89, 0.65], [0.88, 0.76], [0.11, 0.74]], 9);
    shape(card, [[0.15, 0.65], [0.86, 0.67], [0.85, 0.73], [0.14, 0.71]], 10);
    const ticks = flight === "joker" ? 12 : 11;
    for (let i = 0; i < ticks; i++) {
      const u = 0.2 + i * 0.052;
      shape(ink, [[u, 0.677], [u + 0.018, 0.677], [u + 0.018, 0.704], [u, 0.704]], 11);
    }
  }
}
