# Light and reflections

The material combines transmission with a Fresnel-weighted environment reflection. Directional highlights and contact response use shared light state. The reflection map is independent from the background being refracted.

```ts
renderer.setLight(-0.6, -0.8);
renderer.configureLightMotion({ frequency: 3, damping: 1 });
renderer.setReflectionSource(environmentCanvas);
renderer.setReflectionRotation(Math.PI / 4);
surface.material({ reflection: 0.45, highlight: 0.6, ior: 1.52 });
```

`setReflectionSource` expects an equirectangular environment source. Rotation is in radians and wraps around the vertical axis. `updateReflection()` uploads modified map pixels; changing only rotation reuses the current texture. `setReflectionSource(null)` returns to a blurred reflected-background approximation. Context restoration recreates the map.

`bindEnvironmentLight(renderer, element)` maps pointer movement to a light direction and returns a binding with `dispose()`. Native hosts can pass their own sensor-derived directions. The library does not request motion sensor permission or camera access automatically.

## Keep optics and edge styling separate

Optical normals determine refraction and Fresnel response. The decorative shading normal is controlled separately by `bevel`. With `bevel:0`, the material retains lensing without raised bevel shading. `specularIntensity` and `specularWidth` independently retain a narrow illuminated edge. `edgeContrast` independently adjusts a narrow dark contour. A custom GLSL shader can replace either response entirely.

The standard environment lookup is not a 3D reflection scene. It cannot show objects absent from the map, calculate geometric occlusion or reproduce native HDR/EDR highlights. RGB output is clamped to RGBA8. For a different lighting model, use `shade` or a complete fragment program.

See the [live example](../examples/programmatic/) for rotating environments and the [gallery](../examples/gallery/) for material studies.
