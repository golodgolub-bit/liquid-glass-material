# Dispersion and colored edges

Thin blue/cyan and yellow/red fringes can occur when a refracted image is sampled at slightly different positions for different wavelengths. At a black/white transition, unequal RGB coverage produces complementary colors; a colored outline is not necessarily a colored light or a tinted bevel. In physical glass, wavelength-dependent index causes dispersion. See [Physically Based Rendering: Specular Reflection and Transmission](https://www.pbr-book.org/4ed/Reflection_Models/Specular_Reflection_and_Transmission).

A recording alone cannot identify a proprietary compositor's exact implementation. Source colors, reflection, antialiasing, display scaling and video chroma subsampling can also alter a thin edge. Compare neutral test patterns at native pixel scale before selecting coefficients. Apple's [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/) describes lensing and environmental response; it does not supply a spectral index curve to copy.

![Clear, Regular and diffuse transmission with amplified artistic separation, rendered by the optical study](images/dispersion.jpg)

Run `/examples/dispersion/` to drag the lenses, switch models and adjust separation. The illustration uses artistic separation 2 to make the mechanism visible; the library default is 0.35. Recreate it with `node tools/capture-dispersion.mjs`.

## Two programmable models

```ts
// Subtle artistic RGB separation. Zero removes it.
surface.material({ dispersion: 0.35, abbeNumber: 0 });

// Wavelength-dependent refractive indices; replaces artistic separation.
surface.material({ ior: 1.5168, outsideIor: 1, abbeNumber: 64.17 });

console.log(spectralIndices(1.5168, 64.17)); // red, green, blue indices
```

The artistic mode offsets red/blue around the green ray. Positive Abbe Vd instead traces the optical kernel separately at C, d and F wavelengths using a two-term Cauchy approximation. Smaller positive Vd produces stronger dispersion. These are independently programmable models, not recovered Apple material constants. Both use RGB rather than a continuous spectral integrator.

## Scattering retains wavelength coordinates

Sharp, near-scattered and wide-scattered transmission use the same red, green and blue ray coordinates. Raising `frost` changes the transmitted image bandwidth without switching dispersion off. Broad diffusion naturally softens fringes; it should not abruptly replace wavelength-dependent coordinates with one achromatic lookup. At `frost: 1`, browser regression tests verify colored edges in both artistic and Cauchy modes over an otherwise neutral source.

`bevel`, `specularIntensity` and `edgeContrast` are separate. A colored refracted edge does not require raised surface shading. `dispersion: 0, abbeNumber: 0` removes wavelength separation while preserving ordinary lensing, reflections and source colors. Matching `ior` and `outsideIor` removes index-driven displacement. Low quality disables chromatic sampling to reduce texture fetches.

## Test a defined target

Use a black/white edge, colored bars and fine text. Hold geometry, DPR, scattering and refraction fixed. Toggle dispersion before adjusting it. Then test bright and dark photography and motion. High refraction can reach the kernel's displacement limit, reducing the difference between wavelength paths; increasing dispersion is not a substitute for selecting a suitable optical profile.

See [Ray optics](ray-optics.md), [Material response](material-response.md) and the [matched-capture protocol](comparison.md). Exact native optical and motion equivalence remains unmeasured until matched captures are available.
