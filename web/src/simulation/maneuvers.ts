export type SegmentKind = "ahead" | "pitch" | "bank" | "turn";

export interface Segment {
  kind: SegmentKind;
  /** Distance remaining (ahead) or angle units remaining (pitch/bank/turn). */
  remaining: number;
  sign: 1 | -1;
  smoke: boolean;
  vapor: boolean;
  /** Turn appends smoke before motion; pitch/bank after. */
  smokeBefore?: boolean;
}

export type ManeuverId = 0 | 1 | 2 | 3 | 4 | 5;

export const MANEUVER_NAMES = [
  "Straight",
  "Roll",
  "Loop",
  "Climb",
  "Eight",
  "360 Turn",
] as const;

function ahead(dist: number): Segment {
  return { kind: "ahead", remaining: dist, sign: 1, smoke: false, vapor: false };
}

function pitch(ctr: number, sign: 1 | -1 = 1): Segment {
  return { kind: "pitch", remaining: ctr, sign, smoke: true, vapor: true };
}

function bank(ctr: number, sign: 1 | -1 = 1): Segment {
  return { kind: "bank", remaining: ctr, sign, smoke: false, vapor: true };
}

function turn(ctr: number, sign: 1 | -1 = 1): Segment {
  return {
    kind: "turn",
    remaining: ctr,
    sign,
    smoke: true,
    vapor: true,
    smokeBefore: true,
  };
}

export function buildManeuver(id: ManeuverId): Segment[] {
  switch (id) {
    case 0:
      return [ahead(1000)];
    case 1:
      return [ahead(300), bank(65536, 1), ahead(300)];
    case 2:
      return [ahead(500), pitch(65536, 1), ahead(500)];
    case 3:
      return [ahead(450), pitch(12800, 1), ahead(500)];
    case 4:
      return [
        ahead(400),
        pitch(0x4000, 1),
        ahead(50),
        pitch(0x6000, 1),
        bank(0x18000, 1),
        pitch(0x6000, 1),
        ahead(50),
        pitch(0x6000, 1),
        bank(0x18000, 1),
        pitch(0x2000, 1),
        ahead(400),
      ];
    case 5:
      return [
        ahead(450),
        bank(12800, 1),
        turn(65536, 1),
        bank(12800, -1),
        ahead(500),
      ];
  }
}
