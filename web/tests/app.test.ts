import { afterEach, describe, expect, it, vi } from "vitest";
import { FlybyApp } from "../src/app";

afterEach(() => vi.unstubAllGlobals());

describe("embed API readiness", () => {
  it("signals the window and parent after publishing the API", () => {
    const parent = { postMessage: vi.fn() };
    const win = Object.assign(new EventTarget(), { parent, flyby: undefined as unknown });
    vi.stubGlobal("window", win);
    vi.stubGlobal("CustomEvent", class extends Event {});
    const onReady = vi.fn(() => expect(win.flyby).toBeDefined());
    win.addEventListener("flyby:ready", onReady);

    const app = Object.create(FlybyApp.prototype) as FlybyApp;
    app["publishEmbedApi"]();

    expect(onReady).toHaveBeenCalledOnce();
    expect(parent.postMessage).toHaveBeenCalledWith({ type: "flyby:ready" }, "*");
  });

  it("does not message itself outside an embed", () => {
    const win = Object.assign(new EventTarget(), { parent: null as unknown, postMessage: vi.fn() });
    win.parent = win;
    vi.stubGlobal("window", win);
    vi.stubGlobal("CustomEvent", class extends Event {});

    const app = Object.create(FlybyApp.prototype) as FlybyApp;
    app["publishEmbedApi"]();

    expect(win.postMessage).not.toHaveBeenCalled();
  });

  it("still notifies the parent if local dispatch fails", () => {
    const parent = { postMessage: vi.fn() };
    const win = Object.assign(new EventTarget(), { parent });
    vi.spyOn(win, "dispatchEvent").mockImplementation(() => {
      throw new Error("dispatch blocked");
    });
    vi.stubGlobal("window", win);
    vi.stubGlobal("CustomEvent", class extends Event {});

    const app = Object.create(FlybyApp.prototype) as FlybyApp;
    expect(() => app["publishEmbedApi"]()).not.toThrow();
    expect(parent.postMessage).toHaveBeenCalledWith({ type: "flyby:ready" }, "*");
  });
});
