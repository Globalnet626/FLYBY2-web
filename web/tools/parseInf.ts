export interface FlybyInf {
  field: string;
  altitude: number;
  smokeMode: string;
  aircraft: string[];
}

export function parseInf(text: string): FlybyInf {
  const aircraft: string[] = [];
  let field = "";
  let altitude = 120;
  let smokeMode = "RIBBONSMOKE";

  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const av = line.trim().split(/\s+/).filter(Boolean);
    if (!av.length || av[0].startsWith("#")) continue;
    const cmd = av[0].toUpperCase();
    switch (cmd) {
      case "AIRCRAFT":
        if (!av[1]) throw new Error("AIRCRAFT missing filename");
        aircraft.push(av[1]);
        break;
      case "FIELD":
        if (!av[1]) throw new Error("FIELD missing filename");
        field = av[1];
        break;
      case "ALTITUDE":
        // Original INF uses values like 120.0F
        altitude = Number.parseFloat(av[1]);
        if (!Number.isFinite(altitude)) {
          throw new Error(`Bad ALTITUDE value: ${av[1]}`);
        }
        break;
      case "SOLIDSMOKE":
      case "WIRESMOKE":
      case "TRAILSMOKE":
      case "RIBBONSMOKE":
        smokeMode = cmd;
        break;
      default:
        throw new Error(`Script Error = ${av[0]}`);
    }
  }

  if (!field) throw new Error("FIELD not specified");
  if (!aircraft.length) throw new Error("No aircraft specified");
  return { field, altitude, smokeMode, aircraft };
}
