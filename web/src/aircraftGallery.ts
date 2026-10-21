import * as THREE from "three";
import type { AssetManifest, ConvertedMesh } from "./assets/types";
import { meshFromSrf } from "./rendering/meshes";
import { addExhaustGlow } from "./rendering/exhaust";

const focusId = new URLSearchParams(location.search).get("aircraft");
const WIDTH = focusId ? 900 : 416;
const HEIGHT = focusId ? 800 : 542;
const gallery = document.querySelector<HTMLElement>("#gallery");
const summary = document.querySelector<HTMLElement>("#gallerySummary");
if (!gallery) throw new Error("Missing gallery");
if (!summary) throw new Error("Missing gallery summary");
if (focusId) document.body.classList.add("focus");

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio(1);

const manifest = await fetch("/assets/manifest.json").then((res) => res.json()) as AssetManifest;
summary.textContent = focusId
  ? `${focusId.toUpperCase()} · six fixed views`
  : `${manifest.aircraft.length} port meshes · fixed three-quarter view`;
for (const entry of manifest.aircraft) {
  if (focusId && entry.id !== focusId) continue;
  const mesh = await fetch(`/assets/${entry.mesh}`).then((res) => res.json()) as ConvertedMesh;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030a1b);
  const aircraft = meshFromSrf(mesh);
  addExhaustGlow(aircraft, mesh);
  scene.add(aircraft);
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(15, 25, 20);
  scene.add(key);

  const bounds = new THREE.Box3().setFromObject(aircraft);
  const center = bounds.getCenter(new THREE.Vector3());
  const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius;
  const extent = Math.max(1, radius * (focusId ? 0.94 : 1.16));
  const aspect = WIDTH / HEIGHT;
  const views = focusId ? [
    { name: "THREE-QUARTER", direction: [1.3, 1.1, -1.7], top: false },
    { name: "FRONT THREE-QUARTER", direction: [1.3, 1.1, 1.7], top: false },
    { name: "TOP", direction: [0, 1, 0.12], top: true },
    { name: "SIDE", direction: [1, 0.08, 0], top: false },
    { name: "REAR", direction: [0.15, 0.12, -1], top: false },
    { name: "FRONT", direction: [0.15, 0.12, 1], top: false },
  ] : [{ name: "", direction: [1.3, 1.1, -1.7], top: false }];
  for (const view of views) {
    const camera = new THREE.OrthographicCamera(
      -extent * aspect,
      extent * aspect,
      extent,
      -extent,
      0.1,
      200,
    );
    if (view.top) camera.up.set(0, 0, 1);
    camera.position.copy(center).add(
      new THREE.Vector3(view.direction[0], view.direction[1], view.direction[2])
        .normalize().multiplyScalar(50),
    );
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);

    const card = document.createElement("article");
    const title = document.createElement("h2");
    title.textContent = `${entry.id.toUpperCase()} ${view.name}`;
    const img = document.createElement("img");
    img.alt = `${entry.id.toUpperCase()} ${view.name} rendered aircraft mesh`;
    img.dataset.id = entry.id;
    if (view.name) img.dataset.view = view.name.toLowerCase();
    img.src = renderer.domElement.toDataURL("image/png");
    const source = document.createElement("small");
    source.textContent = entry.sourceName.toUpperCase();
    card.append(title, img, source);
    gallery.append(card);
  }
}
document.body.dataset.ready = "true";
