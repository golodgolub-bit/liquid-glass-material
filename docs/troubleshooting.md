# Troubleshooting

## The glass does not distort the page

Supply the content as a backdrop texture. A canvas shader cannot read arbitrary DOM or native windows behind it. Use a source canvas, media binding, host capture bridge or supported HTML-in-Canvas path. CSS backdrop blur does not provide the same optical path.

## Repeated stripes or a blurred grid

Update to the dense-scattering implementation. A sparse stretched blur kernel creates repeated copies of fine lines. Check whether a visible grid is actually part of the source calibration image. The regression suite separately tests checkerboards and thin lines.

## A bright raised edge

Set `bevel:0`. Refraction width, bevel shading and contour contrast are independent. Keep `magnification:1` for a flat interior. A custom shader or a strongly distorted calibration background can still produce optical structure; test the finish against a flat background separately.

## Dragging stops outside the control

Use `bindDrag` on a semantic element with `touch-action:none`. It retains pointer capture and falls back to window routing if capture is refused. Do not replace the element during the drag. Dispose old bindings before remounting controls. CPU hit tests follow the actual SVG contour and custom rectangular deformation.

## Text changes color outside the lens

Clear the mask outside the intended ink and align its dimensions with the backdrop. Use a transparent mask, not an opaque screenshot of the full page. Enable `vibrancy` only on surfaces that should apply the selected color.

## The foreground appears twice

Choose one visible foreground path. Local content can be painted into a surface; an accessible DOM counterpart can remain semantic without duplicating the visible pixels. A selection mask should not become a second sharp text image over strongly scattered text.

## A shader fails to compile

Inspect the error returned by `setShader`. Managed uniforms need the `uGlass_` prefix and matching GLSL types. Preserve the standard sampler ABI in full fragments. Failed replacement leaves the prior program active. Use `setShader(null)` to restore defaults.

## Context loss or excessive memory

Context restoration recreates sources, geometry and the shader pipeline. Avoid repeated renderer construction. Dispose textures/bindings through the public lifecycle. Reduce viewport, DPR and overlapping glass depth. Each additional rear-layer dependency can require more full-size targets and scattering passes.

## The scene keeps rendering at rest

Pause or cancel continuous animation programs. Stop external source-update loops. Keep all material/physics values finite and allow springs to settle. A changing video source legitimately requires fresh capture and scattering.

## Native hosts look different

Confirm hardware WebGL 2, source orientation, device pixel ratio, WebView version, color assumptions and native capture timing. The package is not a native WinUI/Compose shader backend. Use the platform examples as integration starting points and profile on real devices.
