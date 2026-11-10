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

- `index.html` — the whole viewer (Three.js, Draco, UI). The five Toyota GLBs
  and the aftermarket 8-spoke wheel are embedded in it as base64 data.
- `assets/model/part-00.bin` … `part-24.bin` — the FL5 GLB split into 1 MiB
  parts (25 parts, 25,625,364 bytes total). The viewer downloads them and
  reassembles the file in memory byte-for-byte (SHA-256 verified) before
  parsing. The model file itself is never modified.

## Credits and licenses

- Honda Civic Type R FL5 "FL5 Custom" model by **blakebella** (Sketchfab),
  CC BY-NC-ND 4.0. Source: https://github.com/Liooo0/lio-fl5-3d
  (identical file, unmodified — only split into delivery parts). Honda, Civic,
  and Type R are trademarks of Honda Motor Co., Ltd. Unofficial fan project,
  not affiliated with or endorsed by Honda.
- Toyota models come from the author's Toyota showroom project
  (jnibarger01/toyota-showroom); check that repo for their per-model
  provenance. Toyota model names are trademarks of Toyota Motor Corporation.
  Unofficial fan project, not affiliated with or endorsed by Toyota.
- The viewer code and configuration are the author's own work.

Non-commercial use only for the FL5 model, per its CC BY-NC-ND 4.0 license.
Do not redistribute a modified copy of the FL5 GLB.
