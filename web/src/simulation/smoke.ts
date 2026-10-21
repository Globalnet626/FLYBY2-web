import { leftAxis, upAxis, type Pose, type Vec3 } from "./math";

export type SmokeMode = "solid" | "wire" | "trail" | "ribbon";

export function parseSmokeMode(raw: string): SmokeMode {
  switch (raw.toUpperCase()) {
    case "SOLIDSMOKE":
    case "SOLID":
      return "solid";
    case "WIRESMOKE":
    case "WIRE":
      return "wire";
    case "TRAILSMOKE":
    case "TRAIL":
      return "trail";
    case "RIBBONSMOKE":
    case "RIBBON":
    default:
      return "ribbon";
  }
}

export interface SmokeNode {
  p: Vec3;
  left: Vec3;
  up: Vec3;
  t: number;
}

export interface SmokeAttr {
  t0: number;
  t1: number;
  iniw: number;
  maxw: number;
  dw: number;
}

export interface SmokeSegment {
  a: SmokeNode;
  b: SmokeNode;
  widthA: number;
  widthB: number;
}

export class SmokeTrail {
  nodes: SmokeNode[] = [];
  tips: Array<[number, number]> = [];
  private open = false;
  constructor(
    readonly maxNodes: number,
    readonly delWhenOverflow: number,
  ) {}

  clear(): void {
    this.nodes = [];
    this.tips = [];
    this.open = false;
  }

  begin(): void {
    if (this.tips.length >= 32) this.tips.shift();
    const i = this.nodes.length;
    this.tips.push([i, i]);
    this.open = true;
  }

  append(pose: Pose, t: number): void {
    if (!this.open) return;
    if (this.nodes.length >= this.maxNodes && this.delWhenOverflow > 0) {
      this.nodes.splice(0, this.delWhenOverflow);
      for (const tip of this.tips) {
        tip[0] = Math.max(0, tip[0] - this.delWhenOverflow);
        tip[1] = Math.max(0, tip[1] - this.delWhenOverflow);
      }
    }
    this.nodes.push({
      p: { ...pose.p },
      left: leftAxis(pose.a),
      up: upAxis(pose.a),
      t,
    });
    this.tips[this.tips.length - 1][1] = this.nodes.length - 1;
  }

  end(): void {
    if (!this.open) return;
    this.tips[this.tips.length - 1][1] = Math.max(0, this.nodes.length - 1);
    this.open = false;
  }

  segments(attr: SmokeAttr, now: number): SmokeSegment[] {
    const out: SmokeSegment[] = [];
    for (const [nEnd, nSta] of this.tips) {
      for (let n = nSta; n > nEnd; n--) {
        const a = this.nodes[n];
        const b = this.nodes[n - 1];
        if (!a || !b) continue;
        const age0 = now - a.t;
        const age1 = now - b.t;
        if (attr.t0 <= age0 && age1 <= attr.t1) {
          out.push({
            a,
            b,
            widthA: Math.min(attr.iniw + attr.dw * age0, attr.maxw),
            widthB: Math.min(attr.iniw + attr.dw * age1, attr.maxw),
          });
        }
      }
    }
    return out;
  }
}

export function smokeAttrFor(mode: SmokeMode, role: "smoke" | "vapor"): SmokeAttr {
  if (role === "vapor") {
    return { t0: 0.1, t1: 1.0, iniw: 10, maxw: 10, dw: 0 };
  }
  // Ribbon defaults from FLYBY.C; other modes share life/width for milestone.
  return { t0: 0.2, t1: 30, iniw: 0, maxw: 10, dw: 3 };
}
