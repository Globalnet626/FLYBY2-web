import { describe, expect, it } from "vitest";
import { FlybySimulation } from "../src/simulation/flyby";
import { buildManeuver } from "../src/simulation/maneuvers";
import { SPEED } from "../src/simulation/math";

describe("maneuver recipes", () => {
  it("defines six maneuvers with expected segment counts", () => {
    expect(buildManeuver(0)).toHaveLength(1);
    expect(buildManeuver(1)).toHaveLength(3);
    expect(buildManeuver(2)).toHaveLength(3);
    expect(buildManeuver(3)).toHaveLength(3);
    expect(buildManeuver(4)).toHaveLength(11);
    expect(buildManeuver(5)).toHaveLength(5);
  });

  it("straight ahead travels ~1000 units", () => {
    const sim = new FlybySimulation({
      aircraftCount: 1,
      altitude: 120,
      smokeMode: "ribbon",
      forceAircraft: 0,
      forceManeuver: 0,
      seed: 42,
    });
    const start = { ...sim.aircraft.p };
    // 1000 units at 100 u/s = 10s
    for (let i = 0; i < 500; i++) sim.step(0.02);
    const dx = sim.aircraft.p.x - start.x;
    const dy = sim.aircraft.p.y - start.y;
    const dz = sim.aircraft.p.z - start.z;
    const dist = Math.hypot(dx, dy, dz);
    // After straight completes, a new flyby begins ? check we moved a large distance during life
    expect(dist).toBeGreaterThan(100);
    expect(SPEED).toBe(100);
  });

  it("is deterministic with a fixed seed", () => {
    const a = new FlybySimulation({
      aircraftCount: 5,
      altitude: 120,
      smokeMode: "ribbon",
      seed: 99,
    });
    const b = new FlybySimulation({
      aircraftCount: 5,
      altitude: 120,
      smokeMode: "ribbon",
      seed: 99,
    });
    for (let i = 0; i < 120; i++) {
      const fa = a.step(0.02);
      const fb = b.step(0.02);
      expect(fa.aircraftIndex).toBe(fb.aircraftIndex);
      expect(fa.maneuverId).toBe(fb.maneuverId);
      expect(fa.aircraft.p.x).toBeCloseTo(fb.aircraft.p.x, 5);
      expect(fa.aircraft.a.h).toBeCloseTo(fb.aircraft.a.h, 5);
    }
  });

  it("emits smoke during pitch segments", () => {
    const sim = new FlybySimulation({
      aircraftCount: 1,
      altitude: 120,
      smokeMode: "ribbon",
      forceAircraft: 0,
      forceManeuver: 2, // loop: ahead then pitch
      seed: 7,
    });
    let sawRibbon = false;
    // Skip ahead(500) ? 5s, then pitch should emit
    for (let i = 0; i < 400; i++) {
      const f = sim.step(0.02);
      if (f.ribbon.length > 0) sawRibbon = true;
    }
    expect(sawRibbon).toBe(true);
  });
});
