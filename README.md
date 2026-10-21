# FLYBY2 — HTML5 port

A browser port of [Soji Yamakawa's FLYBY2](https://github.com/captainys/FLYBY2)
autonomous aircraft screensaver, built with TypeScript and Three.js. The original
native sources and Git history are preserved alongside the port in `web/`.

## Run locally

Use Node.js 22.12 or newer and npm.

```sh
cd web
npm ci
npm run convert
npm run dev
```

Open the address printed by Vite, normally `http://localhost:5173/`.
The aircraft gallery is at `/aircraft-gallery.html`; append
`?aircraft=f22mobius` for six fixed views of the F-22.

## Features

- Autonomous flybys, aircraft selection, smoke trails, and exhaust effects.
- The 22 original aircraft entries plus seven custom variants: F-4 Mobius,
  F-15 Cipher and Pixy, Su-27 Yellow 13, F/A-18 Joker, F-14A Queen, and F-22 Mobius.
- Flat-shaded aircraft and simplified squadron markings to match the port's aesthetic.

## Verify and build

```sh
cd web
npm test
npm run build
npm run preview
```

The build converts the source assets, checks TypeScript, and writes the static
site to `web/dist/`. Dependencies, converted JSON, builds, and exported gallery
renders are generated locally and excluded from Git.

## GitHub repository

This port is at [Globalnet626/FLYBY2-web](https://github.com/Globalnet626/FLYBY2-web)
on the `web-port` branch, which is the default branch. The original repository
is retained as the `upstream` remote. GitHub Actions runs the web tests and
production build for pushes and pull requests. Publishing the site itself is a
separate step.

## Attribution and assets

The original FLYBY2 code and assets retain Soji Yamakawa's BSD 3-Clause
[license](LICENSE). See [asset provenance](web/source-assets/f22/README.md) for
the separately supplied F-22 model; its archive did not include an author or
license statement. Ace Combat-inspired names and emblems are fan adaptations,
not an official release. The original BSD notice does not grant rights to those
separately sourced materials.

See [web documentation](web/README.md) for controls and source layout.
