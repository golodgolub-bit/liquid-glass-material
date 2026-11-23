# Clocks, docks and launcher transitions

The [interface example](../examples/interface-kit/index.html) uses the same compositor as the laboratory. Its clock consists of material-shaped glyphs; its dock icons are rear content; its panel retains one surface identity throughout opening, closing and layer changes. It launches internal example panels, not installed applications.

## Turn lettering into glass

```ts
const glyph = createGlassTextShape({
  text: '8', font: '600 170px system-ui', padding: 4, resolution: 512
});
const digit = renderer.addSurface({
  id: 'clock-digit', shape: glyph,
  rect: { x: 40, y: 80, width: 95, height: 150, radius: 0 },
  contrast: false, sizeAdaptation: false,
  material: { variant: 'clear', frost: 0.02, edgeWidth: 8, refraction: 12 }
});
```

Wait for the application's font to load before creating its outlines. The returned `viewBox` contains actual ink bounds plus padding. Preserve `viewBox[0] / viewBox[1]` when fitting a glyph. Use one cached contour per glyph for a large clock; updating a minute should reuse existing shapes. Keep a semantic DOM clock label beside the canvas. Font outlines rendered on Windows, Android and Apple platforms are not interchangeable merely because they use the same CSS family name.

The glass fills the glyph itself, including its transparent counters. This differs from `surface.content()`, which paints a foreground image over an existing material. Use [Text under glass](text-under-glass.md) for text behind a moving lens.

## Use a painted contour

```ts
const shape = createGlassShapeFromMask({
  source: maskCanvas, alphaThreshold: 0.5, resolution: 512
});
await surface.shape(shape);
```

Only alpha defines the boundary; RGB is ignored. Include transparent padding and opaque ink. Canvas security rules still apply to cross-origin sources. A mask is captured when the shape is created: changing the source afterwards does not update the stored distance field. Build a new shape when its outline changes, rather than every display frame.

`createGlassShape` also accepts `resolution`. Supported integer sizes are 32–1024; the default remains 256. The GPU array uses the highest active resolution, so mixing one 1024 contour with many 256 contours increases the allocation for every atlas layer. Repeated references share a layer. Context restoration uploads the cached data again. See [Edge quality](edge-quality.md).

## Keep a panel's identity

```ts
surface.move({ x: 230, y: 420, width: 64, height: 64, radius: 18 }, false);
surface.contentOpacity(0, false);
surface.show();
surface.move({ x: 180, y: 120, width: 440, height: 286, radius: 32 });
surface.contentOpacity(1);
```

Reuse the surface and its springs. A close request can retarget the same geometry before opening finishes. Do not await an opening animation before accepting a close gesture. Guard completion callbacks with a revision or current state so an interrupted transition cannot move focus into a closed panel. The example includes that guard.

## Change stacking without recreating material

```ts
surface.layer(6); // above the clock
surface.layer(1); // behind it, preserving content and spring velocity
```

Layers are finite numbers, drawn back to front; equal values preserve insertion order. A union moves as one layer because its members share a material boundary. `surface.state.layer` reports the current value. Moving a surface behind another changes the pixels that the front material refracts. Synchronize semantic DOM hit regions and focus order yourself; changing a GPU layer does not reorder HTML.

## Dock magnification

Measure distance from the pointer to each item's resting center. Map distance to a bounded scale, grow around a consistent anchor, then retarget each existing surface. Apply the same visual rectangle to its semantic hit region. Avoid measuring from already enlarged elements: that creates feedback and jitter. On leave, return to saved resting rectangles. Use a spring rather than a chain of CSS scale transitions. The example uses a bounded Gaussian influence, supports keyboard focus and snaps under Reduced Motion.

For a sliding selection lens with recolored symbols, start with `bindLiquidSelection` and a properly aligned foreground mask. For launch actions and operating-system themes, read [Native launchers](native-launchers.md).
