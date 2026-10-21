import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildGroundGridGeometry, createThickGroundGrid } from "../src/rendering/groundGrid";

describe("ground grid", () => {
  it("pairs each vertex with the other end of its segment", () => {
    const geo = buildGroundGridGeometry();
    const position = geo.getAttribute("position");
    const other = geo.getAttribute("groundOther");
    const sign = geo.getAttribute("groundSign");
    // -20000..20000 step 1000, two lines per station.
    expect(position.count).toBe(41 * 2 * 2);
    expect(other.count).toBe(position.count);
    expect(sign.count).toBe(position.count);
    for (let i = 0; i < position.count; i += 2) {
      expect(sign.getX(i)).toBe(1);
      expect(sign.getX(i + 1)).toBe(-1);
      expect([other.getX(i), other.getY(i), other.getZ(i)]).toEqual([
        position.getX(i + 1),
        position.getY(i + 1),
        position.getZ(i + 1),
      ]);
      expect([other.getX(i + 1), other.getY(i + 1), other.getZ(i + 1)]).toEqual([
        position.getX(i),
        position.getY(i),
        position.getZ(i),
      ]);
    }
  });

  it("offsets only a second ground-grid pass by one device pixel", () => {
    const viewport = { x: 800, y: 600 };
    const grid = createThickGroundGrid(viewport);
    const baseMat = grid.material as THREE.LineBasicMaterial;
    const child = grid.children[0] as THREE.LineSegments;
    const offsetMat = child.material as THREE.LineBasicMaterial;

    expect(grid).toBeInstanceOf(THREE.LineSegments);
    expect(grid.children).toHaveLength(1);
    expect(child.geometry).toBe(grid.geometry);
    expect(baseMat).not.toBe(offsetMat);
    expect(baseMat.color.getHex()).toBe(0x11117b);

    const untouched = "void main() {\n\t#include <project_vertex>\n}\n";
    const baseShader = { uniforms: {}, vertexShader: untouched, fragmentShader: "" };
    baseMat.onBeforeCompile(baseShader as never, null as never);
    expect(baseShader.vertexShader).toBe(untouched);

    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: untouched,
      fragmentShader: "",
    };
    offsetMat.onBeforeCompile(shader as never, null as never);
    expect(shader.vertexShader).toContain("attribute vec3 groundOther;");
    expect(shader.vertexShader).toContain("attribute float groundSign;");
    expect(shader.vertexShader).toContain("uniform vec2 groundViewport;");
    expect(shader.vertexShader).toContain(
      "gl_Position.xy += groundNormal * (2.0 / groundViewport) * gl_Position.w;",
    );
    expect(shader.vertexShader).toContain("#include <project_vertex>\nvec4 groundClip");
    expect(shader.vertexShader).toContain("if (gl_Position.w > groundEpsilon)");
    expect(shader.vertexShader).toContain("if (groundClip.w <= groundEpsilon)");
    expect(shader.vertexShader).toContain("groundClip = mix(gl_Position, groundClip, groundT);");
    expect(shader.vertexShader).toContain("if (groundLength >= 1e-6)");
    expect(shader.uniforms.groundViewport.value).toBe(viewport);

    viewport.x = 1280;
    viewport.y = 720;
    expect((shader.uniforms.groundViewport.value as { x: number }).x).toBe(1280);
  });
});
