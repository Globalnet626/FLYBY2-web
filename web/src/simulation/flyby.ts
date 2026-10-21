import {
  SPEED,
  biCos,
  biSin,
  clonePose,
  pitchUp,
  pose,
  proceed,
  vectorToHeadPitch,
  type Pose,
} from "./math";
import {
  MANEUVER_NAMES,
  buildManeuver,
  type ManeuverId,
  type Segment,
} from "./maneuvers";
import { SeededRandom } from "./random";
import {
  SmokeTrail,
  parseSmokeMode,
  smokeAttrFor,
  type SmokeMode,
  type SmokeSegment,
} from "./smoke";

export { SPEED };

export interface FlybyConfig {
  aircraftCount: number;
  altitude: number;
  smokeMode: SmokeMode | string;
  forceAircraft?: number | null;
  forceManeuver?: ManeuverId | null;
  seed?: number;
  timeScale?: number;
}

export interface FlybyFrame {
  aircraftIndex: number;
  maneuverId: ManeuverId;
  maneuverName: string;
  segmentIndex: number;
  currentTime: number;
  aircraft: Pose;
  eye: Pose;
  ribbon: SmokeSegment[];
  vapor: SmokeSegment[];
}

const MAX_DT = 0.1;
const PITCH_RATE = 8192;
const BANK_RATE = 32768;
const TURN_RATE = 8192;

export class FlybySimulation {
  aircraft = pose();
  eye = pose();
  aircraftIndex = 0;
  maneuverId: ManeuverId = 0;
  currentTime = 0;

  private readonly altitude: number;
  private readonly aircraftCount: number;
  private readonly smokeMode: SmokeMode;
  private timeScale: number;
  private readonly rng: SeededRandom;
  private forceAircraft: number | null;
  private forceManeuver: ManeuverId | null;
  private segments: Segment[] = [];
  private segmentIndex = -1;
  private smokeOpen = false;
  private vaporOpen = false;
  private readonly smoke: SmokeTrail;
  private readonly vapor: SmokeTrail;
  private readonly smokeAttr;
  private readonly vaporAttr;

  constructor(cfg: FlybyConfig) {
    this.aircraftCount = Math.max(1, cfg.aircraftCount);
    this.altitude = cfg.altitude;
    this.smokeMode = parseSmokeMode(String(cfg.smokeMode));
    this.timeScale = cfg.timeScale ?? 1;
    this.forceAircraft = cfg.forceAircraft ?? null;
    this.forceManeuver = cfg.forceManeuver ?? null;
    this.rng = new SeededRandom(cfg.seed ?? Date.now());
    this.smoke = new SmokeTrail(1000, 100);
    this.vapor = new SmokeTrail(100, 10);
    this.smokeAttr = smokeAttrFor(this.smokeMode, "smoke");
    this.vaporAttr = smokeAttrFor("trail", "vapor");
    this.startFlyby();
  }

  setForceAircraft(index: number | null): void {
    this.forceAircraft = index;
  }

  /** 1, 2, or 4. Any other value stays at 1×. */
  setTimeScale(scale: number): void {
    this.timeScale = scale === 2 || scale === 4 ? scale : 1;
  }

  setForceManeuver(id: ManeuverId | null): void {
    this.forceManeuver = id;
  }

  restart(): void {
    this.startFlyby();
  }

  step(rawDt: number): FlybyFrame {
    let dt = Math.min(Math.max(rawDt, 0), MAX_DT) * this.timeScale;
    while (dt > 0) {
      const stepDt = Math.min(dt, 0.02);
      dt -= stepDt;
      this.advance(stepDt);
    }
    return this.frame();
  }

  private frame(): FlybyFrame {
    this.lookAtAircraft();
    return {
      aircraftIndex: this.aircraftIndex,
      maneuverId: this.maneuverId,
      maneuverName: MANEUVER_NAMES[this.maneuverId],
      segmentIndex: this.segmentIndex,
      currentTime: this.currentTime,
      aircraft: clonePose(this.aircraft),
      eye: clonePose(this.eye),
      ribbon: this.smoke.segments(this.smokeAttr, this.currentTime),
      vapor: this.vapor.segments(this.vaporAttr, this.currentTime),
    };
  }

  private startFlyby(): void {
    this.aircraftIndex =
      this.forceAircraft != null
        ? ((this.forceAircraft % this.aircraftCount) + this.aircraftCount) %
          this.aircraftCount
        : this.rng.int(this.aircraftCount);

    this.maneuverId =
      this.forceManeuver != null
        ? this.forceManeuver
        : (this.rng.int(6) as ManeuverId);

    const distance = this.rng.int(150) + 50;
    let dir = this.rng.int(0x10000);
    this.aircraft = pose(
      {
        x: -500 * biSin(dir),
        y: this.altitude,
        z: 500 * biCos(dir),
      },
      { h: dir + 0x8000, p: 0, b: 0 },
    );

    dir = this.rng.int(0x10000);
    this.eye = pose(
      {
        x: -distance * biSin(dir),
        y: this.altitude + this.rng.int(50) - 25,
        z: distance * biCos(dir),
      },
      { h: 0, p: 0, b: 0 },
    );

    this.currentTime = 0;
    this.smoke.clear();
    this.vapor.clear();
    this.smokeOpen = false;
    this.vaporOpen = false;
    this.segments = buildManeuver(this.maneuverId).map((s) => ({ ...s }));
    this.segmentIndex = -1;
    this.nextSegment();
  }

  private nextSegment(): void {
    this.closeTips();
    this.segmentIndex++;
    if (this.segmentIndex >= this.segments.length) {
      this.startFlyby();
      return;
    }
    const seg = this.segments[this.segmentIndex];
    if (seg.smoke) {
      this.smoke.begin();
      this.smokeOpen = true;
    }
    if (seg.vapor) {
      this.vapor.begin();
      this.vaporOpen = true;
    }
  }

  private closeTips(): void {
    if (this.smokeOpen) {
      this.smoke.end();
      this.smokeOpen = false;
    }
    if (this.vaporOpen) {
      this.vapor.end();
      this.vaporOpen = false;
    }
  }

  private appendTips(): void {
    if (this.smokeOpen) this.smoke.append(this.aircraft, this.currentTime);
    if (this.vaporOpen) this.vapor.append(this.aircraft, this.currentTime);
  }

  private advance(t: number): void {
    if (this.segmentIndex < 0 || this.segmentIndex >= this.segments.length) {
      this.nextSegment();
      return;
    }
    const seg = this.segments[this.segmentIndex];
    if (seg.smokeBefore) this.appendTips();

    this.currentTime += t;
    const vel = t * SPEED;
    proceed(this.aircraft, vel);

    if (seg.kind === "ahead") {
      seg.remaining -= vel;
    } else if (seg.kind === "pitch") {
      const d = t * PITCH_RATE;
      this.aircraft.a = pitchUp(this.aircraft.a, seg.sign * d, 0);
      seg.remaining -= d;
    } else if (seg.kind === "bank") {
      const d = t * BANK_RATE;
      this.aircraft.a.b += seg.sign * d;
      seg.remaining -= d;
    } else if (seg.kind === "turn") {
      const d = t * TURN_RATE;
      this.aircraft.a.h += seg.sign * d;
      seg.remaining -= d;
    }

    if (!seg.smokeBefore) this.appendTips();

    if (seg.remaining <= 0) this.nextSegment();
  }

  private lookAtAircraft(): void {
    this.eye.a = vectorToHeadPitch({
      x: this.aircraft.p.x - this.eye.p.x,
      y: this.aircraft.p.y - this.eye.p.y,
      z: this.aircraft.p.z - this.eye.p.z,
    });
  }
}
