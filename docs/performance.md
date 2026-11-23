# Performance

## v0.8: composited readability enabled

23 November 2026, Windows / Edge / Intel UHD Graphics (0x9B41), ANGLE D3D11; 800x500 at DPR 1. Each scene has 60 measured frames after warmup. Both runs enable default composited contrast probes (15 Hz maximum during continuous changes) and size response. The spectral run additionally enables Vd=58. Empty rAF median is 16.7 ms.

| Scene | Default GPU median | Spectral GPU median | Default frame p95 | Spectral frame p95 | Default CPU median / p95 |
|---|---:|---:|---:|---:|---:|
| One surface | 0.53 ms | 0.55 ms | 20.1 ms | 18.9 ms | 1.1 / 4.5 ms |
| 8 disjoint | 1.09 ms | 1.17 ms | 25.9 ms | 19.7 ms | 4.7 / 13.6 ms |
| 24 disjoint | 2.36 ms | 2.54 ms | 23.7 ms | 24.2 ms | 2.3 / 9.1 ms |
| 3 stacked | 2.24 ms | 2.28 ms | 18.5 ms | 21.6 ms | 0.5 / 2.2 ms |
| 8 stacked | 7.12 ms | 7.18 ms | 19.9 ms | 19.5 ms | 1.0 / 4.4 ms |

Both runs recorded one backdrop upload and zero idle frames. Raw reports include contrast-copy/readback counters: [default](benchmarks/v0.8-hardware.json), [spectral](benchmarks/v0.8-spectral-hardware.json). GPU medians remain close to the earlier optical baseline, but CPU readback and processing have a measurable cost. Several p95 intervals exceed 16.67 ms; this is not evidence of guaranteed 60/120 Hz or native-device parity. The short runs also contain scheduling and warmup noise.

`RendererOptions.contrastInterval` controls the latency/cost tradeoff; zero samples every dirty frame and is more expensive. `readability: false` removes this subsystem for custom foreground pipelines. Initial/explicit readiness and necessary stronger protection can bypass the interval. Avoid interpreting the sampling rate as the animation rate. Geometry and optics are rendered every active presentation frame. Regional sampling uses nonblocking fences but still incurs driver and CPU overhead.

## v0.7: default and spectral optics

23 November 2026, Windows / Edge / Intel UHD Graphics (0x9B41), ANGLE D3D11. Viewport 800x500 at DPR 1; 60 measured frames per scene. Empty rAF median: 16.7 ms in both runs. The spectral run enables Vd=58; both runs use the same background and moving geometry.

| Scene | Default GPU median | Spectral GPU median | Default frame p95 | Spectral frame p95 |
|---|---:|---:|---:|---:|
| One surface | 0.53 ms | 0.55 ms | 18.6 ms | 17.1 ms |
| 8 disjoint | 1.03 ms | 1.08 ms | 19.0 ms | 17.3 ms |
| 24 disjoint | 2.13 ms | 2.30 ms | 19.2 ms | 17.4 ms |
| 3 stacked | 2.24 ms | 2.29 ms | 22.1 ms | 19.3 ms |
| 8 stacked | 7.10 ms | 7.25 ms | 18.3 ms | 20.3 ms |

Both runs recorded zero idle frames and one background upload. Raw reports: [default](benchmarks/v0.7-hardware.json), [spectral](benchmarks/v0.7-spectral-hardware.json). Separate short runs contain scheduling noise: a lower frame p95 must not be interpreted as a faster shader. Several p95 values exceed the 16.67 ms budget; mobile and 120 Hz performance remain unverified.

## Measured hardware baseline

Windows, Intel UHD Graphics (0x9B41), Edge / ANGLE D3D11; 800×500 CSS pixels at DPR 1. Each scene uses 60 measured frames after warmup. Baseline empty requestAnimationFrame: median 16.7 ms, p95 16.8 ms.

| Scene | GPU median | GPU p95 | Frame median | Frame p95 | CPU median |
|---|---:|---:|---:|---:|---:|
| One surface | 0.54 ms | 0.56 ms | 16.70 ms | 18.00 ms | 0.90 ms |
| Eight disjoint | 1.01 ms | 1.02 ms | 16.60 ms | 18.90 ms | 3.10 ms |
| Twenty-four disjoint | 2.06 ms | 2.09 ms | 16.60 ms | 18.50 ms | 3.10 ms |
| Three stacked | 2.25 ms | 2.27 ms | 16.70 ms | 18.40 ms | 1.20 ms |
| Eight stacked | 7.11 ms | 7.83 ms | 16.60 ms | 19.80 ms | 0.90 ms |

These are the [v0.6 raw measurements](benchmarks/v0.6-hardware.json), retained as a baseline rather than relabeled as newer-version results. Default screen-space optics were used; optional Cauchy dispersion and custom shaders were not measured in this series. Zero idle frames and one background upload were recorded. The interval p95 exceeds a 60 Hz frame budget; these results are not a guarantee of smooth presentation on every device.

## Architecture choices

- One shared context and background, not a renderer per button.
- Cached dense Gaussian scattering, recalculated when input changes.
- Analytic distance gradients and a fast path for single surfaces.
- Scissor bounds restrict glass rendering to affected regions.
- Disjoint groups share cached textures; overlapping layers require additional snapshots and scattering.
- Reflection rotation and uniform changes do not re-upload source images.
- SVG fields are generated once and uploaded once per contour.
- Contrast uses a bounded asynchronous pixel-pack-buffer readback; no direct CPU `readPixels`, blocking fence waits or per-frame `getError` calls.
- Contrast sampling has an independent configurable interval; geometry still updates every presentation frame.
- Effective material values are cached within a frame and invalidated by geometry/material changes.
- A demand-driven scheduler sleeps after springs and programs stop.
- Low quality disables chromatic sampling and limits DPR.

## Measure your scene

`npm run benchmark:hardware` selects Edge/D3D11 on Windows; `npm run benchmark` uses the available browser default. The report records the actual backend, GPU timers where supported, CPU submission time, frame intervals, texture estimates and idle frames. A software renderer must not be mistaken for hardware GPU performance.

GPU timings exclude parts of DOM layout and browser composition. Frame intervals include scheduling noise. Test p95/dropped frames, decoded video updates, scrolling and thermal behavior on the target device. At 60 Hz the interval budget is 16.67 ms; at 120 Hz it is 8.33 ms.

Reduce affected area, DPR, source resolution, overlapping depth and independent containers first. Keep a single renderer per scene and update sources only when pixels change. Arbitrary custom GLSL can exceed the default performance budget. No equality of performance with native iOS/iPadOS is claimed.
