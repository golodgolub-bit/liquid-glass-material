# Validation

Local v0.7 verification passed **21 unit tests and 48 browser checks** on the hardware path below. NodeNext declarations, built ESM rendering, demo and host-asset builds are checked separately.

## Automated checks

```sh
npm run check
npm run build:demo
npm run build:hosts
npm pack --dry-run
```

The unit suite verifies spring integration, retargeting, physical spring conversion, geometry, Snell/Fresnel/TIR, planar exit intersections, absorption and spectral index equations. Browser checks exercise real shaders and pixels rather than mocked GPU calls.

Browser coverage includes refraction, layered glass/local content, free contours and holes, shape interruption, touch/drag outside the original hit box, pointer-capture fallback, semantic keyboard controls, text recoloring, context loss/restoration, shader rollback, custom uniforms/scattering and reduced-motion policy. Regression scenes cover fine patterns, a thin line and background crop/resize. Effect container tests cover stable identities, interruption and namespace isolation.

Documentation checks verify page availability, navigation, generated reference tables and narrow-screen layout. The built package is loaded and rendered separately with `tools/check-package.mjs`. `tools/type-consumer.ts` compiles declarations in NodeNext mode independently of Vite.

## Hardware coverage

The local hardware path is Windows, Edge / ANGLE D3D11 on Intel UHD Graphics (0x9B41). Set `CHROMIUM_PATH` to an installed Chromium-family browser and `LIQUID_GLASS_GPU=1` for hardware tests. CI repeats build and browser checks on Ubuntu/Chromium. The GitHub Actions result is authoritative for each commit.

Windows WebView2 and Android WebView asset preparation are checked. Native SDK builds, Android GPU performance, HDR, energy use, long-duration thermal behavior and 120 Hz presentation are not validated by this suite. Numeric CPU/GPU agreement establishes consistency of the implemented equations, not identity with a proprietary renderer.

## Resource-constrained development

Tests run with one worker. `NODE_OPTIONS=--max-old-space-size=192 --max-semi-space-size=2` limits Node heap use where necessary. Run builds, browser tests, benchmarking and recording sequentially. Production preview avoids file watching during recording. Generated documentation and artifact directories are excluded from development watchers.
