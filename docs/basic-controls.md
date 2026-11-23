# Basic controls

These recipes share a `renderer` and a DOM `parent` created in [Quick start](quick-start.md). Choose controls by their meaning first; then configure the material. Prefer clear labels, a generous hit target and a quiet resting state over constant decorative movement.

## Action button

```ts
const save = glassButton(renderer, parent, 'Save changes', {
  material: { variant: 'regular' }
});
save.element.addEventListener('click', () => saveDocument());
```

`glassButton` returns a real `HTMLButtonElement` and its material binding. It supports native click/keyboard behavior and a visible focus state. Use an action label. Use `surface.interact` for custom host input; normal DOM bindings already handle pointer and keyboard press feedback.

Expected appearance: stable geometry at rest, a small immediate press response, then one smooth release. The material should not pulse forever. A button's text belongs above its material; supply a foreground mask separately if underlying text must warp through a moving lens.

## Binary switch

```ts
const wifi = glassToggle(renderer, parent, 'Wi-Fi', true, {
  onChange: checked => savePreference('wifi', checked),
  onOffLabels: true
});
wifi.setChecked(false);
wifi.setDisabled(true);
```

A switch manages a persistent on/off value. Its thumb position and optional on/off marks communicate state as well as color. The `change` event bubbles once per user commit; `onChange` is a convenience for the same commit. Connect one of these to persistence, rather than saving twice. Programmatic `setChecked` emits neither.

Expected appearance: a dense light thumb at rest; a larger refractive thumb during a hold/drag; a smooth return to the correct endpoint. See [Switches](switches.md) for cancellation, RTL, disabled states and the complete customizable profile. Apple's [toggle guidance](https://developer.apple.com/design/human-interface-guidelines/toggles) recommends switch-style toggles in list rows on iOS/iPadOS, with unmistakable state differences.

## Continuous value slider

```ts
const volume = glassSlider(renderer, parent, 'Volume', 55, {
  min: 0, max: 100, step: 1
});
volume.input.addEventListener('input', () => setPreviewVolume(+volume.input.value));
volume.input.addEventListener('change', () => saveVolume(+volume.input.value));
volume.setValue(75);
volume.input.disabled = true;
```

The input remains a native range control. Use `input` for continuous feedback and `change` for a committed value. Arrow keys, Home/End, range clamping and step behavior belong to the input. `setValue` does not fabricate user events.

The rail and its current fill are supplied as rear content to the glass compositor. A light resting cap fades during interaction so the actual rail can refract through the expanded thumb. `setPressed(true/false)` is available for a programmatic visual demonstration; it does not move the range or simulate a captured pointer session.

## Segmented choice

```ts
const filter = glassTabs(renderer, parent, ['All', 'Saved', 'Recent'], {
  label: 'Filter items'
});
filter.element.addEventListener('change', () => showItems(filter.selectedIndex));
filter.select(1);
```

This component is a semantic button group with one pressed choice and roving keyboard focus. It does not manage document tabpanels. Use it for a compact choice among a few values. The application updates the corresponding content. If you need a magnifying navigation lens with captured/recolored foreground, use `bindLiquidSelection` and the aligned foreground integration from [Text under glass](text-under-glass.md).

## Menus and presentations

Use `glassPopover` or `glassSheet` for a presentation attached to an existing control. Keep the same source surface identity during the transition; avoid replacing the control with an unrelated floating box. The presentation helpers manage focus and dismissal. See [Animation recipes](animations.md) and [Effect containers](containers.md) for complete examples.

## Ownership and integration tips

- Keep DOM track backgrounds transparent for the provided switch/slider. Their rails already live in the compositor; an opaque DOM background can cover the GPU thumb.
- Use the returned native `element` or `input` for application events, focus and disabled state. Do not put a second invisible control on top of it.
- Keep component labels readable in the application theme. A label beside a thumb does not use the thumb's own foreground contrast probe.
- Refresh bindings after application layout/direction changes that do not resize the observed nodes.
- Dispose the component when unmounting it. Disposing removes its DOM, surfaces and listeners; disposing only the renderer does not remove application DOM.
- Test keyboard input, touch drag, cancellation, Reduced Motion and a dark background as ordinary parts of the component.
