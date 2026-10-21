/**
 * Impulse-compatible attitude math.
 * Full revolution = 65536 units. BiSin/BiCos use angle * ? / 32768.
 * Local?global: bank (Z) ? pitch (X) ? heading (Y).
 */

export const FULL_CIRCLE = 0x10000;
export const HALF_CIRCLE = 0x8000;
export const QUARTER_CIRCLE = 0x4000;
/** World units per second (FLYBY.C vel = dt * 100). */
export const SPEED = 100;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Attitude {
  h: number;
  p: number;
  b: number;
}

export interface Trig {
  sinh: number;
  cosh: number;
  sinp: number;
  cosp: number;
  sinb: number;
  cosb: number;
}

export interface Pose {
  p: Vec3;
  a: Attitude;
}

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

export function attitude(h = 0, p = 0, b = 0): Attitude {
  return { h, p, b };
}

export function pose(p?: Partial<Vec3>, a?: Partial<Attitude>): Pose {
  return {
    p: vec3(p?.x ?? 0, p?.y ?? 0, p?.z ?? 0),
    a: attitude(a?.h ?? 0, a?.p ?? 0, a?.b ?? 0),
  };
}

export function clonePose(src: Pose): Pose {
  return {
    p: { ...src.p },
    a: { ...src.a },
  };
}

export function biSin(angle: number): number {
  return Math.sin((angle * Math.PI) / 32768);
}

export function biCos(angle: number): number {
  return Math.cos((angle * Math.PI) / 32768);
}

export function makeTrig(a: Attitude): Trig {
  return {
    sinh: biSin(a.h),
    cosh: biCos(a.h),
    sinp: biSin(a.p),
    cosp: biCos(a.p),
    sinb: biSin(a.b),
    cosb: biCos(a.b),
  };
}

export function impulseToRadians(angle: number): number {
  return (angle * Math.PI) / 32768;
}

/** atan2-like for Impulse BiAngle2 on (x,y). */
export function biAngle2(x: number, y: number): number {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  if (ax < 1e-6 && ay < 1e-6) return 0;
  if (ax >= ay) {
    const a = Math.atan(y / ax) * (32768 / Math.PI);
    if (x > 0) return a;
    return y > 0 ? 0x8000 - a : -0x8000 - a;
  }
  const a = Math.atan(x / ay) * (32768 / Math.PI);
  if (y > 0) return 0x4000 - a;
  return -0x4000 + a;
}

export function rotLtoG(src: Vec3, ang: Attitude): Vec3 {
  const sinh = biSin(ang.h);
  const cosh = biCos(ang.h);
  const sinp = biSin(ang.p);
  const cosp = biCos(ang.p);
  const sinb = biSin(ang.b);
  const cosb = biCos(ang.b);

  const tmpx = cosb * src.x - sinb * src.y;
  const tmpy = sinb * src.x + cosb * src.y;

  const tmpz = cosp * src.z - sinp * tmpy;
  const y = sinp * src.z + cosp * tmpy;

  return {
    x: cosh * tmpx - sinh * tmpz,
    y,
    z: sinh * tmpx + cosh * tmpz,
  };
}

export function rotGtoL(src: Vec3, ang: Attitude): Vec3 {
  const sinh = biSin(ang.h);
  const cosh = biCos(ang.h);
  const sinp = biSin(ang.p);
  const cosp = biCos(ang.p);
  const sinb = biSin(ang.b);
  const cosb = biCos(ang.b);

  const tmpx = cosh * src.x + sinh * src.z;
  const tmpz = -sinh * src.x + cosh * src.z;

  const z = cosp * tmpz + sinp * src.y;
  const tmpy = -sinp * tmpz + cosp * src.y;

  return {
    x: cosb * tmpx + sinb * tmpy,
    y: -sinb * tmpx + cosb * tmpy,
    z,
  };
}

export function vectorToHeadPitch(eye: Vec3): Attitude {
  if (Math.abs(eye.x) <= 1e-6 && Math.abs(eye.z) <= 1e-6) {
    return attitude(0, eye.y >= 0 ? QUARTER_CIRCLE : -QUARTER_CIRCLE, 0);
  }
  const h = biAngle2(eye.z, -eye.x);
  let hor: number;
  if (Math.abs(eye.z) > Math.abs(eye.x)) {
    hor = eye.z / biCos(h);
  } else {
    hor = -eye.x / biSin(h);
  }
  const p = biAngle2(hor, eye.y);
  return attitude(h, p, 0);
}

export function angleToVectors(ang: Attitude): { eye: Vec3; up: Vec3 } {
  const eye = rotLtoG(vec3(0, 0, 1), ang);
  const up = rotLtoG(vec3(0, 1, 0), ang);
  return { eye, up };
}

export function vectorToAngle(eye: Vec3, up: Vec3): Attitude {
  const an = vectorToHeadPitch(eye);
  const tmp = rotGtoL(up, an);
  an.b = biAngle2(tmp.y, -tmp.x);
  return an;
}

/** BiPitchUp with yaw=0 as used by flyby pitch segments. */
export function pitchUp(src: Attitude, pit: number, yaw = 0): Attitude {
  // BiRot2 of (0, cos(pit)) by yaw ? (sin(yaw)*cos(pit)?):
  // BiSetPoint2(tmp, 0, BiCos(pit)); BiRot2(tmp,tmp,yaw)
  // BiRot2: x' = x*cos - y*sin; y' = x*sin + y*cos with angle yaw on 2D
  const cosp = biCos(pit);
  const sinp = biSin(pit);
  const cosy = biCos(yaw);
  const siny = biSin(yaw);

  const eyeLocal = vec3(0 * cosy - cosp * siny, sinp, 0 * siny + cosp * cosy);
  const upLocal = vec3(0 * cosy - -sinp * siny, cosp, 0 * siny + -sinp * cosy);

  const eye = rotLtoG(eyeLocal, src);
  const up = rotLtoG(upLocal, src);
  return vectorToAngle(eye, up);
}

export function proceed(obj: Pose, dist: number): void {
  const delta = rotLtoG(vec3(0, 0, dist), obj.a);
  obj.p.x += delta.x;
  obj.p.y += delta.y;
  obj.p.z += delta.z;
}

export function leftAxis(ang: Attitude): Vec3 {
  return rotLtoG(vec3(1, 0, 0), ang);
}

export function upAxis(ang: Attitude): Vec3 {
  return rotLtoG(vec3(0, 1, 0), ang);
}
