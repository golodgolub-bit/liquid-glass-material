# Liquid Glass Material — Developer Guide

A programmable WebGL 2 material for interfaces, applications and WebView hosts. It combines screen-space refraction, cached scattering, reflection, adaptive tone and interruptible spring motion in a shared compositor.

## Start here

1. [Install and integrate](integration.md) the renderer with your app's background.
2. [Create a material](api.md#glassmaterial) and bind accessible DOM controls.
3. [Coordinate effect identities and transitions](containers.md) in a shared container.
4. [Refract and recolor text](text-under-glass.md) using an aligned foreground mask.
5. [Adapt foreground contrast](readability.md) and [material size response](material-response.md).
6. [Program shaders and physics](programmability.md) or use the [ray optics helpers](ray-optics.md).

Run `npm install`, then `npm run dev`. Open `/` for the laboratory, `/examples/gallery/` for editorial material studies, `/examples/workbench/` for the live GLSL editor and `/examples/programmatic/` for continuous animation. `/examples/readability/` exposes contrast and size behavior; `/examples/reference/` provides a fixed comparison fixture. `/examples/dispersion/` compares wavelength-dependent clear and scattered transmission.

## Material capabilities

| Area | Available features |
|---|---|
| Optics | Separate glass/surrounding indices, edge refraction, magnification, RGB dispersion, Cauchy/Abbe spectral indices, Beer–Lambert extinction |
| Finish | Regular/Clear/Identity, independent bevel, specular edge and contour, composited contrast, size response, tint, saturation, dimming |
| Lighting | Directional highlights, Fresnel environment reflection, independent rotating reflection maps |
| Composition | Rear glass and local content refracted by front layers, shared SDF unions, free SVG contours and holes |
| Interaction | Press, grab, drag, lift, hover/focus highlights, selection lenses, keyboard support |
| Motion | Stable identities, matched geometry, materialize/identity transitions, analytic springs, interruption, custom deformation, continuous programs |
| Integration | DOM controls, media sources, experimental DOM capture, Windows WebView2 and Android WebView examples |

## Guides

- [Composited contrast](readability.md): ink policies, GPU probes and Clear presets.
- [Dispersion](dispersion.md): colored edges, wavelength coordinates and scattering.
- [Material response](material-response.md): size profiles, scattering and edge illumination.
- [Matched captures](comparison.md): native/web fixtures and quantitative comparison protocol.
- [API Reference](api.md): generated public signatures and units.
- [Architecture](architecture.md): source capture, shared scattering and compositing.
- [Motion](motion.md) and [Animation recipes](animations.md): spring channels and lifecycle.
- [Light and reflections](reflections.md): environment mapping and independent updates.
- [Performance](performance.md): measured results, methodology and optimization.
- [Validation](validation.md): reproducible checks and platform coverage.
- [Troubleshooting](troubleshooting.md): capture, layering and shader diagnostics.
- [Compatibility](apple-audit.md) and [Design references](research.md): public behavior and implementation boundaries.

The implementation is independent and MIT licensed. Public API behavior is mapped explicitly; proprietary Apple shader constants, HDR composition and exact native motion presets are not supplied.
