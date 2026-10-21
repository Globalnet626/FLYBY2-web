# FLYBY2 asset inventory (web port phase 1)

Behavioral source of truth: `flyby2/FLYBY.C`, `flyby2/ASMOKE.C`, shipped data under `flyby2/`.
Renderer/math reference: `impulse/src` (`imodel.c`, `ifield.c`, `i2dpict.c`, `iterrain.c`, `icalc.c`).

## Coordinate / color / projection notes

| Topic | Convention |
|-------|------------|
| Axes | +X right, +Y up, +Z forward (local nose) |
| Attitude | `h` heading, `p` pitch, `b` bank; **65536 units / revolution** |
| Local¨global | bank (Z) ¨ pitch (X) ¨ heading (Y) |
| SRF face color | 15-bit **GRB555**: G\[14:10\] R\[9:5\] B\[4:0\] ¨ 8-bit ~255/31 |
| SRF winding | Faces with `N` are rewritten to LEFT twist vs normal |
| Projection | Std mag `wid/ã2`, flyby multiplies ~2 ¨ ~39‹ HFOV / ~29.7‹ VFOV at 640~480 |
| PC2 in field | Drawn after ?90‹ pitch onto ground; PLT stays upright |

## FLYBY.INF

- Field: `airport.fld`
- Smoke: `RIBBONSMOKE` (vapor forced to trail in code)
- Altitude: `120`
- Aircraft (22): `a6`, `angels`, `av8b`, `ea6b`, `f1`, `f117a`, `f14sprd`, `f14swbk`, `f15`, `f16`, `f18`, `f86blue`, `mig21`, `mig23spd`, `mig23wbk`, `mrg2000`, `su27`, `t2blue`, `t400`, `t4blue`, `thunder`, `viggen`

Present on disk but not listed: `TU160SPD.SRF`, `TU160WBK.SRF`.

## AIRPORT.FLD dependencies

| Kind | File | Notes |
|------|------|-------|
| PC2 | `runway.pc2` | 2 placements (headings 0 and ?9624) |
| SRF | `hanger.srf` | 3 placements |
| SRF | `tower.srf` | 1 placement |
| TER | `sample.ter` | 3~3 cells, 20~20 size |
| PLT | `signal.pc2` | 2 upright signals |
| RGN | inline `RW` | logic only, not drawn |

## Format directives required for shipped scene

- **SRF:** `SURF`, `V`, `F`/`C`/`N`/`V`/`BRI`/`E`, file `E`; `BAS` ignored
- **FLD:** `FIELD`, `SKY`, `GND`, `PC2`, `PLT`, `SRF`, `TER`, `RGN`, `FIL`, `POS`, `ID`, `TAG`, `ARE`, `END`, `ENDF`
- **PC2:** `Pict2`, `PLG`, `COL`, `VER`, `ENDO`, `ENDPICT`
- **TER:** `TerrMesh`, `NBL`, `TMS`, `BOT`/`RIG`/`LEF`/`TOP`, `BLO`, `END`

Regenerate machine-readable inventory with `npm run convert` ¨ `docs/asset-inventory.json`.
