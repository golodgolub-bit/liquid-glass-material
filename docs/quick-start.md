# Quick start: one scene, real controls

Start with one shared renderer and an explicit background. The material can refract only pixels supplied to the compositor. A transparent HTML control over an unrelated DOM background does not automatically give WebGL access to that background.

## Install and layer the scene

Download the package from [Releases](https://github.com/golodgolub-bit/liquid-glass-material/releases/latest), then install the downloaded archive. Import the library stylesheet once.

```html
<section class="glass-scene">
  <canvas aria-hidden="true"></canvas>
  <div class="controls"></div>
</section>
```

```css
.glass-scene { position: relative; isolation: isolate; min-height: 260px; }
.glass-scene > canvas { position: absolute; inset: 0; width: 100%; height: 100%; z-index: -1; }
.controls { padding: 32px; display: grid; gap: 20px; max-width: 400px; }
```

Keep the canvas untransformed. Bindings measure the semantic DOM control against that canvas. Normal layout, keyboard focus and accessible labels stay in the DOM; material and control-track pixels are rendered by the compositor.

## Create and size the renderer

```ts
import { GlassRenderer, glassToggle, glassSlider } from '@liquid-glass/material';
import '@liquid-glass/material/style.css';

const canvas = document.querySelector<HTMLCanvasElement>('.glass-scene canvas')!;
const parent = document.querySelector<HTMLElement>('.controls')!;
const renderer = new GlassRenderer(canvas);
const backdrop = document.createElement('canvas');

function paintBackground() {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  renderer.resize(width, height);
  backdrop.width = Math.ceil(width);
  backdrop.height = Math.ceil(height);
  const context = backdrop.getContext('2d')!;
  context.fillStyle = '#f5f6f8';
  context.fillRect(0, 0, width, height);
  renderer.setBackdrop(backdrop);
}
paintBackground();

const wifi = glassToggle(renderer, parent, 'Wi-Fi', true, {
  onChange: enabled => console.log('Wi-Fi setting:', enabled)
});
const volume = glassSlider(renderer, parent, 'Volume', 55);

const resize = new ResizeObserver(() => {
  paintBackground();
  wifi.refresh();
  volume.refresh();
});
resize.observe(canvas);
```

This background is intentionally simple and accurate: the visible source is the same image the material receives. Replace the painter with your app's canvas, image, video or host capture. For high-density artwork, paint an appropriately scaled source; use [Integration](integration.md) for crop, coordinate and update requirements.

## Update state and dispose

```ts
wifi.setChecked(false);        // programmatic: no change event
volume.setValue(75);           // native range validation and clamping

// When this scene unmounts:
resize.disconnect();
wifi.dispose();
volume.dispose();
renderer.dispose();
```

Do not construct a renderer for each button. Do not run a separate permanent animation loop just to keep static controls visible. The shared scheduler wakes for input and animation, then sleeps. Call `updateBackdrop()` when an existing source canvas changes; changing source pixels without notifying the renderer leaves an old texture.

## What to try next

- Run `/examples/controls/` for switches, a slider and three basic transitions.
- Read [Basic controls](basic-controls.md) for native events and component ownership.
- Read [Switches](switches.md) for the dense-to-glass thumb, dragging and customization.
- Read [Animation basics](animation-basics.md) before adding loops or custom springs.
- Use [Text under glass](text-under-glass.md) when foreground glyphs must also refract or recolor. DOM text is not automatically a GPU background texture.
