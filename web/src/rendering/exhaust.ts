import * as THREE from "three";
import type { ConvertedMesh } from "../assets/types";

interface ExhaustPort {
  x: number;
  y: number;
  z: number;
}

/** Locate the original bright exhaust faces rather than assigning ports by skin. */
export function exhaustPorts(mesh: ConvertedMesh): ExhaustPort[] {
  if (mesh.exhausts) return mesh.exhausts;
  const rear = Math.min(
    ...mesh.groups.flatMap((group) =>
      group.positions.filter((_, i) => i % 3 === 2),
    ),
  );
  const points = mesh.groups
    .filter((group) =>
      group.bright && group.color.r > 150 && group.color.r > group.color.b,
    )
    .flatMap((group) => {
      const result: ExhaustPort[] = [];
      for (let i = 0; i < group.positions.length; i += 3) {
        const [x, y, z] = group.positions.slice(i, i + 3);
        if (z <= rear + 2) result.push({ x, y, z });
      }
      return result;
    });
  if (!points.length) return [];

  const left = points.filter((p) => p.x < 0);
  const right = points.filter((p) => p.x > 0);
  const gap = Math.min(...points.map((p) => Math.abs(p.x)));
  const sets = left.length && right.length && gap > 0.2
    ? [left, right]
    : [points];
  return sets.map((set) => ({
    x: set.reduce((sum, p) => sum + p.x, 0) / set.length,
    y: set.reduce((sum, p) => sum + p.y, 0) / set.length,
    z: set.reduce((sum, p) => sum + p.z, 0) / set.length - 0.08,
  }));
}

let glowTexture: THREE.CanvasTexture | undefined;

function texture(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Cannot create exhaust glow texture");
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,248,208,1)");
  gradient.addColorStop(0.2, "rgba(255,166,38,0.95)");
  gradient.addColorStop(0.55, "rgba(255,76,0,0.45)");
  gradient.addColorStop(1, "rgba(255,52,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

export function addExhaustGlow(root: THREE.Group, mesh: ConvertedMesh): void {
  for (const port of mesh.exhausts || []) {
    // Rectangular, faceted jets match the Raptor's flat nozzles. Additive vertex
    // colors fade to black (invisible) at the tip; depth testing keeps them
    // occluded by the aircraft when viewed from ahead.
    const positions: number[] = [], colors: number[] = [];
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const rings = [{ z: 0, size: 1, color: [1, 0.8, 0.35] },
      { z: 0.3, size: 0.85, color: [1, 0.25, 0.025] },
      { z: 1, size: 0.05, color: [0, 0, 0] }];
    for (let ring = 0; ring < rings.length - 1; ring++) for (let side = 0; side < 4; side++) {
      const next = (side + 1) % 4;
      for (const [r, c] of [[ring, side], [ring, next], [ring + 1, next],
        [ring, side], [ring + 1, next], [ring + 1, side]]) {
        const section = rings[r];
        positions.push(corners[c][0] * port.width * section.size / 2,
          corners[c][1] * port.height * section.size / 2, -section.z * port.length);
        colors.push(...section.color);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const plume = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      vertexColors: true, blending: THREE.AdditiveBlending, transparent: true,
      opacity: 0.85, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
    }));
    plume.name = "exhaust-plume";
    plume.position.set(port.x, port.y, port.z);
    root.add(plume);
  }
  for (const port of exhaustPorts(mesh)) {
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture(),
      color: 0xffa32b,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      depthTest: true,
    }));
    glow.position.set(port.x, port.y, port.z);
    glow.scale.set(1.5, 1.5, 1);
    root.add(glow);
  }
}
