# Matched reference captures

Exact native equivalence requires native evidence. A passed library regression suite, a physically named equation or a visually similar screenshot cannot establish it. No native-versus-library error score has been measured for this release.

## Static optical fixture

`examples/reference/scene.json` defines a fixed 960×640 scene with Regular and Clear capsules on bright and dark grids, plus a larger Regular panel over a colored line pattern. The browser fixture contains no label text and disables readability protection to isolate material optics. Size response remains enabled. The optional SwiftUI fixture applies the native Regular/Clear effects to the same rectangles. The native framework chooses its own size response.

1. Start the development server and run `node tools/capture-reference.mjs`. Set `REFERENCE_DPR=2` for a 2× capture. The tool saves the canonical background PNG, the web rendering and capture metadata under `artifacts/reference/`.
2. On a Mac, create a SwiftUI application with a deployment target that supports Liquid Glass. Replace its app file with `examples/reference/NativeReference.swift`. Add `scene.json` to the target and add the generated `reference-backdrop.png` as an image named `reference-backdrop`.
3. Run at the same logical size on the chosen Apple device/OS. Crop to the fixture's exact 960×640-point bounds and preserve its native pixel scale. Do not resize a screenshot after capture. Match appearance and accessibility settings. The SwiftUI fixture forces light appearance; Reduce Transparency and Increase Contrast must be off.
4. Save an opaque sRGB native capture beside `web.png`. Record device, exact OS build, display scale, appearance, accessibility settings, color conversion, capture method and library commit. Native screen capture, rather than SwiftUI `ImageRenderer`, is necessary to verify the live compositor.
5. Run `node tools/compare-reference.mjs native.png web.png`. The tool rejects different dimensions and nonopaque input. It reports RGB MAE, RMSE, maximum channel error and changed pixels. Smaller errors can guide calibration; these metrics are not perceptual similarity percentages. Check edge and interior crops separately rather than letting the large unchanged background dominate a full-frame score.

The optional SwiftUI source is a capture aid, not an Apple-platform implementation of this library. It has not been compiled or captured in the Windows validation environment. Confirm its output and background alignment on the target device before treating it as a reference. The shared PNG avoids differences between browser and Core Graphics drawing of the grid, but native shape and display composition can still differ.

## Motion measurement

Use a separate identical interaction for geometry and motion. Fix initial/final rectangles, input timing, press location, scroll trajectory and presentation rate. Record frame timestamps and track the contour's center, width and height. Compare onset delay, peak stretch, overshoot, settling time and velocity continuity. Align by recorded input time rather than selecting the most similar frame. Keep optical and motion calibration separate.

The supplied independent spring presets are configurable starting points. Native constants, device sampling and compositor timing have not been recovered from a matched capture. See [Validation](validation.md), [Material response](material-response.md) and [Compatibility](apple-audit.md).
