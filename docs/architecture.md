# Architecture

The renderer owns one WebGL 2 context, a full-viewport source and a set of optical groups. Background pixels are explicit application input; a shader cannot sample arbitrary content behind a canvas without that content being captured into a texture.

## Rendering pipeline

1. Upload changed background, foreground mask, environment and local surface content.
2. Produce two cached levels of dense Gaussian scattering.
3. Sort groups by layer and identify overlapping optical bounds.
4. Render shared SDF boundaries, refracted transmission, finish and local content.
5. For an overlapping front layer, snapshot the completed rear layers and scatter that snapshot.
6. Copy each material foreground region into an asynchronous contrast atlas before drawing its own content.
7. Composite premultiplied coverage and local shadows; publish asynchronous timing information.

A front layer never samples its own active framebuffer. Disjoint groups share the original cached scattering; intersecting layers add composition and scattering passes. Texture targets are allocated lazily and reused. Every frame updates uniforms instead of recompiling shaders.

## Geometry

Rounded rectangles use an analytic distance and gradient. Continuous corners use a configurable exponent; full capsules remain circular. Shared groups use a smooth union. SVG paths are converted once into a 256×256 distance/gradient atlas; movement uses the atlas without CPU recomputation. Even-odd holes remain optically empty and participate in hit testing.

The material's optical normal bends rays independently from its shading normal. `bevel:0` prevents the refracting edge from automatically becoming a bright raised frame. `edgeContrast` provides a separate thin silhouette contour; `specularIntensity` and `specularWidth` control edge illumination independently from bevel. Standard displacement is limited by edge width to avoid folds and unbounded sampling.

## Motion and adaptation

Analytic damped springs preserve velocity across retargeting. Geometry, reveal, material, touch, offset, impulse, tone and shape are separate channels. One scheduler runs continuous application programs, integrates springs and draws only while necessary. A coarse CPU source sample is provisional. Per-surface 16x16 GPU tiles measure completed material and rear-layer content; a pixel-pack buffer and nonblocking fence transfer those samples. Regular protection and ink respond to completed measurements. Effective thickness, scattering and shadows follow current geometry without mutating the base material. See [Readability](readability.md) and [Size response](material-response.md).

## Extension points

Material numbers and RGB vectors are animatable. Physics profiles and deformation callbacks are public. GLSL hooks replace optics, distance fields and final shading; complete glass, blur and background fragments can also be replaced transactionally. Reflection source and rotation are independent of background uploads. See [Programming](programmability.md).

RGBA8/sRGB textures are used. There is no native system compositor, HDR/EDR path, arbitrary 3D reflection scene or automatic offscreen content recovery. These boundaries are explicit in [Compatibility](apple-audit.md).
