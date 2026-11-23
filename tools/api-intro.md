# API Reference

Import runtime values and types from `@liquid-glass/material`; import `@liquid-glass/material/style.css` once. The signatures below are generated from the TypeScript source. Private implementation members are excluded.

## Conventions

| Value | Convention |
|---|---|
| Rectangles, depth, edge width, displacement | CSS pixels in renderer coordinates; origin at the upper left |
| Color, tint, absorption | Three-component RGB tuples; color inputs are sRGB in [0,1] |
| Refractive indices | Dimensionless; `ior` is the glass, `outsideIor` is the surrounding medium |
| Absorption | Nonnegative extinction per CSS pixel; material components are limited to [0,1] |
| Spring frequency / damping | Cycles per second / dimensionless damping ratio |
| Physical spring | Mass, stiffness and viscous damping in a consistent application unit system |
| Velocity / time | CSS pixels per second / seconds; angles are radians |
| Contrast sampling interval | Milliseconds; default `1000 / 15`, independent of animation rate |
| Contrast region | Normalized local coordinates inside the surface rectangle |

`createMaterial()` returns an immutable validated material. `surface.material(partial)` merges fields and animates numeric values; changing the variant starts from that variant's preset. `identity` disables the optical effect and preserves local content. `materialRanges` exposes the validated numeric domain. A weakly damped spring may overshoot internally; values sent to the GPU are constrained to this domain.

Use one `GlassRenderer` per composited scene. Members of the same optical group must share material, spacing, layer and vibrancy. A group accepts up to 32 members. Higher layers refract the completed lower layers when they overlap. Disjoint groups reuse the same cached background scattering.

`surface.rect` is the spring geometry; `surface.state.visualRect` includes touch, reveal and custom deformation. DOM bindings and hit tests use the visual rectangle. Promises resolve with `{finished:false}` when interrupted or disposed. `dispose()` releases resources and event listeners; dispose bindings before their renderer.

`state.baseMaterial` contains current material springs; `state.material` includes optional geometry-dependent response. Read [Material response](material-response.md) before porting manually scaled effects. `state.contrast` reports completed regional measurements. `contrastReady()` returns a contrast state or `null` when unavailable; see [Composited contrast](readability.md) for latency, ink policies and sampled coverage.

`renderer.idle` is true when no frame is active/scheduled and no readability copy/readback remains pending. Wait for it before measuring idle frames; a fixed timeout or a brief gap between slow frames does not establish that the renderer has stopped. Context loss keeps it false until restoration; disposal makes it true.

The renderer owns a single demand-driven animation loop. `addAnimation()` participates in this scheduler; `pause()` stops decorative motion, `cancel()` unregisters it. Reduced Motion bypasses custom deformation and suspends nonessential programs. It does not remove semantic controls or keyboard interaction.

Custom GLSL uses WebGL 2 / GLSL ES 3.00. Managed uniforms are float, vec2, vec3 or vec4 with the `uGlass_` prefix. `setShader()` compiles all passes before swapping the pipeline; an error leaves the previous program running. Uniform changes reuse the program and invalidate custom scattering as needed.

See [Programming](programmability.md), [Ray optics](ray-optics.md), [Effect containers](containers.md), [Text and icons](text-under-glass.md), [Integration](integration.md) and [Compatibility](apple-audit.md) for complete usage examples and platform boundaries.
