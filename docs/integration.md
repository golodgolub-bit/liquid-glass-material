# Installation and platform integration

## Install

Download the package from [GitHub Releases](https://github.com/golodgolub-bit/liquid-glass-material/releases) and install it locally:

```sh
npm install ./liquid-glass-material-0.10.0.tgz
```

The package is an ESM distribution with TypeScript declarations and no runtime dependencies. It is not currently published to the npm registry.

```ts
import { GlassRenderer, bindElement, observeSize } from '@liquid-glass/material';
import '@liquid-glass/material/style.css';
const renderer = new GlassRenderer(canvas);
const stopSize = observeSize(renderer);
renderer.setBackdrop(backgroundCanvas);
const binding = bindElement(renderer, button, {
  id: 'action', radius: 24, material: { variant: 'regular' }
});
// On teardown:
binding.dispose(); stopSize(); renderer.dispose();
```

Place the canvas behind semantic DOM controls in a positioned, isolated container. Give it CSS width/height; `observeSize` updates renderer dimensions. Keep the canvas untransformed. Use a real button for keyboard and assistive technology support. Do not put duplicate text in both a DOM foreground and a captured local foreground.

## Supply the background

`setBackdrop` accepts HTMLCanvasElement, OffscreenCanvas, HTMLImageElement or HTMLVideoElement. The source is stretched to the viewport. Crop into a source canvas first, or use `bindMediaBackdrop(renderer,media,{fit:'cover'})` for coordinated cover/contain fitting. After changing a canvas, call `updateBackdrop()`; unchanged frames reuse the texture.

Decoded video frames use `requestVideoFrameCallback` through `bindVideo`; source painting should follow video decoding, not an unrelated permanent loop. Draw ImageBitmap/ImageData/VideoFrame into a canvas before supplying them. Remote images need compatible CORS headers.

`bindDomBackdrop` is an experimental progressive enhancement using HTML-in-Canvas when supported. Check `supportsDomBackdrop()` before enabling it. Arbitrary DOM capture is not a universally available browser feature. A CSS fallback preserves basic controls but does not reproduce the GPU optics.

## React and other frameworks

Create the renderer once in a mount effect, bind semantic elements after layout, refresh bindings after geometry changes, and dispose everything during teardown. Keep a single shared renderer for a scene. Framework state can drive `GlassEffectContainer.reconcile()` with stable IDs. Do not create a new renderer on every component render.

## Windows

`examples/windows` hosts the built assets with WebView2. `npm run build:hosts` copies the ESM bundle and CSS into `WebAssets`. Build the C# project with the required .NET and WebView2 tooling. Native background pixels must be supplied by a host capture bridge; a web shader cannot sample unrelated native windows.

## Android

`examples/android` loads the same renderer in a hardware-accelerated WebView. `npm run build:hosts` prepares its assets. Build with the Android SDK/Gradle toolchain and test on the actual target GPU. The library is a web/WebView engine, not a Jetpack Compose rendering backend. Android performance and energy consumption require device validation.

## Build from source

```sh
npm ci
npm run dev
npm run check
npm run build:demo
npm run build:hosts
npm pack
```

`dist` contains the package, `dist-demo` the static demo and documentation. Native host assets are prepared by the build; native SDK compilation is a separate step. See [Performance](performance.md) before selecting a viewport, DPR and layer budget.
