import { drawMobiusBadge } from "./mobiusBadge";
import type { ConvertedMesh, MeshGroup, Rgb } from "../src/assets/types";

type Point = [number, number, number];

const palette: Record<string, Rgb> = {
  navy: { r: 30, g: 48, b: 99 },
  navyLight: { r: 43, g: 62, b: 113 },
  navyDark: { r: 17, g: 29, b: 68 },
  underside: { r: 170, g: 174, b: 181 },
  trim: { r: 38, g: 43, b: 55 },
  black: { r: 2, g: 3, b: 6 },
  canopy: { r: 3, g: 153, b: 213 },
  canopySide: { r: 2, g: 104, b: 167 },
  white: { r: 240, g: 244, b: 248 },
  badgeBlue: { r: 7, g: 106, b: 189 },
  badgeSky: { r: 53, g: 171, b: 230 },
  badgeGray: { r: 150, g: 153, b: 158 },
  badgeDark: { r: 39, g: 41, b: 46 },
  exhaust: { r: 255, g: 96, b: 14 },
};

const glyphs: Record<string, string[]> = {
  "1": ["010", "110", "010", "010", "111"],
  "8": ["111", "101", "111", "101", "111"],
};

/** An original low-poly F-4-style mesh built for the HTML5 port. +Z is nose. */
export function createF4MobiusMesh(): ConvertedMesh {
  const groups = new Map<string, MeshGroup>();

  const face = (material: keyof typeof palette, points: Point[], bright = false): void => {
    if (points.length < 3) return;
    const key = `${material}:${bright}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        colorId: groups.size + 1,
        color: palette[material],
        bright,
        positions: [],
        normals: [],
      };
      groups.set(key, group);
    }
    for (let i = 1; i < points.length - 1; i++) {
      const tri = [points[0], points[i], points[i + 1]];
      const a = tri[0], b = tri[1], c = tri[2];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      const length = Math.hypot(nx, ny, nz) || 1;
      for (const p of tri) {
        group.positions.push(...p);
        group.normals.push(nx / length, ny / length, nz / length);
      }
    }
  };

  const reflect = (side: number, pts: Point[]): Point[] =>
    pts.map(([x, y, z]) => [x * side, y, z]);

  type Ring = Point[];
  const ring = (z: number, width: number, top: number, bottom: number): Ring => [
    [0, top + 0.08, z],
    [width * 0.72, top, z],
    [width, top - 0.52, z],
    [width * 0.7, bottom, z],
    [0, bottom - 0.1, z],
    [-width * 0.7, bottom, z],
    [-width, top - 0.52, z],
    [-width * 0.72, top, z],
  ];
  const sections = [
    ring(8.7, 0.63, 1.2, 0.28),
    ring(6.2, 0.83, 1.42, 0.08),
    ring(3.1, 1.13, 1.5, -0.1),
    ring(0.1, 1.65, 1.45, -0.54),
    ring(-4.65, 1.58, 1.43, -0.51),
    ring(-7.65, 1.1, 1.28, -0.12),
    ring(-8.45, 0.87, 1.1, -0.04),
  ];
  for (let i = 0; i < sections.length - 1; i++) {
    const front = sections[i], rear = sections[i + 1];
    for (let j = 0; j < 8; j++) {
      const next = (j + 1) % 8;
      const material = j === 0 || j === 7 ? "navyLight"
        : j >= 2 && j <= 5 ? "underside" : "navy";
      face(material, [front[j], rear[j], rear[next], front[next]]);
    }
  }

  // Faceted black radome with the F-4's blunt, long nose.
  const radome = ring(9.45, 0.5, 0.95, 0.2);
  const tipRing = ring(11.18, 0.12, 0.39, 0.18);
  for (let j = 0; j < 8; j++) {
    const next = (j + 1) % 8;
    face("black", [sections[0][j], radome[j], radome[next], sections[0][next]]);
    face("black", [radome[j], tipRing[j], tipRing[next], radome[next]]);
  }
  face("black", tipRing);

  // Continuous stepped tandem canopy, with framed front and rear glass.
  const canopySections = [
    { z: 6.25, baseX: 0.41, roofX: 0.17, baseY: 1.45, roofY: 1.48 },
    { z: 5.28, baseX: 0.57, roofX: 0.35, baseY: 1.48, roofY: 2.08 },
    { z: 4.02, baseX: 0.67, roofX: 0.41, baseY: 1.5, roofY: 2.3 },
    { z: 3.76, baseX: 0.68, roofX: 0.42, baseY: 1.5, roofY: 2.31 },
    { z: 2.43, baseX: 0.72, roofX: 0.45, baseY: 1.5, roofY: 2.25 },
    { z: 1.36, baseX: 0.79, roofX: 0.47, baseY: 1.48, roofY: 1.5 },
  ];
  for (let i = 0; i < canopySections.length - 1; i++) {
    const a = canopySections[i], b = canopySections[i + 1];
    const material = i === 2 ? "navyDark" : "canopySide";
    for (const side of [-1, 1]) {
      face(material, [
        [side * a.baseX, a.baseY, a.z], [side * a.roofX, a.roofY, a.z],
        [side * b.roofX, b.roofY, b.z], [side * b.baseX, b.baseY, b.z],
      ]);
    }
    face(i === 2 ? "navyDark" : "canopy", [
      [a.roofX, a.roofY, a.z], [-a.roofX, a.roofY, a.z],
      [-b.roofX, b.roofY, b.z], [b.roofX, b.roofY, b.z],
    ]);
  }

  for (const side of [-1, 1]) {
    // Swept, slightly drooped wings. The lower surface follows the reference.
    const wing: Point[] = [
      [1.58, 0.52, 0.45], [4.4, 0.13, -0.1],
      [6.17, 0.49, -2.48], [6.42, 0.74, -2.82],
      [6.42, 0.74, -4.15], [6.17, 0.49, -4.12],
      [4.4, 0.13, -3.72], [1.58, 0.52, -3.9],
    ];
    const undersideWing = wing.map(([x, y, z]): Point => [x, y - 0.16, z]);
    for (const panel of [[0, 1, 6, 7], [1, 2, 5, 6], [2, 3, 4, 5]]) {
      face("navy", reflect(side, panel.map((i) => wing[i])));
      face("underside", reflect(side, panel.map((i) => undersideWing[i])));
    }
    for (let i = 0; i < wing.length; i++) {
      const a = wing[i], b = wing[(i + 1) % wing.length];
      face("navyDark", reflect(side, [a, b, [b[0], b[1] - 0.16, b[2]], [a[0], a[1] - 0.16, a[2]]]));
    }
    face("navyLight", reflect(side, [
      [1.91, 0.55, 0.36], [4.4, 0.16, -0.1], [6.17, 0.52, -2.48],
      [6.0, 0.49, -2.69], [4.25, 0.18, -0.49], [2.2, 0.55, 0.06],
    ]));
    face("navyDark", reflect(side, [
      [4.4, 0.17, -3.72], [6.17, 0.52, -4.12], [6.17, 0.52, -3.9], [4.4, 0.17, -3.51],
    ]));

    // Trace the supplied white Mobius outline on each blue outer wing panel.
    // Coordinates follow the reference image: pointed apex, split lower corners,
    // and a closed inner diamond. Keep the strokes above the sloped wing surface.
    type MarkPoint = [number, number];
    const markPoint = ([u, v]: MarkPoint): Point => {
      const x = 5.35 + (u - 96) * 0.0095;
      const y = 0.13 + (x - 4.4) * (0.36 / 1.77) + 0.075;
      const z = -2.22 - (v - 8) * 0.0095;
      return [side * x, y, z];
    };
    const stroke = (a: MarkPoint, b: MarkPoint, width = 5.5): void => {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const length = Math.hypot(dx, dy);
      const nx = -dy / length * width / 2, ny = dx / length * width / 2;
      face("white", [
        markPoint([a[0] + nx, a[1] + ny]),
        markPoint([a[0] - nx, a[1] - ny]),
        markPoint([b[0] - nx, b[1] - ny]),
        markPoint([b[0] + nx, b[1] + ny]),
      ]);
    };
    const outline: MarkPoint[] = [
      [96, 8], [38, 148], [67, 132], [96, 148],
      [124, 132], [154, 148], [96, 8],
    ];
    const inner: MarkPoint[] = [
      [65, 80], [96, 65], [126, 80], [96, 145], [65, 80],
    ];
    for (const path of [outline, inner]) {
      for (let i = 0; i < path.length - 1; i++) stroke(path[i], path[i + 1]);
    }

    // All-moving stabilators droop below the engine line and extend aft of it.
    const tail: Point[] = [
      [0.94, 0.58, -6.28], [2.54, 0.09, -7.63], [2.92, -0.08, -9.18],
      [2.12, 0.14, -9.03], [0.96, 0.53, -9.12],
    ];
    face("navy", reflect(side, tail));
    face("underside", reflect(side, tail.map(([x, y, z]) => [x, y - 0.13, z])));
    face("underside", reflect(side, [[2.18, 0.17, -7.37], [2.54, 0.1, -7.63], [2.92, -0.07, -9.18], [2.25, 0.12, -9.07]]));
  }

  // One continuous duct per side, from the rectangular intake beside the
  // cockpit to the round, recessed exhaust beneath the stabilator.
  const ductRing = (side: number, z: number, inner: number, outer: number, top: number, bottom: number): Point[] => {
    const mid = (inner + outer) / 2;
    return reflect(side, [
      [mid, top, z], [outer - 0.11, top, z],
      [outer, top - 0.22, z], [outer, bottom + 0.22, z],
      [mid, bottom, z], [inner + 0.11, bottom, z],
      [inner, bottom + 0.22, z], [inner, top - 0.22, z],
    ]);
  };
  const ductMaterials = ["navyLight", "navy", "navyDark", "underside", "underside", "underside", "navyDark", "navyLight"] as const;
  for (const side of [-1, 1]) {
    const rings = [
      ductRing(side, 4.86, 1.2, 1.95, 1.24, 0.02),
      ductRing(side, 2.6, 1.05, 2.12, 1.37, -0.12),
      ductRing(side, -1.72, 1.05, 2.38, 1.2, -0.25),
      ductRing(side, -3.4, 0.58, 2, 0.86, -0.53),
      ductRing(side, -5.1, 0.26, 1.72, 0.68, -0.68),
      ductRing(side, -7.72, 0.19, 1.13, 0.48, -0.52),
    ];
    for (let r = 0; r < rings.length - 1; r++) {
      for (let i = 0; i < 8; i++) {
        const next = (i + 1) % 8;
        face(ductMaterials[i], [rings[r][i], rings[r + 1][i], rings[r + 1][next], rings[r][next]]);
      }
    }
    const lip = ductRing(side, 5.08, 1.16, 1.99, 1.28, -0.02);
    const mouth = ductRing(side, 5.1, 1.27, 1.88, 1.13, 0.13);
    for (let i = 0; i < 8; i++) {
      const next = (i + 1) % 8;
      face(ductMaterials[i], [rings[0][i], lip[i], lip[next], rings[0][next]]);
      face("trim", [lip[i], mouth[i], mouth[next], lip[next]]);
    }
    face("black", mouth);

    const metal = ductRing(side, -8.05, 0.21, 1.11, 0.45, -0.49);
    const exhaustCenterX = side * 0.66;
    const glow: Point[] = Array.from({ length: 8 }, (_, i) => {
      const angle = i * Math.PI / 4;
      return [exhaustCenterX + 0.3 * Math.cos(angle), -0.02 + 0.31 * Math.sin(angle), -8.24];
    });
    for (let i = 0; i < 8; i++) {
      const next = (i + 1) % 8;
      face("trim", [rings[rings.length - 1][i], metal[i], metal[next], rings[rings.length - 1][next]]);
    }
    face("black", metal);
    for (let i = 0; i < 8; i++) {
      face("exhaust", [[exhaustCenterX, -0.02, -8.24], glow[i], glow[(i + 1) % 8]], true);
    }
  }

  // More swept Phantom fin, with a shorter cap and near-vertical rear edge.
  const fin: Point[] = [
    [0, 1.36, -3.17], [0, 2.2, -5.9], [0, 3.77, -8.02],
    [0, 3.77, -9.17], [0, 1.12, -9.17],
  ];
  for (const side of [-1, 1]) {
    face("navy", fin.map(([, y, z]) => [side * 0.15, y, z]));
    face("navyLight", [[side * 0.17, 1.36, -3.17], [side * 0.17, 2.2, -5.9], [side * 0.17, 3.29, -7.33], [side * 0.17, 1.39, -6.69]]);
  }
  face("navyDark", [[-0.15, 3.77, -8.02], [0.15, 3.77, -8.02], [0.15, 3.77, -9.17], [-0.15, 3.77, -9.17]]);

  // Faceted Mobius Squadron patch on both faces of the vertical fin.
  // The reference's blue outer ring, globe, dark ribbon and white flight
  // path are kept broad enough to read in the low-resolution gallery.
  for (const side of [-1, 1]) {
    const badgePoint = (u: number, v: number, layer: number): Point => [
      side * (0.185 + layer * 0.006),
      2.68 + v * 0.86,
      -8.24 - u * 0.86,
    ];
    const badgeFace = (material: keyof typeof palette, coords: Array<[number, number]>, layer: number) =>
      face(material, coords.map(([u, v]) => badgePoint(u, v, layer)));
    drawMobiusBadge(badgeFace);
  }

  // Compact stencil-like identifiers on the fuselage sides.
  const stencil = (label: string, side: number, z0: number, y0: number, x: number, scale: number) => {
    for (let ch = 0; ch < label.length; ch++) {
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
          if (glyphs[label[ch]][row][col] !== "1") continue;
          const pixel = ch * 4 + col;
          const zz = z0 + (side === 1 ? label.length * 4 - 2 - pixel : pixel) * scale;
          const yy = y0 + (4 - row) * scale;
          face("white", [
            [side * x, yy, zz], [side * x, yy, zz + scale * 0.82],
            [side * x, yy + scale * 0.82, zz + scale * 0.82],
            [side * x, yy + scale * 0.82, zz],
          ]);
        }
      }
    }
  };
  for (const side of [-1, 1]) {
    stencil("118", side, 6.05, 0.56, 0.82, 0.095);
  }

  return { sourceName: "f4mobius (port original)", groups: [...groups.values()] };
}
