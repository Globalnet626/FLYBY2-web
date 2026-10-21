import * as THREE from "three";
import type {
  ConvertedField,
  ConvertedMesh,
  ConvertedPc2,
  ConvertedTer,
} from "../assets/types";
import type { FlybyFrame } from "../simulation/flyby";
import { meshFromPc2, meshFromSrf, meshFromTer } from "./meshes";
import { applyPose, impulseVerticalFovDeg } from "./pose";
import { SmokeRenderer } from "./smokeRender";
import { addExhaustGlow } from "./exhaust";

export interface SceneAssets {
  field: ConvertedField;
  meshes: Map<string, ConvertedMesh>;
  pc2: Map<string, ConvertedPc2>;
  ter: Map<string, ConvertedTer>;
  aircraftIds: string[];
}

export class FlybyScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  private light: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;
  private aircraftRoot = new THREE.Group();
  private aircraftMeshes: THREE.Group[] = [];
  private smoke = new SmokeRenderer();
  private grid: THREE.LineSegments;
  private ground: THREE.Mesh;
  private sky: THREE.Mesh;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.autoClear = true;

    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    this.camera = new THREE.PerspectiveCamera(
      impulseVerticalFovDeg(aspect),
      aspect,
      2.5,
      10000,
    );

    this.ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.light = new THREE.DirectionalLight(0xffffff, 1.1);
    this.scene.add(this.ambient, this.light);

    // The reference capture renders the field as a near-black night scene.
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(8000, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x010514, side: THREE.BackSide }),
    );
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40000, 40000),
      new THREE.MeshBasicMaterial({ color: 0x010103 }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.05;
    this.scene.add(this.sky, this.ground);

    this.grid = this.makeGrid();
    this.scene.add(this.grid);

    this.scene.add(this.aircraftRoot);
    this.scene.add(this.smoke.ribbon, this.smoke.trail);
  }

  load(assets: SceneAssets): void {
    // Clear previous field props (keep sky/ground/grid/aircraft)
    const keep = new Set([
      this.sky,
      this.ground,
      this.grid,
      this.aircraftRoot,
      this.smoke.ribbon,
      this.smoke.trail,
      this.ambient,
      this.light,
    ]);
    [...this.scene.children].forEach((c) => {
      if (!keep.has(c as never)) this.scene.remove(c);
    });

    let runwayIndex = 0;
    for (const p of assets.field.placements) {
      const group = new THREE.Group();
      if (p.kind === "srf") {
        const mesh = assets.meshes.get(p.file);
        if (!mesh) throw new Error(`Missing field mesh ${p.file}`);
        group.add(meshFromSrf(mesh));
      } else if (p.kind === "ter") {
        const ter = assets.ter.get(p.file);
        if (!ter) throw new Error(`Missing terrain ${p.file}`);
        group.add(meshFromTer(ter));
      } else {
        const pc2 = assets.pc2.get(p.file);
        if (!pc2) throw new Error(`Missing pc2 ${p.file}`);
        const m = meshFromPc2(pc2, p.groundMap);
        if (p.groundMap) {
          // BiOvwFld pitches PC2 by -90? so XY lies on XZ ground
          m.rotation.x = -Math.PI / 2;
          // The two long runways cross. Their coplanar bases fight for the
          // depth buffer at the intersection unless one has a clear layer.
          if (p.file === "runway") m.position.y = runwayIndex++ * 0.6;
        }
        group.add(m);
      }
      applyPose(group, {
        p: { x: p.pos[0], y: p.pos[1], z: p.pos[2] },
        a: { h: p.att[0], p: p.att[1], b: p.att[2] },
      });
      this.scene.add(group);
    }

    this.aircraftRoot.clear();
    this.aircraftMeshes = assets.aircraftIds.map((id) => {
      const mesh = assets.meshes.get(id);
      if (!mesh) throw new Error(`Missing aircraft mesh ${id}`);
      const g = meshFromSrf(mesh);
      addExhaustGlow(g, mesh);
      g.visible = false;
      this.aircraftRoot.add(g);
      return g;
    });
  }

  sync(frame: FlybyFrame): void {
    for (let i = 0; i < this.aircraftMeshes.length; i++) {
      const g = this.aircraftMeshes[i];
      const on = i === frame.aircraftIndex;
      g.visible = on;
      if (on) applyPose(g, frame.aircraft);
    }
    applyPose(this.camera, frame.eye, { camera: true });
    this.light.position.set(
      frame.eye.p.x,
      frame.eye.p.y + 1000,
      frame.eye.p.z,
    );
    this.light.target.position.set(
      frame.aircraft.p.x,
      frame.aircraft.p.y,
      frame.aircraft.p.z,
    );
    this.light.target.updateMatrixWorld();
    this.smoke.update(frame.ribbon, frame.vapor);
  }

  resize(width: number, height: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = impulseVerticalFovDeg(this.camera.aspect);
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  screenshot(): string {
    return this.renderer.domElement.toDataURL("image/png");
  }

  private makeGrid(): THREE.LineSegments {
    const pts: number[] = [];
    for (let x = -20000; x <= 20000; x += 1000) {
      pts.push(x, 0, -20000, x, 0, 20000);
      pts.push(-20000, 0, x, 20000, 0, x);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({
        color: 0x11117b,
        transparent: true,
        opacity: 0.65,
      }),
    );
  }
}
