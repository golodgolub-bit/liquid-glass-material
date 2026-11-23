# Platform compatibility

This library is an independent implementation of interface glass. It provides portable material, composition and motion primitives inspired by publicly documented Liquid Glass behavior. It does not bundle Apple's private shaders or native UI frameworks.

## Public API concepts

| Apple concept | Portable API |
|---|---|
| Regular / Clear / Identity | `createMaterial({variant})`; Identity preserves local content without material |
| Tint and interactivity | Material tint, semantic controls, `interact`, DOM bindings and configurable press physics |
| GlassEffectContainer | `GlassEffectContainer` with shared renderer, material, spacing and layer |
| Effect IDs and namespaces | Stable `GlassEffectItem.id` scoped by the container namespace |
| Glass effect unions | `union` keys group related contours into one optical boundary |
| Matched geometry | `matchedGeometry` reconciliation with nearby union members |
| Materialize / identity transition | Per-item or per-container transition mode |
| Custom shape | Rounded geometry, SVG distance fields, morphing and GLSL field hooks |
| Selection lens | `bindLiquidSelection`, aligned vibrancy mask and layered material |
| Scroll edge treatment | `setScrollEdges` and `bindScrollBehavior` |
| Reduced Motion / transparency / contrast | Live web preferences and explicit host overrides |

The mapping describes supported concepts, not a binary compatibility layer. UIKit/SwiftUI code is not executed. Native view-tree extraction, system icon rendering, native focus systems and platform-specific widget behaviors remain the host application's responsibility.

## Material and rendering boundaries

| Aspect | Implementation |
|---|---|
| Lensing | Screen-space source sampling with programmable optical normal/displacement |
| Refractive indices | Explicit glass and outside indices; defaults are independent artistic parameters |
| Dispersion | Artistic RGB split or optional Cauchy/Abbe RGB indices |
| Two interfaces | Optional single transmitted ray with Snell, Fresnel and TIR; CPU/GPU verified |
| Scattering | Two cached Gaussian levels; no volumetric multiple-scattering simulation |
| Reflection | Directional response and environment map; no complete reflected 3D scene |
| Rear glass | Completed lower layers and their content feed front-layer refraction |
| Edge | Refraction independent from bevel; narrow contrast contour independently adjustable |
| Color | RGBA8/sRGB; HDR, EDR and native tone mapping are absent |
| Ambient spill | No full spatial indirect-light transport or physical colored shadows |
| Motion | Analytic interruptible springs; coefficients are independently selected |
| Free contours | 256×256 SVG distance fields; finite spatial resolution |
| Background capture | Explicit source/capture integration; offscreen native pixels are not available automatically |

Apple does not publish exact refractive indices, scattering kernels, private compositor behavior or spring constants for every system control in the sources listed below. An index such as 1.48 must not be described as an extracted Apple constant. Exact native equivalence requires measured reference scenes, matched display conditions and quantitative image/motion comparisons; passing implementation tests alone does not establish it.

## Primary references

- [Apple: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple: Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)
- [Apple: Glass.identity](https://developer.apple.com/documentation/swiftui/glass/identity)
- [Apple: GlassEffectTransition](https://developer.apple.com/documentation/swiftui/glasseffecttransition)
- [Meet Liquid Glass, WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/)
- [Platforms State of the Union, WWDC26](https://developer.apple.com/videos/play/wwdc2026/102/)

The public design evolves between OS releases, accessibility settings and appearance preferences. The API exposes coefficients and shader functions so applications can tune a defined target without hardcoding an undocumented universal preset.
