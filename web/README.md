# FLYBY2 Web Port

Browser port of the autonomous FLYBY2 screensaver: HTML canvas + Three.js, with an offline converter for the original text assets.

Original C sources and data under `../flyby2` are left untouched. Converted JSON is written to `public/assets/`.

## Setup

```bash
cd web
npm ci
npm run convert
npm run dev
```

Open the URL Vite prints (default http://localhost:5173).

Open `/aircraft-gallery.html` to view all 29 aircraft entries, including seven
custom variants. Use `?aircraft=f22mobius` for six views of one aircraft.
Local PNG exports in `aircraft-renders/` are not committed.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run convert` | Parse FLYBY.INF, .SRF, .FLD, .PC2, .TER into `public/assets` |
| `npm run dev` | Dev server |
| `npm run build` | Convert + typecheck + production bundle in `dist/` |
| `npm test` | Converter and simulation tests |

## Controls

- Pause / Resume (Space)
- Restart (R)
- Aircraft select (optional; default stays random each flyby)
- Screenshot (S) - PNG download

## Layout

```text
web/
  index.html
  src/
    app.ts / main.ts
    simulation/     # pose, maneuvers, seeded RNG, smoke state
    rendering/      # Three.js scene, camera, smoke meshes
    assets/         # manifest types + loader
  tools/            # offline converters
  public/assets/    # generated (do not edit by hand)
  tests/
```

## License

The original code and assets retain the repository BSD 3-Clause notice
(Copyright 2022 Soji Yamakawa). See `LICENSE` and the root README for the
separate provenance of the supplied F-22 and fan-inspired markings.
