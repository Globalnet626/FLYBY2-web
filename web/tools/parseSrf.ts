import type { ConvertedMesh, MeshGroup } from "../src/assets/types";
import {
  averageNormal,
  decodeGrb555,
  normalize,
  triangulate,
  type Vec3,
} from "./polygon";

function tokenize(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

function cmdKey(token: string): string {
  return token.toUpperCase();
}

export function parseSrf(text: string, sourceName: string): ConvertedMesh {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (!lines.length || !cmdKey(lines[0]).startsWith("SURF")) {
    throw new Error(`${sourceName}: missing Surf header`);
  }

  const positions: Vec3[] = [];
  const rounded: boolean[] = [];
  const unsupported = new Set<string>();

  type Face = {
    colorId: number;
    color: { r: number; g: number; b: number };
    normal: Vec3 | null;
    bright: boolean;
    indices: number[];
  };
  const faces: Face[] = [];

  let i = 1;
  while (i < lines.length) {
    const raw = lines[i++];
    const av = tokenize(raw);
    if (!av.length || av[0].startsWith("#")) continue;
    const cmd = cmdKey(av[0]);

    if (cmd === "V" || cmd.startsWith("V")) {
      // Vertex: V x y z [R]
      if (av[0].toUpperCase() === "V" || /^V[\d.-]/i.test(av[0])) {
        // standard "V x y z"
      }
      if (cmd === "V") {
        if (av.length < 4) throw new Error(`${sourceName}: bad vertex`);
        positions.push({
          x: Number(av[1]),
          y: Number(av[2]),
          z: Number(av[3]),
        });
        rounded.push(av.length >= 5 && av[4].toUpperCase().startsWith("R"));
        continue;
      }
    }

    if (cmd === "F") {
      let colorId = 0;
      let color = { r: 0, g: 0, b: 0 };
      let normal: Vec3 | null = null;
      let bright = false;
      const indices: number[] = [];

      while (i < lines.length) {
        const fav = tokenize(lines[i++]);
        if (!fav.length || fav[0].startsWith("#")) continue;
        const fcmd = cmdKey(fav[0]);
        if (fcmd === "C") {
          const decoded = decodeGrb555(Number(fav[1]));
          colorId = decoded.colorId;
          color = { r: decoded.r, g: decoded.g, b: decoded.b };
        } else if (fcmd === "N") {
          if (fav.length < 7) throw new Error(`${sourceName}: bad normal`);
          const n = normalize({
            x: Number(fav[4]),
            y: Number(fav[5]),
            z: Number(fav[6]),
          });
          if (Math.hypot(n.x, n.y, n.z) > 1e-6) normal = n;
        } else if (fcmd === "V") {
          for (let k = 1; k < fav.length; k++) indices.push(Number(fav[k]));
        } else if (fcmd === "BRI" || fcmd === "B") {
          // BRI matches command table prefix "B" ?? bright; BASEAXIS is top-level only
          if (fcmd === "BRI" || (fcmd === "B" && fav[0].toUpperCase().startsWith("BRI"))) {
            bright = true;
          } else if (fcmd === "B" && fav[0].toUpperCase() === "B") {
            // ambiguous single B ? treat as bright per loader prefix match on "B"
            bright = true;
          }
        } else if (fcmd === "E") {
          break;
        } else if (fcmd === "BLK" || fcmd === "EBK" || fcmd === "REM") {
          // ignored
        } else {
          unsupported.add(`face:${fav[0]}`);
        }
      }

      if (indices.length >= 3) {
        faces.push({ colorId, color, normal, bright, indices });
      }
      continue;
    }

    if (cmd === "BAS" || cmd === "BASEAXIS" || cmd.startsWith("BAS")) {
      // ignored by original loader
      continue;
    }

    if (cmd === "E" || cmd === "END") break;

    if (cmd === "BLK" || cmd === "EBK" || cmd === "R" || cmd === "REM") continue;

    unsupported.add(av[0]);
  }

  if (unsupported.size) {
    console.warn(
      `${sourceName}: unsupported directives: ${[...unsupported].join(", ")}`,
    );
  }

  // Vertex normals: average face normals of non-bright, backface-culled faces
  const vNorm: Vec3[] = positions.map(() => ({ x: 0, y: 0, z: 0 }));
  const faceNormals: Vec3[] = [];

  for (const face of faces) {
    const pts = face.indices.map((idx) => positions[idx]);
    let n = face.normal;
    if (!n) n = averageNormal(pts);
    faceNormals.push(n);
    if (!face.bright && face.normal) {
      for (const idx of face.indices) {
        vNorm[idx].x += n.x;
        vNorm[idx].y += n.y;
        vNorm[idx].z += n.z;
      }
    }
  }
  for (let vi = 0; vi < vNorm.length; vi++) {
    vNorm[vi] = normalize(vNorm[vi]);
  }

  const groupMap = new Map<string, MeshGroup>();

  faces.forEach((face, fi) => {
    const key = `${face.colorId}:${face.bright ? 1 : 0}`;
    let group = groupMap.get(key);
    if (!group) {
      group = {
        colorId: face.colorId,
        color: face.color,
        bright: face.bright,
        positions: [],
        normals: [],
      };
      groupMap.set(key, group);
    }
    const tris = triangulate(face.indices, positions, faceNormals[fi]);
    const fn = faceNormals[fi];
    for (let t = 0; t < tris.length; t += 3) {
      for (let k = 0; k < 3; k++) {
        const idx = tris[t + k];
        const p = positions[idx];
        group!.positions.push(p.x, p.y, p.z);
        const useSmooth = rounded[idx] && !face.bright && Math.hypot(vNorm[idx].x, vNorm[idx].y, vNorm[idx].z) > 0.1;
        const n = useSmooth ? vNorm[idx] : fn;
        group!.normals.push(n.x, n.y, n.z);
      }
    }
  });

  return {
    sourceName,
    groups: [...groupMap.values()],
  };
}
