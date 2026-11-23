# Native launchers and desktop themes

The material engine renders pixels and motion. A launcher additionally owns application discovery, icon loading, launch actions, shortcuts, drag-and-drop, lifecycle and platform policy. Keep that native capability layer separate from theme configuration and optical rendering.

## Android

Use a native activity with an Android WebView for the material view. A launcher must qualify for and request the [HOME role](https://developer.android.com/reference/android/app/role/RoleManager#ROLE_HOME); the required intent handling is described by [RoleManagerCompat](https://developer.android.com/reference/androidx/core/role/RoleManagerCompat#ROLE_HOME()). A web page alone cannot become the Android home app.

Expose a narrow bridge for application IDs, icons and allowed launch actions. Resolve launch targets in native code. Do not interpret arbitrary theme strings as shell commands or intents. Forward configuration changes, system accessibility settings, back navigation, pause/resume and capture updates into the web scene.

The included Android host prepares WebView assets. It is not a complete HOME launcher and has not been SDK-built or performance-validated on Android in the Windows workflow. Test actual GPU drivers, texture limits, context loss and memory pressure on target devices before shipping.

## Windows

Use WebView2 or Electron to host the material scene. Native code supplies window operations, application discovery and any explicitly authorized capture. WebView2's [web/native messaging model](https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/communicate-btwn-web-native) is the integration boundary; validate message types and identifiers in the host.

A standalone HTML file can demonstrate a dock, but it does not acquire shell replacement privileges or automatically read the desktop. Keep window bounds, display scaling, monitor coordinates and source capture synchronized. The library's `layer()` changes order inside its compositor, not the Windows window manager.

The included Windows host prepares assets for a WebView2 application. Native SDK compilation, capture latency and multi-monitor behavior still need device testing.

## iOS and iPadOS

For a native application on Apple platforms, use Apple's own material APIs where possible. The portable library can run inside a compatible web view, but cannot expose UIKit/SwiftUI glass as a cross-platform binary or change another application's system UI. Follow [Apple matching](apple-matching.md) when reproducing a particular appearance outside the native APIs.

## A useful host contract

Keep messages structured: `listApplications`, `launchApplication(id)`, `setWindowBounds(rect)` and explicit capture lifecycle events. The host owns authorization and OS resources; the scene owns geometry, material, semantic controls and animation. Version this contract separately from theme data. Preserve a functional dense/opaque fallback when WebGL 2 or source capture is unavailable.
