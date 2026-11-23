# Validation

Local v0.10.0 verification covers **25 unit tests and 71 browser checks** on the hardware path below. NodeNext declarations, built ESM rendering, demo and host-asset builds are checked separately.

## Automated checks

```sh
npm run check
npm run build:demo
npm run build:hosts
npm pack --dry-run
```

The unit suite verifies spring integration, retargeting, physical spring conversion, geometry, Snell/Fresnel/TIR, planar exit intersections, absorption and spectral index equations. Browser checks exercise real shaders and pixels rather than mocked GPU calls.

Browser coverage includes refraction, layered glass/local content, free contours and holes, shape interruption, touch/drag outside the original hit box, pointer-capture fallback, semantic keyboard controls, text recoloring, context loss/restoration, shader rollback, custom uniforms/scattering and reduced-motion policy. Regression scenes cover fine patterns, a thin line and background crop/resize. Effect container tests cover stable identities, interruption and namespace isolation.

New checks measure actual rear-content foreground contrast, Clear on white, protection over black/white input, zero idle sampling, independent edge illumination at zero bevel, continuous size response, pending-work cancellation, fresh-data readiness and context recovery. New v0.9 regressions cover single-pixel dots/stripes, conservative insufficient-budget diagnostics, full-scattering dispersion, custom selection lift profiles and the optical study on desktop/mobile. The interactive examples are exercised through real controls.

Documentation checks verify page availability, navigation, generated reference tables and narrow-screen layout. The built package is loaded and rendered separately with `tools/check-package.mjs`. `tools/type-consumer.ts` compiles declarations in NodeNext mode independently of Vite.

The v0.10 control checks cover dense-to-glass thumb pixels, track composition, drag/cancel, single-commit events, keyboard input, RTL, disabled state, accessibility, responsive motion, minification and cleanup. Local-content tests also check same-size streaming and an equal-area dimension change. `npm run check:guides` compiles all 16 TypeScript examples from the four foundation guides against the built declarations.

## Hardware coverage

The local hardware path is Windows, Edge / ANGLE D3D11 on Intel UHD Graphics (0x9B41). Set `CHROMIUM_PATH` to an installed Chromium-family browser and `LIQUID_GLASS_GPU=1` for hardware tests. CI repeats build and browser checks on Ubuntu/Chromium. The GitHub Actions result is authoritative for each commit.

Windows WebView2 and Android WebView asset preparation are checked. Native SDK builds, Android GPU performance, HDR, energy use, long-duration thermal behavior and 120 Hz presentation are not validated by this suite. The optional native SwiftUI reference fixture has not been compiled in this Windows environment. The capture/comparison tooling is tested with web images; no matched native optical or motion error has been measured. Numeric CPU/GPU agreement establishes consistency of the implemented equations, not identity with a proprietary renderer.

## Resource-constrained development

Tests run with one worker. `NODE_OPTIONS=--max-old-space-size=192 --max-semi-space-size=2` limits Node heap use where necessary. Run builds, browser tests, benchmarking and recording sequentially. Production preview avoids file watching during recording. Generated documentation and artifact directories are excluded from development watchers.

The v0.10 control regressions verify dense versus refractive switch states, one change per user commit, programmatic updates without synthetic events, capture failure/cancellation, RTL, disabled state, native range semantics, minification, independent content opacity, narrow layouts, dark backgrounds and idle cleanup.
