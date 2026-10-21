import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { createF22MobiusMesh } from "../tools/f22Mobius";
import { exhaustPorts } from "../src/rendering/exhaust";

describe("supplied F-22 conversion", () => {
  const mesh = createF22MobiusMesh(fileURLToPath(new URL("../source-assets/f22/model.gltf", import.meta.url)));
  it("provides two aft nozzle ports even though the tail extends behind them", () => {
    const ports = exhaustPorts(mesh);
    expect(ports).toHaveLength(2);
    expect(ports[0].x).toBeCloseTo(-ports[1].x);
    expect(ports.every(p => p.z < -6 && p.z > -8 && p.y > 0)).toBe(true);
    expect(mesh.exhausts!.every(p => p.length > 0 && p.width > p.height)).toBe(true);
  });
  it("produces finite, normalized triangles at aircraft scale", () => {
    const zs: number[] = [];
    for (const group of mesh.groups) {
      expect(group.positions.length % 9).toBe(0);
      expect(group.normals.length).toBe(group.positions.length);
      expect(group.positions.every(Number.isFinite)).toBe(true);
      for (let i = 0; i < group.positions.length; i += 3) {
        zs.push(group.positions[i + 2]);
        expect(Math.hypot(...group.normals.slice(i, i + 3))).toBeCloseTo(1, 5);
      }
    }
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(18.9, 1);
  });
  it("places the blue Mobius patches on both aft fins", () => {
    const badge = mesh.groups.find(g => g.color.r === 7 && g.color.g === 106 && g.color.b === 189)!;
    expect(badge).toBeDefined();
    const xs = badge.positions.filter((_, i) => i % 3 === 0);
    expect(Math.min(...xs)).toBeLessThan(-1);
    expect(Math.max(...xs)).toBeGreaterThan(1);
    expect(badge.positions.filter((_, i) => i % 3 === 2).every(z => z < -4)).toBe(true);
  });
});
