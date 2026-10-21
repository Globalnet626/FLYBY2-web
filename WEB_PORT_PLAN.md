# FLYBY2 HTML5 port plan

## Goal and first milestone

Run the original autonomous flyby screensaver in a browser tab using an HTML canvas. The first milestone preserves the shipped aircraft, airport, six maneuvers, camera, ground grid, lighting, and smoke as closely as practical. It does not add player controlled flight or franchise themed assets. Aircraft appearance must be replaceable through data and materials later without changing the flight code.

Visual reference: [The Awesome Flyby2 Screensaver Running in 4K](https://www.youtube.com/watch?v=L1WvS3ufWgY). Use matching moments from this recording to check sky color, runway stability, camera framing, aircraft shading, and smoke/vapor trails during each maneuver. Capture frames or timecodes for reproducible comparisons.

## What is in the repository

- `flyby2/FLYBY.C` is the standalone program. It loads `FLYBY.INF`, randomly chooses an aircraft and one of six maneuvers, advances the aircraft at 100 world units per second, aims a stationary camera at it, and draws the scene each frame. The six maneuvers are straight, roll, loop, climb, eight, and 360 degree turn.
- `flyby2/ASMOKE.C` implements solid, wire, trail, and ribbon smoke. The supplied `FLYBY.INF` selects ribbon smoke. Vapor uses trail smoke.
- `flyby2/*.SRF` are text polygon aircraft and scenery models. Faces carry numeric colors; these are geometry and face colors, not texture skins. `flyby2/AIRPORT.FLD` places scenery and references `.PC2` runway/signal drawings and `.TER` terrain. `FLYBY.INF` lists 22 aircraft entries, a field, altitude 120, and the smoke mode.
- `impulse/src` supplies the old 3D renderer, model/field readers, math, and platform backends. `hotas`, `skyhawk`, and `aurora` are supporting legacy libraries. The current CMake targets use Win32, GDI, or Win32 OpenGL; the screensaver target also uses Windows APIs. There is no existing web target.
- `flyby2_s` is the Windows `.scr` variant with embedded data and substantially duplicated flyby logic. Use the standalone `flyby2` as behavioral source of truth and consult `flyby2_s` only to resolve differences.

## Technical approach

Create a separate `web/` TypeScript app with an HTML canvas and Three.js WebGL renderer. Keep original C and source assets untouched. Use an offline conversion script to read the repository's text asset formats and emit browser friendly JSON or binary geometry plus a manifest. Ship only converted files the page needs. Keep conversion deterministic so the original data remains the source of truth.

Use these boundaries:

1. **Content pipeline:** Parse `FLYBY.INF`; convert `.SRF` vertices, polygon indices, normals, and numeric face colors to meshes; convert `.FLD` placements, `.PC2` polygons, and `.TER` terrain to scene data. Resolve relative filenames without depending on Windows working directories. Report unsupported directives and malformed references instead of silently dropping them. Preserve source model name and per face material identity in the output.
2. **Simulation:** Implement a pure, renderer independent state machine for aircraft selection, spawn position, and each maneuver's ordered segments. Preserve the original 16 bit angle convention (65,536 units per revolution), movement speed, turn rates, segment distances, and per maneuver smoke emission. Use a seeded random generator in tests and optional debug mode for repeatable scenes.
3. **Presentation:** Render the selected aircraft and airport, sky/ground, blue grid, simple directional lighting, a camera that continuously looks at the aircraft, and smoke/vapor paths. Match the source's 640 × 480 framing as a reference while allowing a responsive canvas. Keep model geometry, material palette, and future livery overrides behind an `AircraftAsset`/`Appearance` interface; the simulation refers only to an aircraft ID and pose.
4. **Browser shell:** Load assets with progress/error feedback, start/stop the animation loop with `requestAnimationFrame`, handle resize and device pixel ratio, pause when the tab is hidden, and offer restart, pause, aircraft selection, and screenshot download. These controls should not change the default autonomous sequence.

## Implementation sequence and acceptance checks

### 1. Baseline and asset inventory

- Record screenshots or short clips from `binary/FLYBY2GL.exe` on a suitable Windows machine if it runs; otherwise use source behavior and the shipped data as the reference. Do not execute the binary just to inspect it.
- Inventory every directive used by the shipped `.SRF`, `.FLD`, `.PC2`, and `.TER` files, including nested references and unusual face records. Write down the source coordinate axes, polygon winding, color encoding, and projection behavior from `impulse/src` before committing the converter design.
- Acceptance: inventory identifies all referenced assets and the exact subset of each format required for the shipped scene.

### 2. Convert and display one aircraft

- Add the web scaffold and asset converter. Start with `F16.SRF`. Triangulate its polygons, retain normals and color/material groups, and render it from multiple angles with orbit/debug controls.
- Acceptance: no missing faces, mirrored geometry, or inverted lighting in front, side, top, and rear views. Conversion is repeatable and fails clearly on invalid input.

### 3. Port the flyby sequence

- Translate the six maneuvers into nonblocking segments updated once per animation frame. Clamp unusually large frame deltas after tab suspension. Preserve the source's angle and direction conventions, and use a fixed or bounded simulation timestep for stable motion.
- Acceptance: a selected aircraft completes all six maneuvers, transitions to the next flyby, and points the camera at the aircraft continuously. Deterministic tests check segment endpoints, angles, and smoke emission boundaries.

### 4. Convert and display the airport

- Convert `AIRPORT.FLD` and its `.SRF`, `.PC2`, and `.TER` dependencies. Render sky/ground, airport features, and the grid with depth ordering and colors close to the original.
- Acceptance: the two runways, buildings, tower, terrain, and signal drawings appear at their configured transforms; all referenced files resolve.

### 5. Smoke and browser polish

- Reproduce ribbon smoke and vapor trail first. Add the other smoke modes supported by `FLYBY.INF` once the default mode works. Bound trail history and GPU allocations so long sessions do not grow memory.
- Add responsive layout, loading and error states, keyboard/touch friendly controls, screenshot download, and a production build suitable for static hosting.
- Acceptance: the default sequence runs for at least 20 minutes without errors or growing memory, recovers after tab hide/show and resize, and works in current desktop Chrome, Firefox, and Edge. Check a mobile browser for basic display and controls.

## Later aircraft themes

Treat each aircraft as an ID with a mesh plus a named palette/material set. Preserve the original `.SRF` numeric face colors as the initial palette. The later appearance layer can map face/material groups to new colors, decals, or replacement meshes while keeping the maneuver engine and asset manifest unchanged. Since the current models contain colored polygons rather than UV mapped skins, detailed liveries may require UV mapping or new meshes; that is a separate phase after the port works. Review rights for any franchise names, logos, and artwork before distributing themed assets.

## Key risks and decisions to validate early

- Legacy asset parsing and color decoding are the largest unknowns. Probe every shipped file in phase 1, then implement only the directives actually used, with diagnostics for the rest.
- Original rendering used a custom projection and face shading. Compare a reproducible view against the Windows build where available, and prioritize recognizable shapes, colors, framing, and motion over pixel perfect output.
- The C loop busy waits on `clock()` and blocks inside maneuver functions. It cannot be transplanted into a browser main thread; the frame driven state machine is required.
- Screensaver specific Win32 code, native dialogs, and TIFF export are outside the web milestone. A canvas screenshot download covers the useful export behavior.

## Suggested web layout

```text
web/
  index.html
  src/
    app.ts                 # loading, controls, animation loop
    simulation/            # pose, maneuvers, seeded random
    rendering/             # scene, camera, smoke, materials
    assets/                # manifest and typed asset contracts
  tools/convert-assets.ts  # legacy text formats to web assets
  public/assets/           # generated assets
  tests/                   # converter and simulation fixtures
```

Build the converter and app in the clone, keep generated files traceable to their original names, and retain the repository's BSD 3 Clause notice in distributed builds.
