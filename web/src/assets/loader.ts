import type {
  AssetManifest,
  ConvertedField,
  ConvertedMesh,
  ConvertedPc2,
  ConvertedTer,
} from "./types";
import type { SceneAssets } from "../rendering/scene";
import { parseSmokeMode, type SmokeMode } from "../simulation/smoke";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return (await res.json()) as T;
}

export interface LoadProgress {
  loaded: number;
  total: number;
  label: string;
}

export async function loadSceneAssets(
  onProgress?: (p: LoadProgress) => void,
): Promise<{ assets: SceneAssets; manifest: AssetManifest; smokeMode: SmokeMode }> {
  const manifest = await fetchJson<AssetManifest>("/assets/manifest.json");
  const field = await fetchJson<ConvertedField>(`/assets/${manifest.field}`);

  const meshIds = new Set<string>();
  for (const a of manifest.aircraft) meshIds.add(a.id);
  for (const p of field.placements) {
    if (p.kind === "srf") meshIds.add(p.file);
  }
  const pc2Ids = new Set<string>();
  const terIds = new Set<string>();
  for (const p of field.placements) {
    if (p.kind === "pc2" || p.kind === "plt") pc2Ids.add(p.file);
    if (p.kind === "ter") terIds.add(p.file);
  }

  const total = meshIds.size + pc2Ids.size + terIds.size;
  let loaded = 0;
  const report = (label: string) =>
    onProgress?.({ loaded, total: Math.max(total, 1), label });

  const meshes = new Map<string, ConvertedMesh>();
  for (const id of meshIds) {
    report(`mesh ${id}`);
    meshes.set(id, await fetchJson<ConvertedMesh>(`/assets/meshes/${id}.json`));
    loaded++;
  }
  const pc2 = new Map<string, ConvertedPc2>();
  for (const id of pc2Ids) {
    report(`pc2 ${id}`);
    pc2.set(id, await fetchJson<ConvertedPc2>(`/assets/pc2/${id}.json`));
    loaded++;
  }
  const ter = new Map<string, ConvertedTer>();
  for (const id of terIds) {
    report(`ter ${id}`);
    ter.set(id, await fetchJson<ConvertedTer>(`/assets/ter/${id}.json`));
    loaded++;
  }
  report("done");

  return {
    manifest,
    smokeMode: parseSmokeMode(manifest.smokeMode),
    assets: {
      field,
      meshes,
      pc2,
      ter,
      aircraftIds: manifest.aircraft.map((a) => a.id),
    },
  };
}
