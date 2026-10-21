import type { ConvertedPc2 } from "../src/assets/types";

function tokenize(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

function pictHeader(line: string): boolean {
  const t = line.trim().toUpperCase();
  return t.startsWith("PICT2") || t.startsWith("PICT");
}

export function parsePc2(text: string, sourceName: string): ConvertedPc2 {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (!lines.length || !pictHeader(lines[0])) {
    throw new Error(`${sourceName}: missing Pict2 header`);
  }

  const polygons: ConvertedPc2["polygons"] = [];
  let color = { r: 255, g: 255, b: 255 };
  let verts: Array<[number, number]> = [];
  let inPlg = false;
  const unsupported = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const av = tokenize(lines[i]);
    if (!av.length || av[0].startsWith("#")) continue;
    const cmd = av[0].toUpperCase();

    if (cmd === "PLG") {
      inPlg = true;
      color = { r: 255, g: 255, b: 255 };
      verts = [];
    } else if (cmd === "COL" && inPlg) {
      color = { r: Number(av[1]), g: Number(av[2]), b: Number(av[3]) };
    } else if (cmd === "VER" && inPlg) {
      verts.push([Number(av[1]), Number(av[2])]);
    } else if (cmd === "ENDO" && inPlg) {
      if (verts.length >= 3) polygons.push({ color, verts: verts.slice() });
      inPlg = false;
    } else if (cmd === "ENDPICT" || cmd === "END") {
      break;
    } else if (["PST", "PLL", "LSQ", "DST", "REM"].includes(cmd)) {
      unsupported.add(av[0]);
    } else if (!inPlg) {
      unsupported.add(av[0]);
    }
  }

  if (unsupported.size) {
    console.warn(
      `${sourceName}: unsupported directives: ${[...unsupported].join(", ")}`,
    );
  }

  return { sourceName, polygons };
}
