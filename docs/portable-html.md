# HTML examples and publishing

Two builds serve different purposes:

| Command | Output | Use |
|---|---|---|
| `npm run build:demo` | `dist-demo/` | Static HTML with shared module/CSS assets; serve over HTTP(S) |
| `npm run build:html` | `dist-html/` | Each interactive HTML file embeds its JavaScript and CSS; it can also open from disk |

Both builds compile the current source tree. They do not download an older library version from a CDN. Built example pages include a `liquid-glass-version` meta tag. The portable build also includes `version.json`. Keep all files from one build together; replacing only an HTML entry in a module build can leave mismatched asset hashes.

## Open without a development server

Extract the HTML examples archive and open `index.html`. Individual examples are under `examples/<name>/index.html`; documentation is under `docs/index.html`. Navigation uses relative paths, and interactive JavaScript/CSS is embedded in each demonstration. Copy a single interactive HTML file if you need only that scene; documentation links require the accompanying folders.

The standard examples use procedural sources and make no required HTTP requests. Optional local media, browser permissions, host capture and experimental HTML-in-Canvas remain subject to browser restrictions. Opening a file does not grant access to unrelated windows or other apps. A WebGL 2-capable browser is required.

## Publish to a public origin

Upload the complete `dist-html/` directory to a static HTTPS host, preserving paths and `index.html`. GitHub Pages can publish this directory through the repository's deployment workflow. A public host name does not depend on the developer's machine, current IP address or whether the development server is running. Network filtering or a VPN can still block a particular host; no deployment can guarantee reachability through every network policy.

Development loopback addresses refer to the computer opening the URL. They are useful for local tests, not public demo links. Do not publish home-network addresses, tunnel credentials or machine-specific filesystem paths as deployment configuration. The examples need no such configuration.

## Validate a distribution

```sh
npm run build:html
npm run check:html
```

The check scans static links and opens real file URLs. It exercises the controls and layer transition while rejecting unexpected HTTP requests and page errors. Use a private browser context to avoid mistaking cached development content for the release. Verify `version.json` on the public site after deployment.

For an application integration, install the library package instead of extracting code from a minified demo. See [Quick start](quick-start.md) and [Integration](integration.md).
