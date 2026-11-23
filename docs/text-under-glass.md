# Text and icons under glass

A glass surface can refract foreground ink and change its color only where it overlaps that ink. The rest of the image remains untouched. Supply an aligned RGBA mask instead of recoloring the entire background.

```ts
const source = document.createElement('canvas');
const mask = document.createElement('canvas');
source.width = mask.width = 1200;
source.height = mask.height = 800;
const background = source.getContext('2d')!;
const foreground = mask.getContext('2d')!;
background.fillStyle = '#f4efe4';
background.fillRect(0, 0, 1200, 800);
for (const context of [background, foreground]) {
  context.font = '64px Georgia';
  context.fillStyle = context === foreground ? 'white' : '#263c45';
  context.fillText('Light, in your hands.', 80, 300);
}
renderer.setBackdrop(source);
renderer.setVibrancySource(mask, { color: [0.08, 0.4, 0.9] });
const lens = renderer.addSurface({
  id: 'text-lens', vibrancy: true,
  rect: { x: 200, y: 220, width: 300, height: 100, radius: 50 },
  material: { variant: 'clear', appearance: 'light', frost: 0.02 }
});
```

The foreground texture's alpha describes the ink. With `color`, RGB is replaced by that color; without it, the texture supplies its own colored text or symbols. Its coordinates must match the background. Both use the lens's sample UV, so the selected ink bends with the background rather than remaining a flat overlay. Clear the mask outside the intended text or icons.

`updateVibrancy()` marks changed mask pixels for upload. Moving a lens over a static mask does not repaint or upload the mask. `setVibrancySource(null)` disables the source. Enable `vibrancy:true` only for surfaces that should apply it; members of a union share this mode.

## Selection and highlight bindings

`bindLiquidSelection` creates a moving lens for a horizontal selection rail. It supports held drag, lift, nearest-item snap and Left/Right/Home/End keyboard navigation. Render active icon colors into the mask to recolor only the overlapped symbols. The rail and front lens can occupy different glass layers.

`bindLiquidHighlight` moves a material highlight between menu rows during hover, focus and held pointer movement. Use semantic menu items and keep focus management in the popover controller.

## Local foreground content

`surface.content(canvas)` attaches transparent content above that surface's material. A higher glass layer refracts this completed content. It is separate from the full-viewport vibrancy mask. `identity` surfaces retain their local content while applying no optical material.

The renderer does not automatically discover text in arbitrary DOM trees. Draw the same content and mask into canvases, provide an application capture bridge, or use experimental HTML-in-Canvas support when available. Preserve semantic DOM text for accessibility without visually duplicating the captured layer. See [Integration](integration.md).
