import { loadSceneAssets } from "./assets/loader";
import { FlybySimulation } from "./simulation/flyby";
import { FlybyScene } from "./rendering/scene";

export class FlybyApp {
  private scene: FlybyScene;
  private sim: FlybySimulation | null = null;
  private running = false;
  private paused = false;
  private raf = 0;
  private lastTs = 0;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private aircraftNames: string[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private ui: {
      overlay: HTMLElement;
      overlayText: HTMLElement;
      progressBar: HTMLElement;
      aircraftLabel: HTMLElement;
      maneuverLabel: HTMLElement;
      fpsLabel: HTMLElement;
      aircraftSelect: HTMLSelectElement;
      btnPause: HTMLButtonElement;
      btnRestart: HTMLButtonElement;
      btnShot: HTMLButtonElement;
    },
  ) {
    this.scene = new FlybyScene(canvas);
    this.bindUi();
    window.addEventListener("resize", () => this.onResize());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.lastTs = 0;
    });
    window.addEventListener("keydown", (e) => this.onKey(e));
  }

  async start(): Promise<void> {
    try {
      this.setOverlay("Loading assets...", 0);
      const { assets, manifest, smokeMode } = await loadSceneAssets((p) => {
        const pct = p.total ? (p.loaded / p.total) * 100 : 0;
        this.setOverlay(`Loading ${p.label}...`, pct);
      });
      this.aircraftNames = manifest.aircraft.map((a) => a.id.toUpperCase());
      this.fillAircraftSelect();
      this.scene.load(assets);
      this.sim = new FlybySimulation({
        aircraftCount: assets.aircraftIds.length,
        altitude: manifest.altitude,
        smokeMode,
      });
      this.hideOverlay();
      this.onResize();
      this.running = true;
      this.paused = false;
      this.lastTs = 0;
      this.loop(performance.now());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.ui.overlayText.innerHTML = `<span class="error">Failed to start</span><br/>${msg}`;
      this.ui.progressBar.style.width = "100%";
      console.error(err);
    }
  }

  private bindUi(): void {
    this.ui.btnPause.addEventListener("click", () => this.togglePause());
    this.ui.btnRestart.addEventListener("click", () => this.restart());
    this.ui.btnShot.addEventListener("click", () => this.screenshot());
    this.ui.aircraftSelect.addEventListener("change", () => {
      const v = this.ui.aircraftSelect.value;
      if (!this.sim) return;
      this.sim.setForceAircraft(v === "" ? null : Number(v));
      this.restart();
    });
  }

  private fillAircraftSelect(): void {
    const sel = this.ui.aircraftSelect;
    sel.innerHTML = "";
    const auto = document.createElement("option");
    auto.value = "";
    auto.textContent = "Aircraft: random";
    sel.appendChild(auto);
    this.aircraftNames.forEach((name, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = name;
      sel.appendChild(opt);
    });
  }

  private togglePause(): void {
    this.paused = !this.paused;
    this.ui.btnPause.textContent = this.paused ? "Resume" : "Pause";
    this.lastTs = 0;
  }

  private restart(): void {
    this.sim?.restart();
    this.paused = false;
    this.ui.btnPause.textContent = "Pause";
    this.lastTs = 0;
  }

  private screenshot(): void {
    const url = this.scene.screenshot();
    const a = document.createElement("a");
    a.href = url;
    a.download = `flyby2-${Date.now()}.png`;
    a.click();
  }

  private onKey(e: KeyboardEvent): void {
    if (e.code === "Space") {
      e.preventDefault();
      this.togglePause();
    } else if (e.key === "r" || e.key === "R") {
      this.restart();
    } else if (e.key === "s" || e.key === "S") {
      this.screenshot();
    }
  }

  private onResize(): void {
    const parent = this.canvas.parentElement ?? document.body;
    this.scene.resize(parent.clientWidth, parent.clientHeight);
  }

  private loop = (ts: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    if (document.hidden) return;

    let dt = 0;
    if (this.lastTs > 0) dt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;

    if (!this.paused && this.sim) {
      const frame = this.sim.step(dt);
      this.scene.sync(frame);
      this.ui.aircraftLabel.textContent =
        this.aircraftNames[frame.aircraftIndex] ?? "-";
      this.ui.maneuverLabel.textContent = " - " + frame.maneuverName;
    }

    this.scene.render();

    this.fpsAcc += dt;
    this.fpsFrames += 1;
    if (this.fpsAcc >= 0.5) {
      const fps = this.fpsFrames / Math.max(this.fpsAcc, 1e-6);
      this.ui.fpsLabel.textContent = `${fps.toFixed(0)} fps`;
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
  };

  private setOverlay(text: string, pct: number): void {
    this.ui.overlay.classList.remove("hidden");
    this.ui.overlayText.textContent = text;
    this.ui.progressBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  }

  private hideOverlay(): void {
    this.ui.overlay.classList.add("hidden");
  }

  dispose(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
