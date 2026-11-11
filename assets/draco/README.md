# Draco decoder

These three files are the glTF Draco decoder shipped with **three.js r186**
(`revision:"186"` in the three.js build embedded in `index.html`).

- Draco version: **1.5.6**
- Source path: `examples/jsm/libs/draco/gltf/` at three.js tag **r186**
  (commit `9b4a2ac29c63ccb43fd51c5661f2f873ac2c39b8`)
- URL: https://github.com/mrdoob/three.js/tree/r186/examples/jsm/libs/draco/gltf
- Bytes produced by three.js commit `a79f0788dced39e925d001a9566931f03d984951`
  (`DRACOLoader: Update Draco decoders to v1.5.6`, #25475, 2023-02-10) and
  unchanged on the r186 tag
- License: Apache-2.0 (Google Draco). The three.js loader that consumes the
  decoder is MIT.

| File | Role | SHA-256 |
| --- | --- | --- |
| `draco_wasm_wrapper.js` | Emscripten JS wrapper | `8bb2952d2ba7d67e1414f8df819410cb0434a666be53f671fff75f68843d76f6` |
| `draco_decoder.wasm` | WebAssembly decoder | `a680d927bed9cb864ddbd63521868891af2bfbe755092761b4837487618df8ac` |
| `draco_decoder.js` | asm.js fallback | `8625489da79a805f4f2a7d511c3e52d8b4085608a9d2a4d5f4f9de5db0aea04f` |

The wrapper's own default wasm filename is `draco_decoder_gltf.wasm`. The page
shim fetches `assets/draco/draco_decoder.wasm` and passes those bytes in as
`wasmBinary`, so the file on disk uses the name the shim already requested.
The asm.js file is only loaded when `WebAssembly` is missing.
