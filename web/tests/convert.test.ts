import { describe, expect, it } from "vitest";
import { decodeGrb555 } from "../tools/polygon";
import { parseInf } from "../tools/parseInf";
import { parseSrf } from "../tools/parseSrf";
import { parsePc2 } from "../tools/parsePc2";

describe("asset converters", () => {
  it("decodes GRB555 face colors", () => {
    const c = decodeGrb555(31);
    expect(c.b).toBe(255);
    expect(c.r).toBe(0);
    expect(c.g).toBe(0);
  });

  it("parses FLYBY.INF directives", () => {
    const inf = parseInf(`FIELD airport.fld
RIBBONSMOKE
ALTITUDE 120.0F
AIRCRAFT f16.srf
AIRCRAFT f15.srf
`);
    expect(inf.field).toBe("airport.fld");
    expect(inf.smokeMode).toBe("RIBBONSMOKE");
    expect(inf.altitude).toBe(120);
    expect(inf.aircraft).toEqual(["f16.srf", "f15.srf"]);
  });

  it("parses a minimal SRF into triangulated groups", () => {
    const srf = `Surf
V 0 0 0
V 1 0 0
V 0 1 0
V 0 0 1
F
C 31
N 0 0 0 0 0 1
V 0 1 2
E
F
C 2114
N 0 0 0 0 1 0
V 0 1 3
E
E
`;
    const mesh = parseSrf(srf, "test.srf");
    expect(mesh.groups.length).toBeGreaterThan(0);
    const tris = mesh.groups.reduce((n, g) => n + g.positions.length / 9, 0);
    expect(tris).toBe(2);
  });

  it("parses PC2 polygons", () => {
    const pc2 = parsePc2(
      `Pict2
PLG
COL 79 79 79
VER -30.0 1500
VER -30.0 -1500
VER 30.0 -1500
VER 30.0 1500
ENDO
ENDPICT
`,
      "runway.pc2",
    );
    expect(pc2.polygons).toHaveLength(1);
    expect(pc2.polygons[0].verts).toHaveLength(4);
  });
});
