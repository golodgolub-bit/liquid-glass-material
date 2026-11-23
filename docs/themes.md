# Theme architecture

A theme describes a material, motion profiles, color tokens and application layout. Keep those concerns explicit so a theme can be applied to a dock, clock, panel or launcher without embedding platform-specific actions in the renderer.

## Define reusable tokens

```ts
const theme = {
  material: createMaterial({
    variant: 'regular', appearance: 'light', frost: 0.68,
    refraction: 13, edgeAdaptation: 1, bevel: 0,
    specularIntensity: 0.55, specularWidth: 1.4
  }),
  physics: createPhysics({
    geometry: { frequency: 3.5, damping: 0.94 },
    material: { frequency: 4, damping: 1 }
  }),
  foreground: '#1b2634', accent: '#278bd8', radius: 28
};
surface.material(theme.material);
surface.configurePhysics(theme.physics);
document.documentElement.style.setProperty('--app-foreground', theme.foreground);
```

Use `createMaterial` and `createPhysics` to validate imported numeric tokens. JSON does not carry shader functions, callbacks or native permissions. Load executable extensions through the application's own trusted plugin mechanism; ordinary theme data should remain data.

Use CSS tokens for labels, spacing, focus rings and typography. Use material parameters for transmission, scattering, edge light, tint and reflection. CSS backdrop blur does not become the compositor's input automatically. Keep its visible source and refracted source aligned.

## Apply a theme across an application

Maintain a registry of the application's surfaces or effect containers. Retarget materials on existing identities so transitions retain their current velocity. Set geometry from layout, rather than making a theme animate stale coordinates. For a scene-wide appearance change, update DOM colors and material targets together.

Give components semantic variants: an unobtrusive dock, a readable menu, a compact control and a large presentation need different scattering and shadow budgets. Avoid using one almost-transparent Clear preset for every text-bearing surface. `Clear` can select readable ink but does not add Regular's protective layer. See [Readability](readability.md).

## Accessibility is part of the theme

Honor Reduced Motion, Reduced Transparency, Increased Contrast, keyboard focus and minimum hit sizes. A host can forward its system settings through `renderer.setAccessibility()`. Keep state visible beyond color alone. A theme should retain usability when elastic effects are disabled or the translucent material becomes dense.

## Platform boundary

The library can render an application's theme in a browser, Electron, WebView2 or Android WebView. It does not replace the OS compositor, reskin another app's protected views, grant launcher status or provide arbitrary desktop pixels. A system-wide theme needs native integration at the appropriate platform boundary. See [Native launchers](native-launchers.md) and [Compatibility](apple-audit.md).
