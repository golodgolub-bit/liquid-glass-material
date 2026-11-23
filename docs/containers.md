# Effect containers and identities

`GlassEffectContainer` coordinates related surfaces within one renderer. Stable IDs preserve spring state when an application reorders or replaces its view descriptions. Unions define which shapes share one optical boundary.

```ts
import { GlassEffectContainer } from '@liquid-glass/material';
const effects = new GlassEffectContainer(renderer, {
  namespace: 'toolbar', spacing: 24,
  material: { variant: 'regular' }, transition: 'matchedGeometry'
});
await effects.reconcile([
  { id: 'edit', rect: { x: 20, y: 20, width: 90, height: 48, radius: 24 } },
  { id: 'share', rect: { x: 130, y: 20, width: 90, height: 48, radius: 24 } }
]);
```

Call `reconcile()` with the complete desired set whenever layout changes. The same ID moves the existing surface; it does not create another spring. Omitting an ID begins its exit. Reintroducing it before exit completes interrupts removal and retains the surface. `get(id)` returns active handles; `size` excludes exiting members. Dispose the container before its renderer.

## Unions and namespaces

The namespace scopes IDs and is generated when omitted. All default members share one union. Set `union:'leading'` or another key to partition effects. Union membership is stable for an identity; use a new ID when moving an effect to another union. Material, layer, vibrancy and spacing are shared by container configuration. `container.material(partial, animate=true)` updates existing groups and the material of future members.

Spacing is measured in CSS pixels. A larger value blends nearby contours sooner. Up to 32 active and exiting members can share one union. All rectangles, IDs and union capacity are validated before reconciliation. Shape resources must be created with `createGlassShape`.

## Transitions

| Transition | Behavior |
|---|---|
| `matchedGeometry` | A new nearby effect starts at the closest prior geometry in its union; a removed effect travels into a nearby remaining one. Material reveal changes along with geometry. |
| `materialize` | Reveals or hides material at its own geometry, without matching a neighbor. |
| `identity` | Applies the change immediately. |

Each item can override the container transition. `{animate:false}` makes a reconciliation immediate. Layout updates can interrupt active transitions; returned promises report `{finished:false}` for interrupted motion. Reduced Motion makes transitions immediate through renderer policy.

`shape` replaces the rounded contour, `content` attaches local canvas/image/video content, and `interactive` configures new surfaces. DOM event binding is independent: use the handle with `bindElement`, `bindDrag` or an accessible control. Automatic DOM discovery and SwiftUI view-tree extraction are outside this API.

The container follows the public concepts described by Apple's [custom-view guide](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views). Its matching strategy and motion constants are independently implemented.
