# 3D Car Viewer

Interactive Three.js vehicle viewer — a dark studio-style showroom with orbit/zoom,
OEM factory paints, wheel finishes, accessories, trim packages with MSRPs and a
running Build Total, plus main / customization / technical views, X-ray and
exploded views, turntable, and ride-height control.

Live site: https://jnibarger01.github.io/3D-car-viewer/ (GitHub Pages, `main` branch)

## Lineup

- Honda Civic Type R (FL5) — default
- Toyota 4Runner TRD Pro (2024), Camry, GR Supra, Land Cruiser 250, RAV4 Hybrid

## How it runs

Open `index.html` from a web server (GitHub Pages serves it). It will not work
from `file://` — the FL5 model is fetched in parts (see below).

- `index.html` — the viewer (Three.js r186, UI). Toyota GLBs and the
  aftermarket wheel are not in this file; they load from `assets/models/`.
- `assets/models/` — 4Runner, Camry, GR Supra, Land Cruiser 250, RAV4 Hybrid,
  and the 8-spoke wheel. Same bytes that used to be embedded in the page.
  Attribution for each file is in `assets/models/README.md` and in the
  on-page credit.
- `assets/draco/` — Draco **1.5.6** glTF decoder from three.js r186
  (`examples/jsm/libs/draco/gltf/` at commit `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`;
  the decoder bytes are three.js commit `a79f0788dced39e925d001a9566931f03d984951`).
  See `assets/draco/README.md` for SHA-256. The page fetches
  `draco_wasm_wrapper.js` and `draco_decoder.wasm` (asm.js `draco_decoder.js`
  is the fallback).
- `assets/model/part-00.bin` … `part-24.bin` — the FL5 GLB split into 1 MiB
  parts (25 parts, 25,625,364 bytes total). The viewer downloads them and
  reassembles the file in memory byte-for-byte before parsing. The model
  file is the unmodified Sketchfab GLB, including the original 4096×2048
  license-plate PNG. A SHA-256 check is not implemented in the page.

## Credits and licenses

- Honda Civic Type R FL5 "FL5 Custom" model by **blakebella** (Sketchfab),
  CC BY-NC-ND 4.0. Source: https://github.com/Liooo0/lio-fl5-3d
  (identical file, unmodified — only split into delivery parts). Honda, Civic,
  and Type R are trademarks of Honda Motor Co., Ltd.
  Unofficial fan project, not affiliated with or endorsed by Honda.
- Toyota models come from the author's Toyota showroom project
  (jnibarger01/toyota-showroom); check that repo for their per-model
  provenance. Toyota model names are trademarks of Toyota Motor Corporation.
  Unofficial fan project, not affiliated with or endorsed by Toyota.
- The viewer code and configuration are the author's own work.

Non-commercial use only for the FL5 model, per its CC BY-NC-ND 4.0 license.
Do not redistribute a modified copy of the FL5 GLB. Attribution stays in the
page credit and in the GLB `asset.extras`.
