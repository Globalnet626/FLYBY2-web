import { describe, expect, it } from "vitest";
import {
  biCos,
  biSin,
  proceed,
  rotLtoG,
  vec3,
  vectorToHeadPitch,
} from "../src/simulation/math";

describe("impulse math", () => {
  it("uses 65536 units per revolution", () => {
    expect(biSin(0)).toBeCloseTo(0, 6);
    expect(biCos(0)).toBeCloseTo(1, 6);
    expect(biSin(16384)).toBeCloseTo(1, 5);
    expect(biCos(16384)).toBeCloseTo(0, 5);
  });

  it("proceeds along local +Z", () => {
    const pose = { p: vec3(0, 0, 0), a: { h: 0, p: 0, b: 0 } };
    proceed(pose, 10);
    expect(pose.p.z).toBeCloseTo(10, 6);
    expect(pose.p.x).toBeCloseTo(0, 6);
  });

  it("rotLtoG matches heading 90? toward -X for +Z vector", () => {
    // heading 16384 (90?): +Z local ? should go toward -X in Impulse convention
    const v = rotLtoG(vec3(0, 0, 1), { h: 16384, p: 0, b: 0 });
    expect(v.x).toBeCloseTo(-1, 5);
    expect(v.z).toBeCloseTo(0, 5);
  });

  it("vectorToHeadPitch looks along +Z at identity", () => {
    const a = vectorToHeadPitch(vec3(0, 0, 10));
    expect(a.h).toBeCloseTo(0, 3);
    expect(a.p).toBeCloseTo(0, 3);
  });
});
