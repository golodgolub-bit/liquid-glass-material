# Edge quality and thin contours

## What caused the narrow-feature ridge

An optical roll width derived only from an enclosing rectangle can exceed the thickness of a glyph stroke or the neck between merged shapes. Opposing normals then meet before the roll becomes flat. That creates a raised-looking central ridge even when decorative `bevel` is zero.

The default material now estimates the opposite boundary along the inward normal for free contours and unions. It shortens the optical roll across narrow features, while retaining refraction near the boundary. Raster fields smooth normal derivatives without moving coverage, preserve their magnitude at medial axes, and distance scaling is independent of that magnitude. Edge light also fades when the gradient cancels.

`edgeAdaptation` is a programmable blend in [0,1], default 1. Zero retains the enclosing-rectangle optical reach for an intentionally rounded lens. This is a stability rule selected for this renderer, not a recovered Apple equation. It adds a field lookup in the affected edge region; benchmark complex unions on the target GPU.

## Inspect the optical normal

```ts
renderer.setShader(createGlassShader({
  shade: 'return vec3(normal.z);'
}));
// Restore the production material after inspection.
renderer.setShader(null);
```

A flat interior has a forward normal and appears white in this diagnostic. Inspect thin strokes, holes, concave necks, merging surfaces and intermediate morph frames. The diagnostic replaces shading, not the field or refraction kernel. A deliberate custom optics hook can produce another surface profile.

## Resolution and aspect ratio

Use the lowest contour resolution that preserves the intended outline at its displayed size. Cache shapes; do not rasterize text or run a distance transform in an animation callback. Prefer per-glyph contours for large clocks. Keep the original aspect ratio where precision matters: distance correction under nonuniform scaling is an approximation, not a newly evaluated exact Euclidean distance field.

All active shape layers use the maximum requested atlas resolution. At 1024, one RGBA8 layer costs 4 MiB before CPU caches; many distinct high-resolution shapes can be expensive. Identical object references share a GPU layer. Temporary shapes retained during a morph also occupy layers.

The packed field stores signed distance in RG and signed derivative components in BA. BA uses integer bias 128 and scale 127, preserving an exact zero. Full replacement shaders that decode the shape atlas must use the current encoding; template hooks and `shaderSources.glass` already do so.

## Other sources of a raised appearance

Reflection maps, magnification, explicitly enabled bevel, wide highlights and press deformation can all change the impression of curvature. Tune them independently. Check a uniform backdrop before changing optics, then a thin-line and checkerboard source before evaluating photographs. Keep a comparison frame and add a pixel regression for a reproduced artifact.
