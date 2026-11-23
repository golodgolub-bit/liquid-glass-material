# Animation basics

Animate a state change with one continuous surface. Geometry, the material and foreground should feel like parts of the same object. A static control should settle and stop rendering; a permanent loop should be an explicit application decision.

Run `/examples/controls/` to try movement, reshaping and materialization. The [motion studio](../#motion-studio) demonstrates more complex interactions.

## Move without restarting

```ts
surface.move({ x: 240 });
// A later target preserves the current position and velocity.
surface.move({ x: 120 });
await surface.settled();
```

Expected appearance: immediate response, continuous travel and a gentle stop. An interruption changes the destination; it should not jump back to the start or pause before replaying a fixed-duration keyframe. Avoid creating a new surface for each target.

`move(rect, false)` snaps intentionally, for layout initialization or a measurement fixture. `animateTo` returns a result so a sequence can detect cancellation:

```ts
const result = await surface.animateTo({ width: 320, height: 100, radius: 36 });
if (result.finished) showTheNextStep();
```

## Choose a spring by intent

| Intent | Starting point | What to inspect |
|---|---|---|
| Follow a captured pointer | Critical damping, higher frequency | Small lag, no oscillation behind the finger |
| Release a control | Moderate frequency, damping near 1 | Smooth return, restrained overshoot |
| Grow a panel | Coordinated geometry/material response | No sudden thickness or opacity jump |
| Decorative drift | Explicit animation program | Pause, Reduced Motion and idle behavior |

```ts
surface.motion({ frequency: 4.2, damping: 0.92 });
surface.configurePhysics({ material: { frequency: 5, damping: 1 } });
```

Frequency is cycles per second. Damping is a ratio: 1 is critical damping; values below 1 allow overshoot. It is not a CSS duration. The profiles are library starting points, not extracted Apple constants. Avoid excessive wobble, repeated water ripples or long settling on small functional controls.

## Change shape and material together

```ts
await Promise.all([
  surface.animateTo({ width: 300, height: 190, radius: 30 }),
  surface.animateMaterial({ frost: 0.72, reflection: 0.3 })
]);
```

Expected appearance: the same object expands and becomes more substantial. Default size adaptation already adjusts thickness, scattering and shadow during resizing; do not accidentally apply the same growth twice. Use `state.baseMaterial` to inspect the underlying unscaled parameters. Free SVG contour morphs use `surface.shape(...)`; preserve the handle instead of crossfading unrelated objects.

## Reveal a material

```ts
await surface.hide({ immediate: true });
await surface.show();
await surface.hide();
```

Expected appearance: the material arrives and departs as a coherent surface, with its reveal response and content visibility coordinated. Use show/hide rather than fading only the canvas while leaving an unrelated DOM label visible. Bind semantic content with `bindElement`, which follows the same visual pose and visibility. If your own overlay is not bound, you must synchronize it yourself.

## Fade foreground without removing the glass

```ts
surface.content(labelCanvas);
surface.contentOpacity(1, false);
surface.contentOpacity(0);
await surface.settled();
```

This changes the local foreground only. The material continues to refract and reflect. Use it for a thumb's resting cap or a label transition. The shader applies opacity after local content sampling; rear layers see the completed composition. A full custom fragment must preserve the `contentOpacity` uniform if it implements the standard local-content pass.

## Explicit continuous programs

```ts
const program = renderer.addAnimation(({ time }) => {
  surface.material({ reflection: 0.25 + Math.sin(time) * 0.05 }, false);
});
program.pause();
program.resume();
program.cancel();
```

A program is paused independently of finite springs. Nonessential programs suspend under Reduced Motion. Use the supplied active `time` rather than wall-clock time if pause/resume must not jump. Do not add an external rAF loop on top of this scheduler. See [Animation recipes](animations.md) and [Programmability](programmability.md) for more involved programs.

## Review movement

- Check the initial response, not just the final frame.
- Interrupt and reverse the target while it is still moving.
- Keep text/icons aligned with the actual visual pose and capture coordinates.
- Check a slow drag, a fast flick and release outside the element.
- Test live Reduced Motion and Reduced Transparency.
- After settling, wait for `renderer.idle` before measuring idle frame counters. Pending contrast probes can require extra frames.
- Measure presentation intervals on the target device. A spring equation and a low GPU median do not guarantee smooth 120 Hz delivery.

See [Motion physics](motion.md), [Matched captures](comparison.md) and [Platform compatibility](apple-audit.md). Matching native motion requires a defined reference and timed captures; a similar-looking spring preset alone is insufficient.
