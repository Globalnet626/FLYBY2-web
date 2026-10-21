import type { ConvertedTer } from "../src/assets/types";
import { cross, normalize, sub, type Vec3 } from "./polygon";

function tokenize(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

interface Block {
  y: number;
  lup: boolean; // L = true (BI_ON), R = false
  colors: Array<{ r: number; g: number; b: number } | null>;
}

export function parseTer(text: string, sourceName: string): ConvertedTer {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (!lines.length || !lines[0].trim().toUpperCase().startsWith("TERR")) {
    throw new Error(`${sourceName}: missing TerrMesh header`);
  }

  let xSiz = 0;
  let zSiz = 0;
  let xWid = 1;
  let zWid = 1;
  const sideColors = [
    { r: 255, g: 255, b: 255 },
    { r: 255, g: 255, b: 255 },
    { r: 255, g: 255, b: 255 },
    { r: 255, g: 255, b: 255 },
  ];
  const sideOn = [false, false, false, false];
  const blocks: Block[] = [];
  const unsupported = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const av = tokenize(lines[i]);
    if (!av.length || av[0].startsWith("#")) continue;
    const cmd = av[0].toUpperCase();
    if (cmd === "NBL") {
      xSiz = Number(av[1]);
      zSiz = Number(av[2]);
    } else if (cmd === "TMS") {
      xWid = Number(av[1]);
      zWid = Number(av[2]);
    } else if (cmd === "BOT") {
      sideOn[0] = true;
      sideColors[0] = { r: Number(av[1]), g: Number(av[2]), b: Number(av[3]) };
    } else if (cmd === "RIG") {
      sideOn[1] = true;
      sideColors[1] = { r: Number(av[1]), g: Number(av[2]), b: Number(av[3]) };
    } else if (cmd === "LEF") {
      sideOn[2] = true;
      sideColors[2] = { r: Number(av[1]), g: Number(av[2]), b: Number(av[3]) };
    } else if (cmd === "TOP") {
      sideOn[3] = true;
      sideColors[3] = { r: Number(av[1]), g: Number(av[2]), b: Number(av[3]) };
    } else if (cmd === "BLO") {
      const y = Number(av[1] ?? 0);
      let lup = true;
      const colors: Array<{ r: number; g: number; b: number } | null> = [null, null];
      let ai = 2;
      if (av[ai] && (av[ai].toUpperCase() === "L" || av[ai].toUpperCase() === "R")) {
        lup = av[ai].toUpperCase() === "L";
        ai++;
      }
      for (let t = 0; t < 2 && ai < av.length; t++) {
        if (av[ai].toUpperCase() === "ON") {
          colors[t] = {
            r: Number(av[ai + 1]),
            g: Number(av[ai + 2]),
            b: Number(av[ai + 3]),
          };
          ai += 4;
        } else if (av[ai].toUpperCase() === "OFF") {
          colors[t] = null;
          ai += 1;
        } else {
          break;
        }
      }
      blocks.push({ y, lup, colors });
    } else if (cmd === "END") {
      break;
    } else {
      unsupported.add(av[0]);
    }
  }

  const expected = (xSiz + 1) * (zSiz + 1);
  if (blocks.length < expected) {
    throw new Error(
      `${sourceName}: expected ${expected} BLO samples, got ${blocks.length}`,
    );
  }

  const getBlk = (x: number, z: number) => blocks[z * (xSiz + 1) + x];
  const getPoint = (x: number, z: number): Vec3 => ({
    x: xWid * x,
    y: getBlk(x, z).y,
    z: zWid * z,
  });

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];

  const pushTri = (a: Vec3, b: Vec3, c: Vec3, col: { r: number; g: number; b: number }) => {
    const n = normalize(cross(sub(c, b), sub(b, a)));
    for (const p of [a, b, c]) {
      positions.push(p.x, p.y, p.z);
      normals.push(n.x, n.y, n.z);
      colors.push(col.r / 255, col.g / 255, col.b / 255);
    }
  };

  for (let z = 0; z < zSiz; z++) {
    for (let x = 0; x < xSiz; x++) {
      const blk = getBlk(x, z);
      const ed = [
        getPoint(x, z),
        getPoint(x + 1, z),
        getPoint(x, z + 1),
        getPoint(x + 1, z + 1),
      ];
      const c0 = blk.colors[0] ?? { r: 0, g: 128, b: 0 };
      const c1 = blk.colors[1] ?? c0;
      if (blk.lup) {
        // L: tri0 = ed1,ed3,ed2 ; tri1 = ed0,ed1,ed2
        pushTri(ed[1], ed[3], ed[2], c0);
        pushTri(ed[0], ed[1], ed[2], c1);
      } else {
        // R: tri0 = ed0,ed3,ed2 ; tri1 = ed0,ed1,ed3
        pushTri(ed[0], ed[3], ed[2], c0);
        pushTri(ed[0], ed[1], ed[3], c1);
      }
    }
  }

  // Side walls (simplified quads as tris)
  if (sideOn[0]) {
    for (let x = 0; x < xSiz; x++) {
      const y0 = getBlk(x, 0).y;
      const y1 = getBlk(x + 1, 0).y;
      const a = { x: x * xWid, y: 0, z: 0 };
      const b = { x: (x + 1) * xWid, y: 0, z: 0 };
      const c = { x: (x + 1) * xWid, y: y1, z: 0 };
      const d = { x: x * xWid, y: y0, z: 0 };
      pushTri(a, b, c, sideColors[0]);
      pushTri(a, c, d, sideColors[0]);
    }
  }
  if (sideOn[3]) {
    for (let x = 0; x < xSiz; x++) {
      const zz = zSiz * zWid;
      const y0 = getBlk(x, zSiz).y;
      const y1 = getBlk(x + 1, zSiz).y;
      const a = { x: x * xWid, y: 0, z: zz };
      const b = { x: (x + 1) * xWid, y: 0, z: zz };
      const c = { x: (x + 1) * xWid, y: y1, z: zz };
      const d = { x: x * xWid, y: y0, z: zz };
      pushTri(a, d, c, sideColors[3]);
      pushTri(a, c, b, sideColors[3]);
    }
  }

  if (unsupported.size) {
    console.warn(
      `${sourceName}: unsupported directives: ${[...unsupported].join(", ")}`,
    );
  }

  return { sourceName, positions, normals, colors };
}
