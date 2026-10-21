import * as THREE from "three";
import type { SmokeSegment } from "../simulation/smoke";

const MAX_RIBBON_SEGS = 2000;
const MAX_TRAIL_SEGS = 400;

export class SmokeRenderer {
  readonly ribbon: THREE.Mesh;
  readonly trail: THREE.LineSegments;
  private ribbonPos: Float32Array;
  private trailPos: Float32Array;

  constructor() {
    this.ribbonPos = new Float32Array(MAX_RIBBON_SEGS * 6 * 3);
    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(this.ribbonPos, 3).setUsage(THREE.DynamicDrawUsage),
    );
    rGeo.setDrawRange(0, 0);
    this.ribbon = new THREE.Mesh(
      rGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    // Positions change every frame while BufferGeometry's computed bounds do
    // not. Static frustum bounds would hide trails away from world origin.
    this.ribbon.frustumCulled = false;

    this.trailPos = new Float32Array(MAX_TRAIL_SEGS * 4 * 3);
    const tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(this.trailPos, 3).setUsage(THREE.DynamicDrawUsage),
    );
    tGeo.setDrawRange(0, 0);
    this.trail = new THREE.LineSegments(
      tGeo,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
      }),
    );
    this.trail.frustumCulled = false;
  }

  update(ribbon: SmokeSegment[], vapor: SmokeSegment[]): void {
    let ri = 0;
    const rp = this.ribbonPos;
    for (const seg of ribbon) {
      if (ri / 18 >= MAX_RIBBON_SEGS) break;
      const ax = seg.a.left.x * (seg.widthA / 2);
      const ay = seg.a.left.y * (seg.widthA / 2);
      const az = seg.a.left.z * (seg.widthA / 2);
      const bx = seg.b.left.x * (seg.widthB / 2);
      const by = seg.b.left.y * (seg.widthB / 2);
      const bz = seg.b.left.z * (seg.widthB / 2);
      const s0 = [
        seg.a.p.x + ax,
        seg.a.p.y + ay,
        seg.a.p.z + az,
      ];
      const s1 = [
        seg.a.p.x - ax,
        seg.a.p.y - ay,
        seg.a.p.z - az,
      ];
      const s2 = [
        seg.b.p.x + bx,
        seg.b.p.y + by,
        seg.b.p.z + bz,
      ];
      const s3 = [
        seg.b.p.x - bx,
        seg.b.p.y - by,
        seg.b.p.z - bz,
      ];
      // two tris: 0,1,2 and 2,1,3
      for (const p of [s0, s1, s2, s2, s1, s3]) {
        rp[ri++] = p[0];
        rp[ri++] = p[1];
        rp[ri++] = p[2];
      }
    }
    const rGeo = this.ribbon.geometry as THREE.BufferGeometry;
    (rGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    rGeo.setDrawRange(0, ri / 3);

    let ti = 0;
    const tp = this.trailPos;
    for (const seg of vapor) {
      if (ti / 12 >= MAX_TRAIL_SEGS) break;
      const ax = seg.a.left.x * (seg.widthA / 2);
      const ay = seg.a.left.y * (seg.widthA / 2);
      const az = seg.a.left.z * (seg.widthA / 2);
      const bx = seg.b.left.x * (seg.widthB / 2);
      const by = seg.b.left.y * (seg.widthB / 2);
      const bz = seg.b.left.z * (seg.widthB / 2);
      const pairs = [
        [seg.a.p.x + ax, seg.a.p.y + ay, seg.a.p.z + az],
        [seg.b.p.x + bx, seg.b.p.y + by, seg.b.p.z + bz],
        [seg.a.p.x - ax, seg.a.p.y - ay, seg.a.p.z - az],
        [seg.b.p.x - bx, seg.b.p.y - by, seg.b.p.z - bz],
      ];
      for (const p of pairs) {
        tp[ti++] = p[0];
        tp[ti++] = p[1];
        tp[ti++] = p[2];
      }
    }
    const tGeo = this.trail.geometry as THREE.BufferGeometry;
    (tGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    tGeo.setDrawRange(0, ti / 3);
  }
}
