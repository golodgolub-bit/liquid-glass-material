# Design references

The material's interaction vocabulary follows public Apple documentation. Its renderer, optical approximations and motion presets are independently implemented and released under MIT.

## Apple design and APIs

- [Materials](https://developer.apple.com/design/human-interface-guidelines/materials): material hierarchy, Regular/Clear and accessibility.
- [Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views): containers, effect identities, unions and transitions.
- [Glass](https://developer.apple.com/documentation/swiftui/glass): material variants and configuration.
- [GlassEffectContainer](https://developer.apple.com/documentation/swiftui/glasseffectcontainer): shared geometry and spacing.
- [GlassEffectTransition](https://developer.apple.com/documentation/swiftui/glasseffecttransition): matched geometry, materialize and identity.
- [Spring](https://developer.apple.com/documentation/swiftui/spring): physical and perceptual spring parameterization.
- [Meet Liquid Glass, WWDC25/219](https://developer.apple.com/videos/play/wwdc2025/219/): optical and interactive design demonstrations.
- [Platforms State of the Union, WWDC26/102](https://developer.apple.com/videos/play/wwdc2026/102/): subsequent design refinements.

## Rendering references

- [Khronos: refract](https://registry.khronos.org/OpenGL-Refpages/gl4/html/refract.xhtml): the vector refraction function.
- [Khronos: WebGL 2](https://registry.khronos.org/webgl/specs/latest/2.0/): texture, framebuffer and GLSL behavior.
- [Physically Based Rendering: Specular Reflection and Transmission](https://www.pbr-book.org/4ed/Reflection_Models/Specular_Reflection_and_Transmission): wavelength-dependent refractive index and spectral transmission.
- [SCHOTT: optical glass data](https://www.schott.com/en-gb/products/optical-glass-p1000267): physical index/dispersion terminology. A physical glass dataset is not a specification of Apple's digital material.

See [Ray optics](ray-optics.md) for the implemented equations and coordinate conventions, and [Compatibility](apple-audit.md) for an explicit feature boundary.

## Gallery artwork

The gallery is rendered by the library itself. The paper study uses the opening paragraph of Jane Austen's *Pride and Prejudice* (1813), a public-domain work. Layout, gradients, paper texture and interface artwork are original procedural scenes. The repository contains no extracted Apple imagery or third-party video frames.
