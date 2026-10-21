/**
 * Offline converter: legacy flyby2 text assets ? JSON under public/assets.
 * Source of truth remains the original files in ../flyby2.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AssetManifest } from "../src/assets/types";
import { parseFld } from "./parseFld";
import { parseInf } from "./parseInf";
import { parsePc2 } from "./parsePc2";
import { parseSrf } from "./parseSrf";
import { parseTer } from "./parseTer";
import { createF4MobiusMesh } from "./f4Mobius";
import { createF15Skin } from "./f15Skins";
import { createSu27Yellow13 } from "./su27Yellow13";
import { createAc8FlightSkin } from "./ac8FlightSkins";
import { createF22MobiusMesh } from "./f22Mobius";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const repoFlyby = path.resolve(webRoot, "..", "flyby2");
const outRoot = path.resolve(webRoot, "public", "assets");

function resolveSource(rel: string, fromDir: string): string {
  const candidates = [
    path.resolve(fromDir, rel),
    path.resolve(fromDir, rel.toLowerCase()),
    path.resolve(fromDir, rel.toUpperCase()),
    path.resolve(repoFlyby, rel),
    path.resolve(repoFlyby, path.basename(rel)),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // Case-insensitive scan of directory
  const base = path.basename(rel).toLowerCase();
  const dir = fs.existsSync(fromDir) ? fromDir : repoFlyby;
  const hit = fs.readdirSync(dir).find((f) => f.toLowerCase() === base);
  if (hit) return path.join(dir, hit);
  throw new Error(`Cannot resolve asset "${rel}" from ${fromDir}`);
}

function stem(file: string): string {
  return path.basename(file).replace(/\.[^.]+$/, "").toLowerCase();
}

function writeJson(relPath: string, data: unknown): void {
  const full = path.join(outRoot, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(data));
}

function main(): void {
  if (!fs.existsSync(repoFlyby)) {
    throw new Error(`flyby2 source folder not found: ${repoFlyby}`);
  }

  fs.rmSync(outRoot, { recursive: true, force: true });
  fs.mkdirSync(outRoot, { recursive: true });

  const infPath = resolveSource("flyby.inf", repoFlyby);
  const inf = parseInf(fs.readFileSync(infPath, "utf8"));
  console.log(`INF: ${inf.aircraft.length} aircraft, field=${inf.field}, smoke=${inf.smokeMode}`);

  const convertedMeshes = new Map<string, string>();
  const convertedPc2 = new Map<string, string>();
  const convertedTer = new Map<string, string>();

  const ensureSrf = (file: string) => {
    const key = stem(file);
    if (convertedMeshes.has(key)) return convertedMeshes.get(key)!;
    const src = resolveSource(file, repoFlyby);
    const mesh = parseSrf(fs.readFileSync(src, "utf8"), path.basename(src));
    const out = `meshes/${key}.json`;
    writeJson(out, mesh);
    convertedMeshes.set(key, out);
    console.log(`  SRF ${path.basename(src)} ? ${out} (${mesh.groups.length} groups)`);
    return out;
  };

  const ensurePc2 = (file: string) => {
    const key = stem(file);
    if (convertedPc2.has(key)) return convertedPc2.get(key)!;
    const src = resolveSource(file, repoFlyby);
    const pc2 = parsePc2(fs.readFileSync(src, "utf8"), path.basename(src));
    const out = `pc2/${key}.json`;
    writeJson(out, pc2);
    convertedPc2.set(key, out);
    console.log(`  PC2 ${path.basename(src)} ? ${out} (${pc2.polygons.length} polys)`);
    return out;
  };

  const ensureTer = (file: string) => {
    const key = stem(file);
    if (convertedTer.has(key)) return convertedTer.get(key)!;
    const src = resolveSource(file, repoFlyby);
    const ter = parseTer(fs.readFileSync(src, "utf8"), path.basename(src));
    const out = `ter/${key}.json`;
    writeJson(out, ter);
    convertedTer.set(key, out);
    console.log(`  TER ${path.basename(src)} ? ${out}`);
    return out;
  };

  const aircraft = inf.aircraft.map((file) => {
    const mesh = ensureSrf(file);
    const id = stem(file);
    return { id, sourceName: path.basename(file), mesh };
  });
  const flightSkins = [
    { id: "f18joker", source: "f18.srf", airframe: "f18", flight: "joker", after: "f18" },
    { id: "f14aqueen", source: "f14sprd.srf", airframe: "f14", flight: "queen", after: "f14sprd" },
  ] as const;
  for (const skin of flightSkins) {
    const source = parseSrf(fs.readFileSync(resolveSource(skin.source, repoFlyby), "utf8"), skin.source);
    const mesh = `meshes/${skin.id}.json`;
    const converted = createAc8FlightSkin(source, skin.airframe, skin.flight);
    writeJson(mesh, converted);
    const index = aircraft.findIndex((entry) => entry.id === skin.after);
    aircraft.splice(index + 1, 0, { id: skin.id, sourceName: converted.sourceName, mesh });
  }
  const f15Source = parseSrf(fs.readFileSync(resolveSource("f15.srf", repoFlyby), "utf8"), "f15.srf");
  for (const variant of ["cipher", "pixy"] as const) {
    const id = `f15${variant}`;
    const mesh = `meshes/${id}.json`;
    writeJson(mesh, createF15Skin(f15Source, variant));
    const index = aircraft.findIndex((entry) => entry.id === "f15");
    aircraft.splice(index + (variant === "cipher" ? 1 : 2), 0,
      { id, sourceName: `F-15C ${variant.toUpperCase()} (Galm skin)`, mesh });
  }
  const su27Id = "su27yellow13";
  const su27Mesh = `meshes/${su27Id}.json`;
  const su27Source = parseSrf(fs.readFileSync(resolveSource("su27.srf", repoFlyby), "utf8"), "su27.srf");
  writeJson(su27Mesh, createSu27Yellow13(su27Source));
  const su27Index = aircraft.findIndex((entry) => entry.id === "su27");
  aircraft.splice(su27Index + 1, 0,
    { id: su27Id, sourceName: "Su-27 Yellow 13 (Aquila-inspired)", mesh: su27Mesh });
  const f4Id = "f4mobius";
  const f4Mesh = `meshes/${f4Id}.json`;
  writeJson(f4Mesh, createF4MobiusMesh());
  const f4Entry = { id: f4Id, sourceName: "f4mobius (port original)", mesh: f4Mesh };
  const f4Index = aircraft.findIndex((entry) => entry.id === "f86blue");
  aircraft.splice(f4Index < 0 ? aircraft.length : f4Index, 0, f4Entry);
  const f22 = createF22MobiusMesh(path.join(webRoot, "source-assets/f22/model.gltf"));
  writeJson("meshes/f22mobius.json", f22);
  aircraft.push({ id: "f22mobius", sourceName: f22.sourceName, mesh: "meshes/f22mobius.json" });

  const fldPath = resolveSource(inf.field, repoFlyby);
  const field = parseFld(fs.readFileSync(fldPath, "utf8"), path.basename(fldPath));

  for (const p of field.placements) {
    if (p.kind === "srf") ensureSrf(p.file);
    else if (p.kind === "ter") ensureTer(p.file);
    else ensurePc2(p.file);
  }

  // Rewrite placement files to converted stems for the loader
  const fieldOut = {
    ...field,
    placements: field.placements.map((p) => ({
      ...p,
      file: stem(p.file),
    })),
  };
  const fieldRel = `fields/${stem(inf.field)}.json`;
  writeJson(fieldRel, fieldOut);

  const manifest: AssetManifest = {
    version: 1,
    altitude: inf.altitude,
    smokeMode: inf.smokeMode,
    field: fieldRel,
    aircraft,
    notice:
      "Copyright 2022 Soji Yamakawa. Redistribution under the BSD 3-Clause License. See repository LICENSE.",
  };
  writeJson("manifest.json", manifest);

  console.log(`Wrote manifest + ${convertedMeshes.size + 7} meshes, ${convertedPc2.size} pc2, ${convertedTer.size} ter`);
}

main();
