# Size, scattering and edge response

The material exposes optical shape, edge light, dark contour and size response separately. These are independently selected implementation parameters. They are not extracted coefficients from Apple's renderer.

## Separate illumination from embossing

| Parameter | Meaning | Default |
|---|---|---:|
| `bevel` | Optional raised surface lighting | 0 |
| `specularIntensity` | Narrow directional edge-light strength | 0.55 |
| `specularWidth` | Edge-light decay width in CSS pixels | 1.4 |
| `edgeContrast` | Dark boundary strength | See material preset |
| `edgeWidth` | Optical normal/refraction falloff width | See material preset |
| `highlight` | Overall directional lighting multiplier | See material preset |

A zero bevel preserves ray displacement and specular edge illumination. Increasing `specularWidth` broadens the bright edge without changing optical normals or creating a raised center. `edgeContrast` remains independent. `highlight: 0` suppresses directional highlights, including edge light. Environment reflection has its own `reflection` coefficient and map.

```ts
glass.material({
  bevel: 0, specularIntensity: 0.65, specularWidth: 1.8,
  edgeContrast: 0.12, edgeWidth: 12
});
```

## Geometry drives effective material

Size adaptation is enabled by default. A small reference surface has area 5,760 CSS square pixels (for example, 120×48). Above that area, growth is `max(0, log2(sqrt(area / referenceArea)))`. Thickness, refraction reach, shadow strength/radius and scattering radius scale continuously with this growth and stay within public material ranges. Frost approaches one smoothly; Clear uses one fifth of the Regular frost growth to preserve its clearer character. Smaller surfaces retain the base material.

| Gain | Default |
|---|---:|
| thickness | 0.30 |
| refraction | 0.15 |
| frost | 0.18 |
| shadow | 0.35 |
| shadowRadius | 0.35 |
| scatterRadius | 0.22 |

Adaptation uses the current spring geometry, including intermediate frames. A union uses the occupied union area of its member rectangles: overlaps count once and empty gaps do not make the material thicker. Rounded corners, free contours and SDF bridges are not measured by this rectangular estimate. This remains a general response model, rather than calibrated button/menu/sidebar profiles. Explicit deformation callbacks can change visual geometry independently and do not redefine this material scale.

```ts
glass.sizeAdaptation({ referenceArea: 120 * 48, thickness: 0.4, frost: 0.12 });
glass.move({ width: 460, height: 280 });
console.log(glass.state.baseMaterial); // current material springs, before size response
console.log(glass.state.material);     // effective parameters sent to the GPU
glass.sizeAdaptation(false);           // fixed optical parameters for calibration/artwork
```

`SurfaceOptions.sizeAdaptation` and `GlassEffectContainerOptions.sizeAdaptation` accept the same profile or `false`. Union members must use the same profile. `createSizeAdaptation`, `defaultSizeAdaptation` and `resolveMaterialForSize` are exported for custom components. Zero gains disable selected responses without disabling the others. The base material remains immutable; repeated resizing does not accumulate changes.

## Scattering and environmental color

`frost` controls scattering amount with a smooth normalized exponential across its entire 0–1 range. `scatterRadius` independently selects an approximate width between the sharp source and two cached Gaussian levels. This avoids the former hard transition that removed all sharp input at frost 0.52. Width is an interpolation of cached kernels, not a newly generated Gaussian or volumetric simulation for each surface.

`shadowRadius` and `shadowOffset` control screen-space shadow falloff and displacement. `ambientSpill` introduces a small blurred-background chroma contribution to Regular and tints its dark shadow toward local background color. It approximates environmental coupling; it is not spatial indirect-light transport or a colored 3D caustic. Set it to zero for isolated optical measurements.

All numeric fields animate through the material spring and are available in the shader ABI: `edgeFinish = (specularIntensity, specularWidth, shadowRadius, shadowOffset)` and `diffusion = (scatterRadius, ambientSpill)`. See [Programming the material](programmability.md) for full-pass replacements.

## Custom footprint estimates

`measureMaterialFootprint(rectangles)` returns `{width, height, area}` with exact axis-aligned rectangle union area, including negative coordinates. `resolveMaterialForSize(base, {width, height, area}, profile)` accepts an optional silhouette area supplied by the application; it must be positive and no larger than the bounding rectangle. Omitting area retains `width * height`. This lets custom components use a known SVG/mesh footprint instead of counting large empty regions. The renderer uses member-rectangle union area by default.
