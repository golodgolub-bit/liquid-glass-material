# Motion and spring physics

All finite transitions use analytic damped springs. Retargeting preserves current position and velocity; it does not restart a CSS keyframe. Spring integration is independent of the display refresh rate, although the compositor's frame delivery still determines perceived smoothness.

```ts
surface.motion({ frequency: 3.5, damping: 0.9 });
await surface.animateTo({ x: 240, width: 320 }, { spring: { frequency: 4, damping: 0.9 } });
await surface.animateMaterial({ frost: 0.2, tintOpacity: 0.1 });
```

Use the generated [API Reference](api.md) for exact signatures. `move(rect, false)` applies an immediate geometry update. `settled()` waits for all surface channels, not just position. Interruption or disposal resolves pending work with `{finished:false}`.

## Channels

`geometry` controls x/y/width/height/radius. `material` controls numeric material fields and RGB vectors. `press`, `offset` and `impulse` provide touch response; `reveal` materializes a surface; `tone` adapts contrast; `shape` morphs contours. Profiles are available in `defaultPhysics`; `configurePhysics` changes only the supplied channels.

The default geometry profile is 3.5 Hz / 0.88 damping. Material and shape default to critical damping. Press is 4.7 Hz / 0.9; reveal is 4.2 Hz / 0.9. These are independent library presets, not recovered native animation constants. Frequency is cycles per second; damping is a ratio. A value of 1 is critical damping, less than 1 permits overshoot.

## Physical parameterization

```ts
const spring = springFromPhysical({ mass: 1, stiffness: 480, damping: 39 });
surface.configurePhysics({ geometry: spring });
surface.kick({ x: 300 });
```

The physical `damping` above is viscous resistance, not the normalized ratio. `springToPhysical(profile, mass)` converts back. `kick` adds velocity in CSS pixels per second without resetting the target. Material values are projected into valid optical ranges before GPU submission, so underdamped animation cannot send a negative thickness or invalid index.

## Reduced Motion

Reduced Motion snaps finite spring targets, bypasses velocity deformation and custom deformation, and suspends nonessential animation programs. Semantic selection and keyboard operation continue to work. Explicit `accessibility` overrides can be supplied by a native host. Test this policy live when settings change, rather than only during initialization.

## Programmable selection lift

`bindLiquidSelection` has an independent lift profile. Scale is relative to the resting item's width/height; offset uses renderer CSS pixels. Tracking and release springs control different phases without restarting the current velocity. Material fields use the normal interruptible material springs. The default profile remains an independently selected library preset.

```ts
const selection = bindLiquidSelection(renderer, rail, {
  id: 'navigation', items: buttons,
  physics: { press: { frequency: 4.2, damping: 0.95 }, maxStretch: 0.07 },
  material: { variant: 'clear', dispersion: 0.35 },
  lift: {
    scale: [1.15, 1.6], offset: [0, -4],
    trackingSpring: { frequency: 12, damping: 1 },
    releaseSpring: { frequency: 4, damping: 0.9 },
    material: { refraction: 16, magnification: 1.18, abbeNumber: 58 }
  }
});
```

Releasing selects the nearest item and restores the resting material and geometry. Cancellation restores the previous selection. Reduced Motion retains semantic selection and snaps geometry; pointer capture, keyboard arrows/Home/End and cleanup remain managed by the binding. `selection.surface` exposes the normal shader/material/physics API for further programming.
