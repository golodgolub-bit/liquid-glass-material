# API Reference

Import runtime values and types from `@liquid-glass/material`; import `@liquid-glass/material/style.css` once. The signatures below are generated from the TypeScript source. Private implementation members are excluded.

## Conventions

| Value | Convention |
|---|---|
| Rectangles, depth, edge width, displacement | CSS pixels in renderer coordinates; origin at the upper left |
| Color, tint, absorption | Three-component RGB tuples; color inputs are sRGB in [0,1] |
| Refractive indices | Dimensionless; `ior` is the glass, `outsideIor` is the surrounding medium |
| Absorption | Nonnegative extinction per CSS pixel; material components are limited to [0,1] |
| Spring frequency / damping | Cycles per second / dimensionless damping ratio |
| Physical spring | Mass, stiffness and viscous damping in a consistent application unit system |
| Velocity / time | CSS pixels per second / seconds; angles are radians |
| Contrast sampling interval | Milliseconds; default `1000 / 15`, independent of animation rate |
| Contrast region | Normalized local coordinates inside the surface rectangle |

`createMaterial()` returns an immutable validated material. `surface.material(partial)` merges fields and animates numeric values; changing the variant starts from that variant's preset. `identity` disables the optical effect and preserves local content. `materialRanges` exposes the validated numeric domain. A weakly damped spring may overshoot internally; values sent to the GPU are constrained to this domain.

Use one `GlassRenderer` per composited scene. Members of the same optical group must share material, spacing, layer and vibrancy. A group accepts up to 32 members. Higher layers refract the completed lower layers when they overlap. Disjoint groups reuse the same cached background scattering.

`surface.rect` is the spring geometry; `surface.state.visualRect` includes touch, reveal and custom deformation. DOM bindings and hit tests use the visual rectangle. Promises resolve with `{finished:false}` when interrupted or disposed. `dispose()` releases resources and event listeners; dispose bindings before their renderer.

`state.baseMaterial` contains current material springs; `state.material` includes optional geometry-dependent response. Read [Material response](material-response.md) before porting manually scaled effects. `state.contrast` reports completed regional measurements. `contrastReady()` returns a contrast state or `null` when unavailable; see [Composited contrast](readability.md) for latency, ink policies and sampled coverage.

`renderer.idle` is true when no frame is active/scheduled and no readability copy/readback remains pending. Wait for it before measuring idle frames; a fixed timeout or a brief gap between slow frames does not establish that the renderer has stopped. Context loss keeps it false until restoration; disposal makes it true.

The renderer owns a single demand-driven animation loop. `addAnimation()` participates in this scheduler; `pause()` stops decorative motion, `cancel()` unregisters it. Reduced Motion bypasses custom deformation and suspends nonessential programs. It does not remove semantic controls or keyboard interaction.

Custom GLSL uses WebGL 2 / GLSL ES 3.00. Managed uniforms are float, vec2, vec3 or vec4 with the `uGlass_` prefix. `setShader()` compiles all passes before swapping the pipeline; an error leaves the previous program running. Uniform changes reuse the program and invalidate custom scattering as needed.

See [Programming](programmability.md), [Ray optics](ray-optics.md), [Effect containers](containers.md), [Text and icons](text-under-glass.md), [Integration](integration.md) and [Compatibility](apple-audit.md) for complete usage examples and platform boundaries.

## GlassMaterial

```ts
export type RGB = readonly [
    number,
    number,
    number
];
export type Quality = 'low' | 'balanced' | 'high';
export type Appearance = 'auto' | 'light' | 'dark';
/** Numeric bounds used for input validation and projecting oscillating springs onto valid optics. */
export declare const materialRanges: Readonly<{
    thickness: readonly [
        number,
        number
    ];
    edgeWidth: readonly [
        number,
        number
    ];
    bevel: readonly [
        number,
        number
    ];
    edgeContrast: readonly [
        number,
        number
    ];
    specularIntensity: readonly [
        number,
        number
    ];
    specularWidth: readonly [
        number,
        number
    ];
    shadowRadius: readonly [
        number,
        number
    ];
    shadowOffset: readonly [
        number,
        number
    ];
    scatterRadius: readonly [
        number,
        number
    ];
    ambientSpill: readonly [
        number,
        number
    ];
    refraction: readonly [
        number,
        number
    ];
    magnification: readonly [
        number,
        number
    ];
    dispersion: readonly [
        number,
        number
    ];
    ior: readonly [
        number,
        number
    ];
    outsideIor: readonly [
        number,
        number
    ];
    abbeNumber: readonly [
        number,
        number
    ];
    reflection: readonly [
        number,
        number
    ];
    cornerPower: readonly [
        number,
        number
    ];
    frost: readonly [
        number,
        number
    ];
    tintOpacity: readonly [
        number,
        number
    ];
    saturation: readonly [
        number,
        number
    ];
    highlight: readonly [
        number,
        number
    ];
    shadow: readonly [
        number,
        number
    ];
    dimming: readonly [
        number,
        number
    ];
}>;
/** All spatial parameters use CSS pixels; colors use sRGB in [0, 1]. */
export interface GlassMaterial {
    variant: 'regular' | 'clear' | 'identity';
    appearance: Appearance;
    /** Optical path depth in CSS pixels. Independent from the edge roll width. */
    thickness: number;
    /** Width of optical lensing in CSS pixels. Independent from decorative bevel. */
    edgeWidth: number;
    /** Optional raised edge shading, [0,1]. Disabled by default. */
    bevel: number;
    /** Narrow contrast contour, independent from decorative bevel. */
    edgeContrast: number;
    /** Edge illumination independent from raised bevel shading. */
    specularIntensity: number;
    specularWidth: number;
    shadowRadius: number;
    shadowOffset: number;
    /** Effective interpolation radius of the cached scattering kernels, CSS pixels. */
    scatterRadius: number;
    /** Local ambient color carried into the surface and its shadow. */
    ambientSpill: number;
    refraction: number;
    /** Interior image scale [0.5,2]; values below one minify transmitted content. */
    magnification: number;
    dispersion: number;
    /** Refractive index and strength of environment reflection. */
    ior: number;
    /** Refractive index of the surrounding medium. Refraction uses outsideIor / ior. */
    outsideIor: number;
    /** Vd dispersion: 0 keeps artistic RGB separation; positive values enable Cauchy RGB indices. */
    abbeNumber: number;
    /** Beer-Lambert extinction coefficients per CSS pixel, RGB, [0,1]. */
    absorption: RGB;
    reflection: number;
    /** Continuous corner profile; circles and full capsules stay circular. */
    cornerPower: number;
    /** Mix of shared blurred backdrop and sharp transmission, [0, 1]. */
    frost: number;
    tint: RGB;
    tintOpacity: number;
    saturation: number;
    highlight: number;
    shadow: number;
    /** Localized darkening, particularly useful for Clear over bright media. */
    dimming: number;
}
export declare const materials: Readonly<{
    regular: Readonly<{
        variant: "regular" | "clear" | "identity";
        appearance: Appearance;
        /** Optical path depth in CSS pixels. Independent from the edge roll width. */
        thickness: number;
        /** Width of optical lensing in CSS pixels. Independent from decorative bevel. */
        edgeWidth: number;
        /** Optional raised edge shading, [0,1]. Disabled by default. */
        bevel: number;
        /** Narrow contrast contour, independent from decorative bevel. */
        edgeContrast: number;
        /** Edge illumination independent from raised bevel shading. */
        specularIntensity: number;
        specularWidth: number;
        shadowRadius: number;
        shadowOffset: number;
        /** Effective interpolation radius of the cached scattering kernels, CSS pixels. */
        scatterRadius: number;
        /** Local ambient color carried into the surface and its shadow. */
        ambientSpill: number;
        refraction: number;
        /** Interior image scale [0.5,2]; values below one minify transmitted content. */
        magnification: number;
        dispersion: number;
        /** Refractive index and strength of environment reflection. */
        ior: number;
        /** Refractive index of the surrounding medium. Refraction uses outsideIor / ior. */
        outsideIor: number;
        /** Vd dispersion: 0 keeps artistic RGB separation; positive values enable Cauchy RGB indices. */
        abbeNumber: number;
        /** Beer-Lambert extinction coefficients per CSS pixel, RGB, [0,1]. */
        absorption: RGB;
        reflection: number;
        /** Continuous corner profile; circles and full capsules stay circular. */
        cornerPower: number;
        /** Mix of shared blurred backdrop and sharp transmission, [0, 1]. */
        frost: number;
        tint: RGB;
        tintOpacity: number;
        saturation: number;
        highlight: number;
        shadow: number;
        /** Localized darkening, particularly useful for Clear over bright media. */
        dimming: number;
    }>;
    clear: Readonly<{
        variant: "clear";
        frost: 0.08;
        scatterRadius: 6;
        refraction: 17;
        thickness: 16;
        highlight: 0.6;
        appearance: Appearance;
        /** Width of optical lensing in CSS pixels. Independent from decorative bevel. */
        edgeWidth: number;
        /** Optional raised edge shading, [0,1]. Disabled by default. */
        bevel: number;
        /** Narrow contrast contour, independent from decorative bevel. */
        edgeContrast: number;
        /** Edge illumination independent from raised bevel shading. */
        specularIntensity: number;
        specularWidth: number;
        shadowRadius: number;
        shadowOffset: number;
        /** Local ambient color carried into the surface and its shadow. */
        ambientSpill: number;
        /** Interior image scale [0.5,2]; values below one minify transmitted content. */
        magnification: number;
        dispersion: number;
        /** Refractive index and strength of environment reflection. */
        ior: number;
        /** Refractive index of the surrounding medium. Refraction uses outsideIor / ior. */
        outsideIor: number;
        /** Vd dispersion: 0 keeps artistic RGB separation; positive values enable Cauchy RGB indices. */
        abbeNumber: number;
        /** Beer-Lambert extinction coefficients per CSS pixel, RGB, [0,1]. */
        absorption: RGB;
        reflection: number;
        /** Continuous corner profile; circles and full capsules stay circular. */
        cornerPower: number;
        tint: RGB;
        tintOpacity: number;
        saturation: number;
        shadow: number;
        /** Localized darkening, particularly useful for Clear over bright media. */
        dimming: number;
    }>;
    clearDimmed: Readonly<{
        variant: "clear";
        frost: 0.08;
        scatterRadius: 6;
        refraction: 17;
        thickness: 16;
        highlight: 0.6;
        dimming: 0.35;
        appearance: Appearance;
        /** Width of optical lensing in CSS pixels. Independent from decorative bevel. */
        edgeWidth: number;
        /** Optional raised edge shading, [0,1]. Disabled by default. */
        bevel: number;
        /** Narrow contrast contour, independent from decorative bevel. */
        edgeContrast: number;
        /** Edge illumination independent from raised bevel shading. */
        specularIntensity: number;
        specularWidth: number;
        shadowRadius: number;
        shadowOffset: number;
        /** Local ambient color carried into the surface and its shadow. */
        ambientSpill: number;
        /** Interior image scale [0.5,2]; values below one minify transmitted content. */
        magnification: number;
        dispersion: number;
        /** Refractive index and strength of environment reflection. */
        ior: number;
        /** Refractive index of the surrounding medium. Refraction uses outsideIor / ior. */
        outsideIor: number;
        /** Vd dispersion: 0 keeps artistic RGB separation; positive values enable Cauchy RGB indices. */
        abbeNumber: number;
        /** Beer-Lambert extinction coefficients per CSS pixel, RGB, [0,1]. */
        absorption: RGB;
        reflection: number;
        /** Continuous corner profile; circles and full capsules stay circular. */
        cornerPower: number;
        tint: RGB;
        tintOpacity: number;
        saturation: number;
        shadow: number;
    }>;
    identity: Readonly<{
        variant: "identity";
        appearance: Appearance;
        /** Optical path depth in CSS pixels. Independent from the edge roll width. */
        thickness: number;
        /** Width of optical lensing in CSS pixels. Independent from decorative bevel. */
        edgeWidth: number;
        /** Optional raised edge shading, [0,1]. Disabled by default. */
        bevel: number;
        /** Narrow contrast contour, independent from decorative bevel. */
        edgeContrast: number;
        /** Edge illumination independent from raised bevel shading. */
        specularIntensity: number;
        specularWidth: number;
        shadowRadius: number;
        shadowOffset: number;
        /** Effective interpolation radius of the cached scattering kernels, CSS pixels. */
        scatterRadius: number;
        /** Local ambient color carried into the surface and its shadow. */
        ambientSpill: number;
        refraction: number;
        /** Interior image scale [0.5,2]; values below one minify transmitted content. */
        magnification: number;
        dispersion: number;
        /** Refractive index and strength of environment reflection. */
        ior: number;
        /** Refractive index of the surrounding medium. Refraction uses outsideIor / ior. */
        outsideIor: number;
        /** Vd dispersion: 0 keeps artistic RGB separation; positive values enable Cauchy RGB indices. */
        abbeNumber: number;
        /** Beer-Lambert extinction coefficients per CSS pixel, RGB, [0,1]. */
        absorption: RGB;
        reflection: number;
        /** Continuous corner profile; circles and full capsules stay circular. */
        cornerPower: number;
        /** Mix of shared blurred backdrop and sharp transmission, [0, 1]. */
        frost: number;
        tint: RGB;
        tintOpacity: number;
        saturation: number;
        highlight: number;
        shadow: number;
        /** Localized darkening, particularly useful for Clear over bright media. */
        dimming: number;
    }>;
}>;
export declare function createMaterial(options?: Partial<GlassMaterial>): Readonly<GlassMaterial>;
```

## GlassRenderer and SurfaceHandle

```ts
import { type GlassMaterial, type Quality, type RGB } from './material.js';
import { type Rect } from './geometry.js';
import { type GlassShader, type ShaderValue } from './shader-program.js';
import { type GlassPhysics, type PhysicsOptions, type DeformationFunction } from './physics.js';
import { type MotionOptions, type MotionResult, type SpringOptions } from './motion.js';
import { type GlassShape } from './shape.js';
import { GlassAnimation, type AnimationCallback, type AnimationOptions } from './animation.js';
import { type ContrastSettings, type ContrastState } from './contrast.js';
import { type SizeAdaptation } from './size-adaptation.js';
/** Canvas/image/video sources with consistent WebGL upload orientation. Draw ImageBitmap/ImageData/VideoFrame into a canvas first. */
export type BackdropSource = HTMLCanvasElement | OffscreenCanvas | HTMLImageElement | HTMLVideoElement;
export interface Accessibility {
    reducedMotion: boolean;
    reducedTransparency: boolean;
    increasedContrast: boolean;
}
export interface ScrollEdges {
    top: number;
    right: number;
    bottom: number;
    left: number;
    hard: boolean;
    color: RGB | null;
}
export interface RendererOptions {
    quality?: Quality;
    maxPixelRatio?: number;
    drawBackdrop?: boolean;
    accessibility?: Partial<Accessibility>;
    /** Optional asynchronous timer queries. CPU submission time is always available. */
    measureGpu?: boolean;
    onError?: (error: Error) => void;
    physics?: PhysicsOptions;
    shader?: GlassShader;
    /** Asynchronous composited-material contrast probes. Enabled by default. */
    readability?: boolean;
    /** Minimum milliseconds between moving-scene contrast probes. Default 1000/15; 0 samples every dirty frame. */
    contrastInterval?: number;
}
export interface SurfaceOptions {
    id: string;
    rect: Rect;
    material?: Partial<GlassMaterial>;
    /** Same group => shared material and SDF union. One material per group. */
    group?: string;
    spacing?: number;
    interactive?: boolean;
    materialize?: boolean;
    hidden?: boolean;
    /** Keep velocity-driven stretch for draggable objects; disable for a rigid panel. */
    elastic?: boolean;
    /** Composite the optional vibrant foreground through this surface's lens. */
    vibrancy?: boolean;
    /** Back-to-front order. Equal layers retain insertion order. A union shares one layer. */
    layer?: number;
    /** SVG contour in place of the rounded rectangle; fitted to rect. */
    shape?: GlassShape;
    /** Local transparent content, painted above this material and visible to higher glass layers. */
    content?: BackdropSource;
    /** Opacity of local foreground content, independent of material visibility. */
    contentOpacity?: number;
    physics?: PhysicsOptions;
    deform?: DeformationFunction;
    contrast?: ContrastSettings | false;
    sizeAdaptation?: Partial<SizeAdaptation> | false;
}
export interface SurfaceState {
    rect: Rect;
    visualRect: Rect;
    velocity: Rect;
    visibility: number;
    contentOpacity: number;
    pressed: number;
    energy: number;
    moving: boolean;
    material: Readonly<GlassMaterial>;
    baseMaterial: Readonly<GlassMaterial>;
    contrast: Readonly<ContrastState>;
}
export interface RenderStats {
    frames: number;
    cpuMs: number;
    gpuMs: number | null;
    drawCalls: number;
    uploads: number;
    blurPasses: number;
    surfaces: number;
    groups: number;
    pixelRatio: number;
    textureBytes: number;
    foregroundUploads: number;
    reflectionUploads: number;
    contentUploads: number;
    contrastCopies: number;
    contrastReadbacks: number;
}
/** A shared backdrop and GPU compositor. Owns no DOM content or application event loop. */
export declare class GlassRenderer {
    readonly canvas: HTMLCanvasElement;
    constructor(canvas: HTMLCanvasElement, options?: RendererOptions);
    get accessibility(): Readonly<Accessibility>;
    get stats(): Readonly<RenderStats>;
    get size(): Readonly<{
        width: number;
        height: number;
    }>;
    get scrollEdges(): Readonly<ScrollEdges>;
    setScrollEdges(options: Partial<ScrollEdges>): void;
    subscribe(listener: (stats: Readonly<RenderStats>) => void): () => void;
    setAccessibility(settings: Partial<Accessibility>): void;
    setQuality(quality: Quality): void;
    setLight(x: number, y: number, animate?: boolean): void;
    resize(width: number, height: number): void;
    /** Source is stretched to the viewport; perform cover/contain cropping in your source canvas. */
    setBackdrop(source: BackdropSource): void;
    /** Full-viewport RGBA layer (e.g. blue active symbols) refracted only by vibrancy-enabled surfaces. */
    setVibrancySource(source: BackdropSource | null, options?: {
        color?: RGB;
    }): void;
    /** Mark modified foreground pixels without replacing the source or selected color. */
    updateVibrancy(): void;
    /** A separate equirectangular reflection environment. Null returns to reflected backdrop. */
    setReflectionSource(source: BackdropSource | null): void;
    updateReflection(): void;
    setReflectionRotation(radians: number): void;
    /** Run before spring integration and drawing, using the renderer's single scheduler. */
    addAnimation(callback: AnimationCallback, options?: AnimationOptions): GlassAnimation;
    /** Call after modifying a source canvas. Does not upload unchanged pixels on animation frames. */
    updateBackdrop(): void;
    /** Video uploads are scheduled by decoded frames rather than the display refresh rate. */
    bindVideo(video: HTMLVideoElement): () => void;
    addSurface(options: SurfaceOptions): SurfaceHandle;
    getRect(id: string): Rect;
    getForeground(id: string): string;
    getState(id: string): SurfaceState;
    configureContrast(id: string, options: ContrastSettings | false): void;
    configureSizeAdaptation(id: string, options: Partial<SizeAdaptation> | false): void;
    whenContrastReady(id: string): Promise<Readonly<ContrastState> | null>;
    getPhysics(id: string): Readonly<GlassPhysics>;
    configurePhysics(id: string, options: PhysicsOptions): void;
    setDeformation(id: string, fn: DeformationFunction | null): void;
    kick(id: string, velocity: Partial<Rect>): void;
    whenSettled(id: string): Promise<MotionResult>;
    animateSurface(id: string, rect: Partial<Rect>, options?: MotionOptions): Promise<MotionResult>;
    configureMotion(id: string, options: SpringOptions): void;
    setVisibility(id: string, visible: boolean, options?: MotionOptions): Promise<MotionResult>;
    updateSurface(id: string, rect: Partial<Rect>, animate?: boolean): void;
    /** Updates every member of the group, keeping the optical union consistent. */
    setMaterial(id: string, options: Partial<GlassMaterial>, animate?: boolean): void;
    animateMaterial(id: string, options: Partial<GlassMaterial>, motion?: MotionOptions): Promise<MotionResult>;
    setInteraction(id: string, pressed: boolean, x?: number, y?: number): void;
    releaseInteractions(): void;
    setShape(id: string, shape: GlassShape | null, options?: MotionOptions): Promise<MotionResult>;
    setContent(id: string, source: BackdropSource | null): void;
    setContentOpacity(id: string, opacity: number, animate?: boolean): void;
    contains(id: string, x: number, y: number): boolean;
    removeSurface(id: string): void;
    /** No active/scheduled frame or pending readability work. Disposed renderers are idle. */
    get idle(): boolean;
    invalidate(): void;
    /** Compile before replacing the live program. A failure leaves the previous shader intact. */
    setShader(shader: GlassShader | null): void;
    getShader(): GlassShader;
    setShaderUniform(name: string, value: ShaderValue): void;
    getShaderUniform(name: string): ShaderValue | undefined;
    configureLightMotion(options: SpringOptions): void;
    dispose(): void;
}
export declare class SurfaceHandle {
    readonly id: string;
    constructor(renderer: GlassRenderer, id: string);
    get rect(): Rect;
    get foreground(): string;
    get state(): SurfaceState;
    contrast(options: ContrastSettings | false): this;
    contrastReady(): Promise<Readonly<ContrastState> | null>;
    sizeAdaptation(options: Partial<SizeAdaptation> | false): this;
    get physics(): Readonly<GlassPhysics>;
    configurePhysics(options: PhysicsOptions): this;
    deform(fn: DeformationFunction | null): this;
    kick(velocity: Partial<Rect>): this;
    move(rect: Partial<Rect>, animate?: boolean): this;
    motion(options: SpringOptions): this;
    animateTo(rect: Partial<Rect>, options?: MotionOptions): Promise<MotionResult>;
    material(options: Partial<GlassMaterial>, animate?: boolean): this;
    animateMaterial(options: Partial<GlassMaterial>, motion?: MotionOptions): Promise<MotionResult>;
    shape(shape: GlassShape | null, options?: MotionOptions): Promise<MotionResult>;
    content(source: BackdropSource | null): this;
    contentOpacity(opacity: number, animate?: boolean): this;
    contains(x: number, y: number): boolean;
    show(options?: MotionOptions): Promise<MotionResult>;
    hide(options?: MotionOptions): Promise<MotionResult>;
    settled(): Promise<MotionResult>;
    dismiss(options?: MotionOptions): Promise<MotionResult>;
    interact(pressed: boolean, x?: number, y?: number): this;
    remove(): void;
}
```

## contrast

```ts
import type { RGB } from './material.js';
export type ForegroundAppearance = 'auto' | 'light' | 'dark' | 'material';
export interface ContrastRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface ContrastOptions {
    /** material follows GlassMaterial.appearance; auto always chooses readable ink. */
    appearance: ForegroundAppearance;
    /** Normalized local rectangle occupied by foreground, excluding the refracting edge. */
    region: Readonly<ContrastRegion>;
    minimumRatio: number;
    /** Maximum neutral protection opacity for Regular. Clear never adds this protection. */
    protection: number;
}
export type ContrastSettings = Partial<Omit<ContrastOptions, 'region'>> & {
    region?: Partial<ContrastRegion>;
};
export interface ContrastState {
    foreground: 'light' | 'dark';
    source: 'pending' | 'source' | 'composited' | 'explicit';
    ratio: number | null;
    minimumRatio: number;
    meetsTarget: boolean | null;
    protection: number;
}
export declare const foregroundColors: Readonly<{
    dark: RGB;
    light: RGB;
}>;
export declare const protectionColors: Readonly<{
    dark: RGB;
    light: RGB;
}>;
export declare const defaultContrast: Readonly<ContrastOptions>;
export declare function createContrast(options?: ContrastSettings, base?: Readonly<ContrastOptions>): Readonly<ContrastOptions>;
export declare function relativeLuminance(rgb: RGB): number;
export declare function contrastRatio(a: RGB, b: RGB): number;
export interface ContrastEvaluation {
    foreground: 'light' | 'dark';
    ratio: number;
    protection: number;
    meetsTarget: boolean;
}
export interface ContrastBounds {
    minimum: RGB;
    maximum: RGB;
}
/** Solve against conservative component bounds supplied by another compositor. */
export declare function evaluateContrastBounds(bounds: Readonly<ContrastBounds>, options?: Readonly<ContrastOptions>, previous?: 'light' | 'dark', fixed?: 'light' | 'dark'): ContrastEvaluation;
/** Evaluate actual RGB samples. Protection is solved in sRGB, the compositor's mixing space. */
export declare function evaluateContrast(samples: readonly RGB[], options?: Readonly<ContrastOptions>, previous?: 'light' | 'dark', fixed?: 'light' | 'dark'): ContrastEvaluation;
```

## size-adaptation

```ts
import { type GlassMaterial } from './material.js';
export interface MaterialFootprint {
    width: number;
    height: number;
    area?: number;
}
/** Exact union area of axis-aligned member rectangles; empty gaps add no area.
 * Curved silhouettes and SDF bridges still require an application-supplied area. */
export declare function measureMaterialFootprint(rects: readonly {
    x: number;
    y: number;
    width: number;
    height: number;
}[]): Required<MaterialFootprint>;
export interface SizeAdaptation {
    referenceArea: number;
    thickness: number;
    refraction: number;
    frost: number;
    shadow: number;
    shadowRadius: number;
    scatterRadius: number;
}
export declare const defaultSizeAdaptation: Readonly<SizeAdaptation>;
export declare function createSizeAdaptation(options?: Partial<SizeAdaptation>): Readonly<SizeAdaptation>;
/** Effective material at the current geometry; base parameters are never mutated. */
export declare function resolveMaterialForSize(material: Readonly<GlassMaterial>, rect: Readonly<MaterialFootprint>, profile?: Readonly<SizeAdaptation>): Readonly<GlassMaterial>;
```

## effect-container

```ts
import { GlassRenderer, type SurfaceHandle, type BackdropSource } from './renderer.js';
import { type GlassMaterial } from './material.js';
import { type Rect } from './geometry.js';
import { type PhysicsOptions } from './physics.js';
import type { GlassShape } from './shape.js';
import type { SizeAdaptation } from './size-adaptation.js';
import type { ContrastSettings } from './contrast.js';
import type { MotionResult } from './motion.js';
export type GlassEffectTransition = 'matchedGeometry' | 'materialize' | 'identity';
export interface GlassEffectItem {
    id: string;
    rect: Rect;
    union?: string;
    shape?: GlassShape | null;
    content?: BackdropSource | null;
    interactive?: boolean;
    transition?: GlassEffectTransition;
}
export interface GlassEffectContainerOptions {
    namespace?: string;
    spacing?: number;
    layer?: number;
    vibrancy?: boolean;
    material?: Partial<GlassMaterial>;
    physics?: PhysicsOptions;
    transition?: GlassEffectTransition;
    contrast?: ContrastSettings | false;
    sizeAdaptation?: Partial<SizeAdaptation> | false;
}
/** Reconciles stable effect identities without replacing their springs or GPU renderer. */
export declare class GlassEffectContainer {
    readonly namespace: string;
    constructor(renderer: GlassRenderer, options?: GlassEffectContainerOptions);
    get size(): number;
    get(id: string): SurfaceHandle | undefined;
    /** All rectangles and IDs are validated before reconciliation; call again to interrupt a transition. */
    reconcile(items: readonly GlassEffectItem[], options?: {
        animate?: boolean;
    }): Promise<MotionResult[]>;
    material(options: Partial<GlassMaterial>, animate?: boolean): this;
    dispose(): void;
}
```

## physics

```ts
import type { Rect } from './geometry.js';
import type { SpringOptions } from './motion.js';
export interface SpringProfile {
    frequency: number;
    damping: number;
}
export interface GlassPhysics {
    geometry: SpringProfile;
    material: SpringProfile;
    press: SpringProfile;
    reveal: SpringProfile;
    offset: SpringProfile;
    impulse: SpringProfile;
    tone: SpringProfile;
    shape: SpringProfile;
    pressScale: readonly [
        number,
        number
    ];
    attraction: readonly [
        number,
        number
    ];
    velocityScale: number;
    maxStretch: number;
    crossCoupling: number;
    revealScale: number;
    impulseStrength: number;
}
export type PhysicsOptions = Partial<Omit<GlassPhysics, 'geometry' | 'material' | 'press' | 'reveal' | 'offset' | 'impulse' | 'tone' | 'shape'>> & Partial<Record<PhysicsChannel, SpringOptions>>;
export type PhysicsChannel = 'geometry' | 'material' | 'press' | 'reveal' | 'offset' | 'impulse' | 'tone' | 'shape';
export interface DeformationState {
    rect: Readonly<Rect>;
    visualRect: Readonly<Rect>;
    velocity: Readonly<Rect>;
    pressed: number;
    visibility: number;
    offset: readonly [
        number,
        number
    ];
}
/** Pure function: used by rendering, DOM bindings and hit testing; no mutation or side effects. */
export type DeformationFunction = (state: Readonly<DeformationState>) => Rect;
export declare const physicsChannels: readonly PhysicsChannel[];
export declare const defaultPhysics: Readonly<GlassPhysics>;
export declare function createPhysics(options?: PhysicsOptions, base?: Readonly<GlassPhysics>): Readonly<GlassPhysics>;
```

## motion

```ts
import { Spring } from './spring.js';
export interface SpringOptions {
    frequency?: number;
    damping?: number;
}
export interface MotionOptions {
    immediate?: boolean;
    spring?: SpringOptions;
}
export interface MotionResult {
    finished: boolean;
}
export interface PhysicalSpring {
    mass: number;
    stiffness: number;
    damping: number;
}
/** Physical damping coefficient c, not the damping ratio used by SpringOptions. */
export declare function springFromPhysical({ mass, stiffness, damping }: PhysicalSpring): {
    frequency: number;
    damping: number;
};
export declare function springToPhysical(options: Required<SpringOptions>, mass?: number): PhysicalSpring;
export declare const motionPresets: Readonly<{
    responsive: Readonly<{
        frequency: 3.8;
        damping: 0.88;
    }>;
    fluid: Readonly<{
        frequency: 3.1;
        damping: 0.88;
    }>;
    gentle: Readonly<{
        frequency: 2.5;
        damping: 0.96;
    }>;
}>;
export declare function configureSpring(spring: Spring, config?: SpringOptions): void;
export declare function isResting(spring: Spring): boolean;
```

## animation

```ts
import type { GlassRenderer } from './renderer.js';
export interface AnimationFrame {
    time: number; /** Seconds since this controller's previous active frame; zero on start/resume. */
    delta: number;
    frame: number;
    renderer: GlassRenderer;
}
export type AnimationCallback = (frame: Readonly<AnimationFrame>) => void | boolean;
export interface AnimationOptions {
    essential?: boolean;
    paused?: boolean;
}
/** Controlled by the renderer's single requestAnimationFrame scheduler. */
export declare class GlassAnimation {
    readonly essential: boolean;
    constructor(callback: AnimationCallback, request: () => void, remove: () => void, essential?: boolean, paused?: boolean);
    get running(): boolean;
    get elapsed(): number;
    pause(): void;
    resume(): void;
    cancel(): void;
    /** @internal */ suspend(): void;
    /** @internal */ tick(delta: number, renderer: GlassRenderer): void;
}
```

## shader-program

```ts
export type ShaderValue = number | readonly [
    number,
    number
] | readonly [
    number,
    number,
    number
] | readonly [
    number,
    number,
    number,
    number
];
export interface ShaderUniform {
    type: 'float' | 'vec2' | 'vec3' | 'vec4';
    value: ShaderValue;
}
export interface GlassShaderOptions {
    /** Global GLSL declarations/helpers. Uniforms must use the uGlass_ prefix. */
    declarations?: string;
    /** Body of GlassOpticalSample glassOptics(GlassOpticalInput data). */
    optics?: string;
    /** Body of vec4 glassField(vec2 point). Use defaultGlassField(point). */
    field?: string;
    /** Body of vec3 glassShade(vec3 color,vec2 point,vec2 sampleUV,vec3 normal,float depth). */
    shade?: string;
    /** Full fragment replacement. Keep the standard uniform ABI to retain composition. */
    fragment?: string;
    /** Optional full scattering/backdrop passes; preserve their standard uniform ABI. */
    blurFragment?: string;
    backdropFragment?: string;
    uniforms?: Readonly<Record<string, ShaderUniform>>;
}
export interface GlassShader {
    readonly fragment: string;
    readonly blurFragment: string;
    readonly backdropFragment: string;
    readonly uniforms: Readonly<Record<string, Readonly<ShaderUniform>>>;
}
export declare function validateShaderValue(type: ShaderUniform['type'], value: ShaderValue): void;
export declare function createGlassShader(options?: GlassShaderOptions): GlassShader;
export declare const shaderSources: Readonly<{
    vertex: "#version 300 es\nprecision highp float;\nout vec2 uv;\nvoid main() {\n  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));\n  uv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);\n}";
    glass: string;
    copy: "#version 300 es\nprecision highp float;\nin vec2 uv; out vec4 color; uniform sampler2D source;uniform sampler2D blurred;\n\nuniform vec4 scrollEdges;uniform vec2 viewportSize;uniform vec4 edgeColor;uniform float edgeHard;\nvec3 applyScrollEdge(vec3 c,vec2 texcoord){\n  if(max(max(scrollEdges.x,scrollEdges.y),max(scrollEdges.z,scrollEdges.w))<0.001)return c;\n  vec2 p=vec2(texcoord.x,1.0-texcoord.y)*viewportSize;\n  vec4 distances=vec4(p.y,viewportSize.x-p.x,viewportSize.y-p.y,p.x);\n  vec4 f=1.0-smoothstep(vec4(0.0),max(scrollEdges,vec4(0.001)),distances);\n  f*=step(vec4(0.001),scrollEdges);\n  if(edgeHard>0.5)f=step(distances,scrollEdges)*step(vec4(0.001),scrollEdges);\n  float fade=max(max(f.x,f.y),max(f.z,f.w));\n  vec3 ambient=texture(blurred,texcoord).rgb;\n  float l=dot(ambient,vec3(.2126,.7152,.0722));\n  vec3 body=edgeColor.a>0.5?edgeColor.rgb:mix(vec3(.065,.08,.1),vec3(.96,.97,.985),smoothstep(.25,.55,l));\n  return mix(mix(c,ambient,fade*.75),body,fade*.72);\n}\nvoid main() { color = vec4(applyScrollEdge(texture(source, uv).rgb,uv), 1.0); }";
    blur: "#version 300 es\nprecision highp float;\nin vec2 uv; out vec4 color; uniform sampler2D source; uniform vec2 direction;uniform float kernel[7];\nvoid main() {\n  // Dense Gaussian support: stretching a sparse five-tap kernel makes text\n  // split into repeated stripes. Every neighboring blur texel participates.\n  vec3 c=texture(source,uv).rgb*kernel[0];\n  for(int i=1;i<=6;i++){vec2 offset=direction*float(i);c+=(texture(source,uv+offset).rgb+texture(source,uv-offset).rgb)*kernel[i];}\n  color = vec4(c, 1.0);\n}";
}>;
```

## optics

```ts
export type Vec3 = readonly [
    number,
    number,
    number
];
export type Vec2 = readonly [
    number,
    number
];
/** Fraunhofer C, d, F wavelengths in nanometers, used by the RGB Cauchy approximation. */
export declare const spectralWavelengths: Readonly<{
    red: 656.2725;
    green: 587.5618;
    blue: 486.1327;
}>;
/** Two-term Cauchy model from nd and Vd. This does not identify a proprietary UI material. */
export declare function refractiveIndexAtWavelength(ior: number, abbeNumber: number, wavelengthNm: number): number;
export declare function spectralIndices(ior: number, abbeNumber: number): Vec3;
/** Per-channel extinction for a desired transmittance at a positive reference distance. */
export declare function absorptionFromTransmittance(transmittance: Vec3, distance: number): Vec3;
/** Normal points against the incident ray. null means total internal reflection. */
export declare function refractRay(incident: Vec3, normal: Vec3, eta: number): Vec3 | null;
/** Exact unpolarized interface reflectance, not the Schlick approximation. */
export declare function fresnelReflectance(cosIncident: number, n1: number, n2: number): number;
export interface SlabRayOptions {
    incident?: Vec3;
    entryNormal: Vec3;
    exitNormal?: Vec3;
    ior?: number;
    outsideIor?: number;
    thickness: number;
    backdropDistance?: number;
    absorption?: Vec3;
}
export interface SlabRay {
    internal: Vec3 | null;
    outgoing: Vec3 | null;
    offset: Vec2 | null;
    pathLength: number;
    entryReflectance: number;
    exitReflectance: number;
    transmittance: Vec3;
    totalInternalReflection: boolean;
}
/** Two planar interfaces, one transmitted path. No internal bounce tree or 3D scene. */
export declare function traceSlabRay(options: SlabRayOptions): SlabRay;
export interface OpticalProbe {
    depth: number;
    width: number;
    thickness: number;
    refraction: number;
    ior: number;
    outsideIor?: number;
    gradient: Vec2;
    presence?: number;
}
/** CPU reference of the default GPU screen-space kernel. Normal Y is up; gradient Y is down. */
export declare function sampleGlassOptics(data: OpticalProbe): {
    normal: Vec3;
    displacement: Vec2;
};
/** Optional GPU slab path, used in an optics hook. Coordinates are the same as traceSlabRay. */
export declare const slabOpticsGLSL = "\nstruct SlabRay {vec3 internalRay;vec3 outgoingRay;vec2 offset;float pathLength;float transmission;float tir;float valid;};\nfloat slabFresnel(float ci,float n1,float n2){if(n1==n2)return 0.0;float s2=pow(n1/n2,2.0)*(1.0-ci*ci);if(s2>=1.0)return 1.0;float ct=sqrt(1.0-s2);float rs=(n1*ci-n2*ct)/(n1*ci+n2*ct),rp=(n1*ct-n2*ci)/(n1*ct+n2*ci);return(rs*rs+rp*rp)*.5;}\nSlabRay traceSlab(vec3 incident,vec3 entryNormal,vec3 exitNormal,float ior,float outsideIor,float thickness,float gap){\n  vec3 i=normalize(incident),n=normalize(entryNormal),e=normalize(exitNormal),inside=refract(i,n,outsideIor/ior);\n  if(length(inside)<.000001)return SlabRay(inside,vec3(0),vec2(0),0.0,0.0,1.0,0.0);\n  float projection=dot(inside,e);if(projection>=-.000001)return SlabRay(inside,vec3(0),vec2(0),0.0,0.0,0.0,0.0);\n  float path=-thickness*e.z/projection;vec3 outRay=refract(inside,e,ior/outsideIor);\n  if(path<0.0)return SlabRay(inside,outRay,vec2(0),0.0,0.0,0.0,0.0);\n  if(length(outRay)<.000001)return SlabRay(inside,outRay,vec2(0),path,0.0,1.0,0.0);\n  float energy=(1.0-slabFresnel(clamp(-dot(i,n),0.0,1.0),outsideIor,ior))*(1.0-slabFresnel(clamp(-dot(inside,e),0.0,1.0),ior,outsideIor));\n  if(outRay.z>=-.000001)return SlabRay(inside,outRay,vec2(0),path,energy,0.0,0.0);\n  float travel=(-(thickness+gap)-inside.z*path)/outRay.z;if(travel<0.0)return SlabRay(inside,outRay,vec2(0),path,energy,0.0,0.0);\n  return SlabRay(inside,outRay,inside.xy*path+outRay.xy*travel-i.xy*(thickness+gap)/-i.z,path,energy,0.0,1.0);\n}";
```

## shape

```ts
/** A reusable SVG contour. Curves, concave outlines and even-odd holes are supported. */
export interface GlassShape {
    readonly path: string;
    readonly viewBox: readonly [
        number,
        number
    ];
    readonly fillRule: CanvasFillRule;
}
export declare const shapeResolution = 256;
/** Rasterized once, uploaded once. Moving/resizing a shape never runs a CPU distance transform. */
export declare function createGlassShape(options: {
    path: string;
    viewBox?: readonly [
        number,
        number
    ];
    fillRule?: CanvasFillRule;
}): GlassShape;
export declare function shapePixels(shape: GlassShape): Uint8Array;
export declare function blendShapes(a: GlassShape, b: GlassShape, progress: number): GlassShape;
export declare function roundedShape(width: number, height: number, radius: number): GlassShape;
export declare function shapeContains(shape: GlassShape, x: number, y: number): boolean;
export declare function shapeDistance(shape: GlassShape, x: number, y: number, width: number, height: number): number;
```

## dom

```ts
import { GlassRenderer, type SurfaceOptions, type SurfaceHandle } from './renderer.js';
export interface ElementBinding {
    surface: SurfaceHandle;
    refresh: (animate?: boolean) => void;
    dispose: () => void;
}
/** Bind semantic DOM content to a GPU surface. The root canvas must have no CSS transform. */
export declare function bindElement(renderer: GlassRenderer, element: HTMLElement, options: Omit<SurfaceOptions, 'rect'> & {
    radius?: number;
}): ElementBinding;
/** Measures only on resize; returns the teardown callback. */
export declare function observeSize(renderer: GlassRenderer): () => void;
```

## drag

```ts
import type { GlassRenderer, SurfaceHandle } from './renderer.js';
import type { Rect } from './geometry.js';
import type { SpringOptions } from './motion.js';
export interface DragOptions {
    surface: SurfaceHandle;
    bounds?: () => Rect;
    onStart?: () => void;
    onEnd?: () => void;
    followSpring?: SpringOptions;
    releaseSpring?: SpringOptions;
}
/** Fast critically damped tracking during a grab; a softer spring releases the deformation. */
export declare function bindDrag(renderer: GlassRenderer, element: HTMLElement, options: DragOptions): {
    dispose: () => void;
    readonly dragging: boolean;
};
```

## selection

```ts
import type { GlassRenderer, SurfaceHandle } from './renderer.js';
import { type GlassMaterial } from './material.js';
import { type PhysicsOptions } from './physics.js';
import type { SpringOptions } from './motion.js';
export interface SelectionLiftOptions {
    /** Width/height multipliers relative to the selected item's resting rectangle. */
    scale?: readonly [
        number,
        number
    ];
    /** Lift offset in renderer CSS pixels. */
    offset?: readonly [
        number,
        number
    ];
    material?: Partial<GlassMaterial>;
    trackingSpring?: SpringOptions;
    releaseSpring?: SpringOptions;
}
export interface LiquidSelectionOptions {
    id: string;
    items: readonly HTMLElement[];
    initialIndex?: number;
    vibrancy?: boolean;
    material?: Partial<GlassMaterial>;
    physics?: PhysicsOptions;
    lift?: SelectionLiftOptions;
    onSelect?: (index: number) => void;
}
export interface LiquidSelection {
    surface: SurfaceHandle;
    readonly selectedIndex: number;
    select: (index: number, animate?: boolean) => void;
    refresh: () => void;
    dispose: () => void;
}
/** A touch-tracking lens lifts off a navigation rail, magnifies its foreground, then snaps back. */
export declare function bindLiquidSelection(renderer: GlassRenderer, element: HTMLElement, options: LiquidSelectionOptions): LiquidSelection;
```

## highlight

```ts
import type { GlassRenderer, SurfaceHandle } from './renderer.js';
import type { GlassMaterial } from './material.js';
export interface HighlightOptions {
    id: string;
    items: readonly HTMLElement[];
    layer?: number;
    material?: Partial<GlassMaterial>;
}
export interface LiquidHighlight {
    surface: SurfaceHandle;
    select: (index: number) => void;
    refresh: () => void;
    dispose: () => void;
}
/** A single moving material boundary for menu rows, hover, keyboard focus and held selection. */
export declare function bindLiquidHighlight(renderer: GlassRenderer, element: HTMLElement, options: HighlightOptions): LiquidHighlight;
```

## components

```ts
import { type ElementBinding } from './dom.js';
import { GlassRenderer, type SurfaceOptions } from './renderer.js';
export type ControlOptions = Omit<SurfaceOptions, 'id' | 'rect'> & {
    id?: string;
    radius?: number;
};
export interface Control<T extends HTMLElement> extends ElementBinding {
    element: T;
}
export declare function glassButton(renderer: GlassRenderer, parent: HTMLElement, label: string, options?: ControlOptions): Control<HTMLButtonElement>;
export { glassToggle } from './toggle.js';
export type { ToggleControl, ToggleOptions } from './toggle.js';
export interface SliderControl extends Control<HTMLDivElement> {
    input: HTMLInputElement;
    setValue: (value: number) => void;
    setPressed: (pressed: boolean) => void;
}
export declare function glassSlider(renderer: GlassRenderer, parent: HTMLElement, label: string, value?: number, options?: ControlOptions & {
    min?: number;
    max?: number;
    step?: number;
}): SliderControl;
export interface TabsControl extends Control<HTMLDivElement> {
    select: (index: number) => void;
    readonly selectedIndex: number;
}
export declare function glassTabs(renderer: GlassRenderer, parent: HTMLElement, labels: readonly string[], options?: ControlOptions & {
    label?: string;
}): TabsControl;
```

## toggle

```ts
import { type GlassMaterial, type RGB } from './material.js';
import type { GlassRenderer, SurfaceHandle } from './renderer.js';
import type { SpringOptions } from './motion.js';
import type { Control, ControlOptions } from './components.js';
export type ToggleOptions = ControlOptions & {
    disabled?: boolean;
    onChange?: (checked: boolean) => void;
    accentColor?: RGB;
    offColor?: RGB;
    thumbColor?: RGB;
    activeMaterial?: Partial<GlassMaterial>;
    activeContentOpacity?: number;
    trackingSpring?: SpringOptions;
    releaseSpring?: SpringOptions;
    /** Display position-independent on/off marks in addition to color. */
    onOffLabels?: boolean;
};
export interface ToggleControl extends Control<HTMLButtonElement> {
    readonly checked: boolean;
    readonly disabled: boolean;
    readonly track: HTMLElement;
    readonly thumb: HTMLElement;
    readonly trackSurface: SurfaceHandle;
    /** Programmatic updates do not emit change. */
    setChecked: (checked: boolean, animate?: boolean) => void;
    setDisabled: (disabled: boolean) => void;
    setPressed: (pressed: boolean) => void;
}
/** An opaque resting thumb becomes a refractive lens during captured interaction. */
export declare function glassToggle(renderer: GlassRenderer, parent: HTMLElement, label: string, initial?: boolean, options?: ToggleOptions): ToggleControl;
```

## presentation

```ts
import { GlassRenderer, type SurfaceHandle } from './renderer.js';
import type { GlassMaterial } from './material.js';
import type { Rect } from './geometry.js';
import type { MotionResult } from './motion.js';
export interface PanelOptions {
    id?: string;
    parent?: HTMLElement;
    width?: number;
    height?: number;
    radius?: number;
    material?: Partial<GlassMaterial>;
    destination?: () => Rect;
    /** Rounded transient contour during menu expansion and retraction. */
    liquidMorph?: boolean;
}
export interface PanelController {
    element: HTMLDivElement;
    surface: SurfaceHandle;
    readonly isOpen: boolean;
    open: () => Promise<MotionResult>;
    close: () => Promise<MotionResult>;
    toggle: () => Promise<MotionResult>;
    refresh: () => void;
    dispose: () => void;
}
export interface MenuItem {
    label: string;
    onSelect?: () => void;
    disabled?: boolean;
    separator?: boolean;
}
export declare function glassPopover(renderer: GlassRenderer, anchor: HTMLElement, items: readonly MenuItem[], options?: PanelOptions): PanelController;
export interface SheetController extends PanelController {
    setDetent: (detent: 'medium' | 'large') => Promise<MotionResult>;
}
export declare function glassSheet(renderer: GlassRenderer, anchor: HTMLElement, content: HTMLElement, options?: PanelOptions): SheetController;
```

## search

```ts
import type { GlassRenderer } from './renderer.js';
import type { Control, ControlOptions } from './components.js';
import type { MotionResult } from './motion.js';
export interface SearchControl extends Control<HTMLDivElement> {
    input: HTMLInputElement;
    expand: () => Promise<MotionResult>;
    collapse: () => Promise<MotionResult>;
    readonly expanded: boolean;
}
export declare function glassSearch(renderer: GlassRenderer, parent: HTMLElement, options?: ControlOptions & {
    placeholder?: string;
    width?: number;
}): SearchControl;
```

## scroll

```ts
import type { GlassRenderer, SurfaceHandle } from './renderer.js';
import type { Rect } from './geometry.js';
export interface ScrollBehaviorOptions {
    surface: SurfaceHandle;
    expanded: Rect;
    collapsed: Rect;
    edge?: 'top' | 'bottom';
    edgeExtent?: number;
    threshold?: number;
    onScroll?: (offset: number) => void;
}
/** Direction-aware minimization with hysteresis. The application supplies its scrolling backdrop. */
export declare function bindScrollBehavior(renderer: GlassRenderer, scroller: HTMLElement, options: ScrollBehaviorOptions): {
    refresh: () => void;
    dispose: () => void;
};
```

## environment

```ts
import type { GlassRenderer } from './renderer.js';
export interface EnvironmentLight {
    requestDeviceOrientation: () => Promise<boolean>;
    dispose: () => void;
}
/** Pointer-driven specular light; device orientation is enabled only by an explicit caller action. */
export declare function bindEnvironmentLight(renderer: GlassRenderer, element: HTMLElement, options?: {
    strength?: number;
}): EnvironmentLight;
```

## media

```ts
import type { GlassRenderer } from './renderer.js';
export interface MediaBackdropOptions {
    fit?: 'cover' | 'contain' | 'fill';
    maxPixelRatio?: number;
    background?: string;
    onError?: (error: Error) => void;
}
export interface MediaBackdropBinding {
    canvas: HTMLCanvasElement;
    refresh: () => void;
    dispose: () => void;
}
/** Capture decoded media with the same crop as its viewport; no stretching unless explicitly requested. */
export declare function bindMediaBackdrop(renderer: GlassRenderer, source: HTMLImageElement | HTMLVideoElement, options?: MediaBackdropOptions): MediaBackdropBinding;
```

## dom-backdrop

```ts
import type { GlassRenderer } from './renderer.js';
export declare function supportsDomBackdrop(): boolean;
export interface DomBackdropBinding {
    canvas: HTMLCanvasElement;
    refresh: () => void;
    dispose: () => void;
    readonly paints: number;
}
/** Live native DOM rasterization. The content must be inside this dedicated source canvas. */
export declare function bindDomBackdrop(renderer: GlassRenderer, canvas: HTMLCanvasElement, content: HTMLElement, options?: {
    maxPixelRatio?: number;
    background?: string;
    foreground?: boolean;
    onError?: (error: Error) => void;
}): DomBackdropBinding;
```

## spring

```ts
/** Closed-form damped spring: stable across refresh rates and long frame gaps. */
export declare class Spring {
    frequency: number;
    damping: number;
    value: number;
    target: number;
    velocity: number;
    constructor(value: number, frequency?: number, damping?: number);
    snap(value?: number): void;
    step(seconds: number): boolean;
}
```

## geometry

```ts
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
}
export declare function validateRect(rect: Rect): void;
export declare function roundedRectDistance(x: number, y: number, rect: Rect): number;
export declare function smoothUnion(a: number, b: number, spacing: number): number;
```

## index

```ts
export { GlassRenderer, SurfaceHandle } from './renderer.js';
export type { RendererOptions, SurfaceOptions, SurfaceState, ScrollEdges, Accessibility, RenderStats, BackdropSource } from './renderer.js';
export { motionPresets } from './motion.js';
export { springFromPhysical, springToPhysical } from './motion.js';
export type { PhysicalSpring } from './motion.js';
export { createPhysics, defaultPhysics } from './physics.js';
export type { GlassPhysics, PhysicsOptions, PhysicsChannel, DeformationState, DeformationFunction } from './physics.js';
export { createGlassShader, shaderSources } from './shader-program.js';
export type { GlassShader, GlassShaderOptions, ShaderUniform, ShaderValue } from './shader-program.js';
export { refractRay, fresnelReflectance, traceSlabRay, sampleGlassOptics, slabOpticsGLSL } from './optics.js';
export { spectralWavelengths, refractiveIndexAtWavelength, spectralIndices, absorptionFromTransmittance } from './optics.js';
export type { Vec2, Vec3, SlabRay, SlabRayOptions, OpticalProbe } from './optics.js';
export type { MotionOptions, MotionResult, SpringOptions } from './motion.js';
export { GlassAnimation } from './animation.js';
export type { AnimationFrame, AnimationCallback, AnimationOptions } from './animation.js';
export { createMaterial, materials, materialRanges } from './material.js';
export type { GlassMaterial, Quality, Appearance, RGB } from './material.js';
export { createContrast, defaultContrast, contrastRatio, relativeLuminance, foregroundColors, protectionColors, evaluateContrast, evaluateContrastBounds } from './contrast.js';
export type { ContrastSettings, ContrastOptions, ContrastRegion, ContrastState, ForegroundAppearance, ContrastEvaluation, ContrastBounds } from './contrast.js';
export { createSizeAdaptation, defaultSizeAdaptation, resolveMaterialForSize, measureMaterialFootprint } from './size-adaptation.js';
export type { SizeAdaptation, MaterialFootprint } from './size-adaptation.js';
export { Spring } from './spring.js';
export { roundedRectDistance, smoothUnion } from './geometry.js';
export type { Rect } from './geometry.js';
export { GlassEffectContainer } from './effect-container.js';
export type { GlassEffectItem, GlassEffectTransition, GlassEffectContainerOptions } from './effect-container.js';
export { createGlassShape } from './shape.js';
export type { GlassShape } from './shape.js';
export { bindElement, observeSize } from './dom.js';
export type { ElementBinding } from './dom.js';
export { glassButton, glassToggle, glassSlider, glassTabs } from './components.js';
export type { Control, ControlOptions, ToggleControl, ToggleOptions, SliderControl, TabsControl } from './components.js';
export { glassPopover, glassSheet } from './presentation.js';
export type { PanelController, PanelOptions, SheetController, MenuItem } from './presentation.js';
export { glassSearch } from './search.js';
export type { SearchControl } from './search.js';
export { bindScrollBehavior } from './scroll.js';
export type { ScrollBehaviorOptions } from './scroll.js';
export { bindDomBackdrop, supportsDomBackdrop } from './dom-backdrop.js';
export type { DomBackdropBinding } from './dom-backdrop.js';
export { bindLiquidSelection } from './selection.js';
export type { LiquidSelection, LiquidSelectionOptions, SelectionLiftOptions } from './selection.js';
export { bindLiquidHighlight } from './highlight.js';
export type { LiquidHighlight, HighlightOptions } from './highlight.js';
export { bindEnvironmentLight } from './environment.js';
export type { EnvironmentLight } from './environment.js';
import './style.css';
export { bindDrag } from './drag.js';
export type { DragOptions } from './drag.js';
export { bindMediaBackdrop } from './media.js';
export type { MediaBackdropOptions, MediaBackdropBinding } from './media.js';
```
