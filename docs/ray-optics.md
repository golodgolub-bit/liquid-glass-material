# Ray optics and refractive indices

The standard renderer uses screen-space lensing. An optional two-interface tracer offers a physically interpretable transmitted path through planar entry/exit interfaces. The two models are separate: neither is presented as Apple's unpublished shader.

## Define the media

```ts
surface.material({
  ior: 1.52,
  outsideIor: 1.0,
  abbeNumber: 58,
  absorption: absorptionFromTransmittance([0.94, 0.98, 0.99], 20)
});
```

`ior` is the absolute glass index at the Fraunhofer d line (587.5618 nm). `outsideIor` is the surrounding medium. Refraction depends on their ratio; matched indices remove interface bending and Fresnel reflection. The default 1.48 is an independently chosen rendering parameter, not a measured Apple constant.

With `abbeNumber:0`, the artistic `dispersion` parameter offsets RGB samples. A positive Vd uses a two-term Cauchy approximation instead: red at 656.2725 nm, green at 587.5618 nm and blue at 486.1327 nm. `refractiveIndexAtWavelength(nd, Vd, wavelengthNm)` accepts visible wavelengths 380–780 nm; `spectralIndices(nd,Vd)` returns the three RGB indices. This is an RGB approximation, not a continuous spectral renderer. Abbe animation interpolates reciprocal Vd, so enabling dispersion grows smoothly from zero. Low quality disables chromatic sampling.

`absorption` is an RGB extinction coefficient per CSS pixel. `absorptionFromTransmittance(rgb, distance)` converts a desired transmission at a reference distance into coefficients. The renderer attenuates the transmitted/scattered background according to the optical path; UI tint is a separate artistic operation.

## CPU ray helpers

```ts
import { traceSlabRay, refractRay, fresnelReflectance } from '@liquid-glass/material';
const path = traceSlabRay({
  incident: [0, 0, -1], entryNormal: [0.35, 0, 0.93675],
  exitNormal: [0, 0, 1], ior: 1.52, outsideIor: 1,
  thickness: 12, backdropDistance: 8, absorption: [0.002, 0.001, 0]
});
```

Vectors are normalized on input. Normals face against the incident ray; ray coordinates use Y up and negative Z into the scene. The entry point is the origin. The exit plane passes through `(0,0,-thickness)` and has `exitNormal` as its normal. The background plane is at `z=-(thickness+backdropDistance)`. The footprint offset is relative to the unrefracted incident ray at that plane. A tilted exit is intersected using its plane equation.

`refractRay(incident, normal, n1/n2)` implements Snell's law and returns null at total internal reflection. `fresnelReflectance(cosIncident,n1,n2)` computes the exact unpolarized interface reflectance. The slab result includes internal/outgoing directions, footprint offset, path length, entry/exit reflectance, RGB transmittance and a TIR flag. An outgoing ray that misses the background has no footprint.

Only the single transmitted path is returned. Energy lost to reflection is accounted for, but internal bounces, reflected images, arbitrary meshes, volumetric scattering and caustics are not traced.

## GPU helper

Include `slabOpticsGLSL` in `createGlassShader({declarations})`, then call `traceSlab(incident, entryNormal, exitNormal, ior, outsideIor, thickness, gap)` from an optics hook. Its `SlabRay` contains `internalRay`, `outgoingRay`, `offset`, `pathLength`, scalar `transmission`, `tir` and `valid`. `valid=1` means the path reaches the background; `tir=1` specifically means total internal reflection. Add RGB absorption in your shade function if required.

GPU and CPU results are tested against each other for normal, tilted, wedge and TIR cases. GPU invalid geometry returns `valid=0`; the CPU API throws for invalid inputs. The [live workbench](../examples/workbench/) demonstrates both models.
