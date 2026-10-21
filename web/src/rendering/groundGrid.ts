import * as THREE from "three";

const EXTENT = 20000;
const STEP = 1000;

/**
 * WebGL clamps lineWidth to 1, so the ground wireframe draws a second
 * LineSegments pass shifted one device pixel off the first. Aircraft and
 * smoke stay on the normal 1px path.
 */
const OFFSET_CHUNK = `#include <project_vertex>
vec4 groundClip = projectionMatrix * modelViewMatrix * vec4(groundOther, 1.0);
vec2 groundDelta = (groundClip.xy / groundClip.w - gl_Position.xy / gl_Position.w) * groundViewport * groundSign;
vec2 groundNormal = normalize(vec2(-groundDelta.y, groundDelta.x));
gl_Position.xy += groundNormal * (2.0 / groundViewport) * gl_Position.w;`;

export function buildGroundGridGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const other: number[] = [];
  const signs: number[] = [];
  for (let x = -EXTENT; x <= EXTENT; x += STEP) {
    pushSegment(positions, other, signs, x, 0, -EXTENT, x, 0, EXTENT);
    pushSegment(positions, other, signs, -EXTENT, 0, x, EXTENT, 0, x);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("groundOther", new THREE.Float32BufferAttribute(other, 3));
  geo.setAttribute("groundSign", new THREE.Float32BufferAttribute(signs, 1));
  return geo;
}

function pushSegment(
  positions: number[],
  other: number[],
  signs: number[],
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): void {
  positions.push(ax, ay, az, bx, by, bz);
  // Each vertex stores the other end. Opposite signs keep the pixel offset
  // on the same side of the projected line.
  other.push(bx, by, bz, ax, ay, az);
  signs.push(1, -1);
}

function gridMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: 0x11117b,
    transparent: true,
    opacity: 0.65,
  });
}

export function createThickGroundGrid(viewport: { x: number; y: number }): THREE.LineSegments {
  const geo = buildGroundGridGeometry();
  const base = new THREE.LineSegments(geo, gridMaterial());
  const offset = gridMaterial();
  offset.onBeforeCompile = (shader) => {
    shader.uniforms.groundViewport = { value: viewport };
    shader.vertexShader =
      "attribute vec3 groundOther; attribute float groundSign; uniform vec2 groundViewport;\n" +
      shader.vertexShader.replace("#include <project_vertex>", OFFSET_CHUNK);
  };
  base.add(new THREE.LineSegments(geo, offset));
  return base;
}
