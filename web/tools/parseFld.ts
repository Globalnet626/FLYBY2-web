import type { ConvertedField, FieldPlacement } from "../src/assets/types";

function tokenize(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

export function parseFld(text: string, sourceName: string): ConvertedField {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (!lines.length || !lines[0].trim().toUpperCase().startsWith("FIELD")) {
    throw new Error(`${sourceName}: missing FIELD header`);
  }

  let sky = { r: 0, g: 128, b: 255 };
  let ground = { r: 128, g: 128, b: 0 };
  const placements: FieldPlacement[] = [];
  const unsupported = new Set<string>();

  let i = 1;
  while (i < lines.length) {
    const av = tokenize(lines[i++]);
    if (!av.length || av[0].startsWith("#")) continue;
    const cmd = av[0].toUpperCase();

    if (cmd === "SKY") {
      sky = { r: Number(av[1]), g: Number(av[2]), b: Number(av[3]) };
    } else if (cmd === "GND") {
      ground = { r: Number(av[1]), g: Number(av[2]), b: Number(av[3]) };
    } else if (cmd === "PC2" || cmd === "PLT" || cmd === "SRF" || cmd === "TER") {
      const kind =
        cmd === "SRF" ? "srf" : cmd === "TER" ? "ter" : cmd === "PLT" ? "plt" : "pc2";
      let file = "";
      let pos: [number, number, number] = [0, 0, 0];
      let att: [number, number, number] = [0, 0, 0];

      while (i < lines.length) {
        const bv = tokenize(lines[i++]);
        if (!bv.length || bv[0].startsWith("#")) continue;
        const bcmd = bv[0].toUpperCase();
        if (bcmd === "FIL") {
          file = bv[1];
        } else if (bcmd === "POS") {
          pos = [Number(bv[1]), Number(bv[2]), Number(bv[3])];
          att = [Number(bv[4] ?? 0), Number(bv[5] ?? 0), Number(bv[6] ?? 0)];
        } else if (bcmd === "END") {
          break;
        } else if (bcmd === "ID" || bcmd === "TAG") {
          // kept for fidelity; not needed for draw
        } else {
          unsupported.add(`${cmd}.${bv[0]}`);
        }
      }

      if (!file) {
        throw new Error(`${sourceName}: ${cmd} block missing FIL`);
      }
      placements.push({
        kind,
        file,
        pos,
        att,
        groundMap: kind === "pc2",
      });
    } else if (cmd === "RGN") {
      while (i < lines.length) {
        const bv = tokenize(lines[i++]);
        if (!bv.length) continue;
        if (bv[0].toUpperCase() === "END") break;
      }
    } else if (cmd === "ENDF" || cmd === "END") {
      break;
    } else if (cmd === "LOD" || cmd === "FLD") {
      unsupported.add(av[0]);
    } else {
      unsupported.add(av[0]);
    }
  }

  if (unsupported.size) {
    console.warn(
      `${sourceName}: unsupported directives: ${[...unsupported].join(", ")}`,
    );
  }

  return { sourceName, sky, ground, placements };
}
