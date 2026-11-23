import SwiftUI

// Add scene.json and the generated reference-backdrop.png to the app target.
// This optional fixture requires an Apple SDK with Liquid Glass support.
struct ReferenceScene: Decodable {
    let width: Double
    let height: Double
    let surfaces: [ReferenceSurface]
}
struct ReferenceSurface: Decodable, Identifiable {
    let id: String
    let variant: String
    let x: Double
    let y: Double
    let width: Double
    let height: Double
    let radius: Double
}
@main
struct NativeReferenceApp: App {
    var body: some Scene {
        WindowGroup { NativeReferenceView() }
    }
}
struct NativeReferenceView: View {
    private let scene: ReferenceScene = {
        let url = Bundle.main.url(forResource: "scene", withExtension: "json")!
        return try! JSONDecoder().decode(ReferenceScene.self, from: Data(contentsOf: url))
    }()
    var body: some View {
        ZStack(alignment: .topLeading) {
            Image("reference-backdrop")
                .resizable()
                .interpolation(.none)
                .frame(width: scene.width, height: scene.height)
            ForEach(scene.surfaces) { surface in
                let material: Glass = surface.variant == "clear" ? .clear : .regular
                Color.clear
                    .frame(width: surface.width, height: surface.height)
                    .glassEffect(material, in: RoundedRectangle(cornerRadius: surface.radius, style: .continuous))
                    .position(x: surface.x + surface.width / 2, y: surface.y + surface.height / 2)
            }
        }
        .frame(width: scene.width, height: scene.height)
        .environment(\.colorScheme, .light)
        .ignoresSafeArea()
    }
}
