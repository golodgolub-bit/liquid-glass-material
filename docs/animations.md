# Animation recipes

For an introduction with expected visual behavior, start with [Animation basics](animation-basics.md).

## Move and retarget

```ts
surface.move({ x: 180, y: 90 });
// A later target preserves momentum.
surface.move({ x: 120, width: 340, radius: 30 });
await surface.settled();
```

`animateTo()` and `animateMaterial()` return completion promises. `show()` and `hide()` animate material presence as well as optical geometry. `dismiss()` hides then removes a surface. `remove()` is immediate. Use `GlassEffectContainer` for declarative identity-based reconciliation, neighbor matching and interrupted entry/exit.

## Animate indefinitely

```ts
const program = renderer.addAnimation(({ time, delta, frame }) => {
  surface.move({ x: 180 + Math.sin(time) * 60 });
  renderer.setReflectionRotation(time * 0.2);
});
program.pause();
program.resume();
program.cancel();
```

Returning false ends a program. `elapsed` excludes paused time. Background tabs do not accumulate a large time jump on resume. Programs execute before spring integration and share the renderer's scheduler. Avoid a second requestAnimationFrame loop; a paused scene should not keep rendering at rest.

For a rigid prescribed path, use `move(rect,false)` within a program. For a softly followed path, keep the default spring update. After manually dragging a spring-driven object, resume by retargeting rather than snapping it to the old trajectory.

## Animate reflection without uploads

Set an environment canvas once with `setReflectionSource`, then animate `setReflectionRotation`. Only call `updateReflection` when the map's pixels change. Reflection motion does not require background capture or repeated texture uploads.

## Morph a shape

```ts
const droplet = createGlassShape({ path: 'M50 3 C95 35 110 88 50 98 C-10 88 5 35 50 3Z' });
await surface.shape(droplet);
await surface.shape(null); // rounded rectangle again
```

Morphing uses cached signed-distance fields. An interrupted morph retains its intermediate boundary. Contour resolution defaults to 256 and can be configured up to 1024; the atlas uses the highest active resolution. Cache shapes and inspect highly detailed outlines at their intended display size. Even-odd holes and CPU hit tests are supported. Use a pure `deform` callback for velocity-dependent rectangular stretch.

## Clean up

Cancel programs and dispose controls, containers and bindings before disposing the renderer. Capture helpers own event listeners and observers; their `dispose()` methods release them. Reduced Motion automatically suspends nonessential programs; use `{essential:true}` only when a callback is required for functional state rather than decorative motion.
