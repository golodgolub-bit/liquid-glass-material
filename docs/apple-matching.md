# Matching Apple's visual behavior

Treat matching as a measured calibration task. Public design guidance describes behavior; it does not supply every material coefficient. A successful Snell equation, a familiar silhouette and a passing browser suite do not establish pixel or timing equivalence.

## Fix the reference before tuning

Record the OS build, device, display scale, appearance, transparency/contrast settings, component type and input method. Use the same content and logical geometry in the native and portable scenes. Capture uncompressed or high-quality frames with known timing; messaging-app recompression can alter edge colors and motion cadence.

Start with the [paired fixture and capture protocol](comparison.md). Keep an untouched reference and a separate candidate. Crop identical regions without rescaling one side to hide geometry differences. Compare the edge, interior and shadow independently, followed by the complete composition.

## Tune in an order that exposes causes

1. Match shape, corner profile and layout in logical coordinates.
2. Match rest-state scattering and color on light, dark, text and photographic sources.
3. Tune optical reach, refraction and thickness while keeping raised `bevel` at zero unless the reference has that lighting.
4. Tune `specularIntensity`, `specularWidth` and `edgeContrast` independently.
5. Inspect restrained chromatic fringes on neutral high-contrast detail. Separate dispersed light from color already present in the source.
6. Match press, tracking, release and interruption with timed input, not just final screenshots.

The presets in this library are starting points. Values such as index 1.48 or a particular spring frequency are not extracted Apple constants. The optional Cauchy/Abbe model is a three-channel approximation, not a measured spectrum of Apple's renderer.

## Match a component, not just a material

Apple's [custom-view guidance](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views) couples related surfaces through effect containers and stable identities. Its [control demonstrations](https://developer.apple.com/videos/play/wwdc2025/284/) show transient material changes during interaction. Follow those structural ideas: preserve identity, coordinate content with geometry, and keep the result connected to the gesture.

Measure size-dependent changes in menus and presentations separately from small buttons. Match the semantic state, typography, source layers and focus behavior as well as the optical response. Glass letters, text behind glass and a caption above glass are three distinct arrangements.

## Diagnose a raised-looking patch

Use a neutral uniform background first. Disable explicit bevel, then reflection, then press/impulse response one at a time. If the patch appears only over text or a grid, inspect transmitted coordinates rather than treating it as lighting. For thin contours and union necks, keep `edgeAdaptation: 1`; use the normal diagnostic described in [Edge quality](edge-quality.md). A custom shader or intentional magnification can still make a curved lens, even with decorative bevel disabled.

## Test the implementation on Apple hardware

Use Safari/WebKit and an actual iPhone/iPad at the intended DPR. The default quality caps rendering density for cost; set `maxPixelRatio: 3` when evaluating a 3× display, and check its actual GPU budget. Verify WebGL 2 availability, orientation changes, touch cancellation, foreground/background lifecycle, context restoration, safe areas and live accessibility settings. Automated WebKit engine checks are useful, but [Playwright's WebKit](https://playwright.dev/docs/browsers) is not a branded Safari build and does not simulate every iOS GPU or compositor.

HDR/EDR, native font rendering, proprietary material internals and exact native spring calibration remain outside the verified equivalence claims. Report those limits alongside image/motion differences instead of assigning an unsupported similarity percentage.
