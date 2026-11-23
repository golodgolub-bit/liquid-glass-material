# Programming the material

The standard material is a starting point. [Composited contrast](readability.md) and [size/edge response](material-response.md) are independently configurable public subsystems. Applications can replace optical functions, the distance field, final shading, the full glass fragment program, scattering and background passes. Motion has separate configurable spring channels and a pure deformation callback.

## Configure the physics

```ts
import { GlassRenderer, springFromPhysical } from '@liquid-glass/material';
const renderer = new GlassRenderer(canvas, {
  physics: { geometry: { frequency: 3.5, damping: 0.88 } }
});
const glass = renderer.addSurface({
  id: 'inspector', rect: { x: 40, y: 60, width: 300, height: 160, radius: 28 },
  physics: {
    geometry: springFromPhysical({ mass: 1, stiffness: 480, damping: 39 }),
    pressScale: [0.04, 0.02], maxStretch: 0.08
  }
});
glass.configurePhysics({ material: { frequency: 3, damping: 1 } });
glass.kick({ x: 240, y: -80 });
```

Channels are `geometry`, `material`, `press`, `reveal`, `offset`, `impulse`, `tone` and `shape`. `defaultPhysics` and `createPhysics()` provide immutable validated profiles. Updating one channel preserves all spring positions and velocities and leaves the other channel coefficients intact. `springFromPhysical` converts physical viscous damping into a damping ratio; `springToPhysical` performs the inverse for a supplied mass.

Additional controls are `pressScale`, `attraction`, `velocityScale`, `maxStretch`, `crossCoupling`, `revealScale` and `impulseStrength`. `renderer.configureLightMotion()` tunes the directional light spring. `bindDrag` accepts `followSpring` and `releaseSpring`; releasing restores the surface's configured geometry spring by default.

## Define a deformation

```ts
glass.deform(({ visualRect, velocity }) => {
  const width = visualRect.width * (1 + Math.min(0.1, Math.abs(velocity.x) / 4000));
  return { ...visualRect, x: visualRect.x + (visualRect.width - width) / 2, width };
});
```

This callback must be pure: it is evaluated for rendering, DOM geometry and hit testing. Its input is frozen. Return a valid rectangle without mutating the renderer. `glass.deform(null)` removes it. Reduced Motion bypasses custom deformation. `state.velocity` exposes geometric spring velocity in CSS pixels per second, including the impulse applied by `kick`.

## Replace an optical function

```ts
import { createGlassShader } from '@liquid-glass/material';
renderer.setShader(createGlassShader({
  uniforms: { uGlass_gain: { type: 'float', value: 1 } },
  optics: `
    GlassOpticalSample ray = defaultGlassOptics(data);
    ray.displacement *= uGlass_gain;
    return ray;
  `
}));
renderer.setShaderUniform('uGlass_gain', 0.75);
```

`GlassOpticalInput` contains `depth`, `width`, `thickness`, `refraction`, relative `ior` (glass / surrounding medium), `gradient` and `presence`. Return a `GlassOpticalSample` with a finite normalized `normal` and a displacement in CSS pixels. Gradient coordinates use Y down; optical normals and displacement use Y up.

The optional `declarations` string adds shared helpers. The `field` body returns `vec4(signedDistance, gradientX, gradientY, presence)`; `defaultGlassField(point)` provides the standard union. The `shade` body receives `color`, `point`, `sampleUV`, `normal` and `depth`, and returns RGB. Final coverage and premultiplied alpha remain managed by the renderer.

A custom field changes GPU coverage but does not automatically replace CPU hit testing or enlarge the renderer's scissor bounds. Use `createGlassShape` for arbitrary contours with coherent hit testing; use `deform` for rectangular motion.

## Replace complete passes

`createGlassShader({ fragment, blurFragment, backdropFragment, uniforms })` accepts full GLSL ES 3.00 programs. A full `fragment` cannot be combined with template hooks. `shaderSources` exposes `vertex`, `glass`, `blur` and `copy`; the public shader source module also documents the uniform layout.

Preserve the standard samplers and uniform ABI when relying on automatic layering. Sources include `backdrop`, `blurred`, `scatteredWide`, `vibrantForeground`, `surfaceContent`, `shapeMaps` and `environmentMap`. `physical` holds glass index, reflection and corner power; `medium` holds outside index and Abbe number; `absorption` is RGB extinction. Geometry and reveal arrays support 32 members. Sampler bindings and the full-screen vertex stage are renderer-owned.

Managed uniforms support `float`, `vec2`, `vec3` and `vec4` and must start with `uGlass_`. Values are checked for finiteness and dimensions. `setShader` compiles and links all three programs and validates active uniform types before replacing anything. If compilation fails, the previous pipeline and values remain active. A custom blur uniform change invalidates cached scattering without uploading the background again.

`getShader()` returns the immutable descriptor. `getShaderUniform()` returns the latest managed value. `setShader(null)` restores the default pipeline. Context restoration recompiles the descriptor and restores current uniforms. Wait for restoration before installing a new program; value updates can be retained while context is lost.

## Continuous programs

```ts
const program = renderer.addAnimation(({ time }) => {
  glass.move({ x: 120 + Math.sin(time * 0.7) * 70 });
  renderer.setReflectionRotation(time * 0.15);
});
program.pause();
program.resume();
program.cancel();
```

Use the shared scheduler instead of a second permanent `requestAnimationFrame`. Pausing preserves elapsed program time. Background tabs suspend rendering, and nonessential programs suspend under Reduced Motion. See [Animation recipes](animations.md) for source updates and cleanup.

## Local foreground opacity

`SurfaceOptions.contentOpacity` defaults to 1. `surface.contentOpacity(value, animate = true)` animates the local content alpha independently of the material, on the material spring channel. Values must be finite in [0,1]. The current clamped value is available in `surface.state.contentOpacity`. A full fragment that implements the local-content branch must preserve `uniform float contentOpacity` and multiply it into the content alpha. Template hooks retain this stage automatically. See [Animation basics](animation-basics.md) and [Switches](switches.md).

The `magnification` range is 0.5–2. Values below one minify transmitted content while retaining the same silhouette; one keeps interior scale unchanged. This is a programmable image-scale operation, not proof of a recovered physical Apple lens.
