import * as THREE from "three";
import { rotLtoG, type Pose, vec3 } from "../simulation/math";

/**
 * Apply Impulse pose to a Three.js object.
 * Impulse looks along +Z; Three cameras look along -Z, so cameras flip the Z basis.
 */
export function applyPose(
  obj: THREE.Object3D,
  pose: Pose,
  opts: { camera?: boolean } = {},
): void {
  const lx = rotLtoG(vec3(1, 0, 0), pose.a);
  const ly = rotLtoG(vec3(0, 1, 0), pose.a);
  const lz = rotLtoG(vec3(0, 0, 1), pose.a);
  const te = obj.matrix.elements;
  const zx = opts.camera ? -lz.x : lz.x;
  const zy = opts.camera ? -lz.y : lz.y;
  const zz = opts.camera ? -lz.z : lz.z;

  te[0] = lx.x;
  te[1] = lx.y;
  te[2] = lx.z;
  te[3] = 0;
  te[4] = ly.x;
  te[5] = ly.y;
  te[6] = ly.z;
  te[7] = 0;
  te[8] = zx;
  te[9] = zy;
  te[10] = zz;
  te[11] = 0;
  te[12] = pose.p.x;
  te[13] = pose.p.y;
  te[14] = pose.p.z;
  te[15] = 1;
  obj.matrixAutoUpdate = false;
  obj.matrixWorldNeedsUpdate = true;
}

/** Impulse horizontal FOV with 2?~ magnification ? 38.94??. */
export function impulseVerticalFovDeg(aspect: number): number {
  const halfH = Math.atan(1 / (2 * Math.SQRT2));
  const halfV = Math.atan(Math.tan(halfH) / aspect);
  return (halfV * 2 * 180) / Math.PI;
}
