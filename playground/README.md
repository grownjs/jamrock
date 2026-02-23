# Jamrock Playground

An interactive playground for Jamrock applications using WebContainer API.

## Features

- **CodeMirror 6** editor with syntax highlighting
- **xterm.js** terminal for output
- **WebContainer** for running Jamrock in the browser
- **Starter templates**: Hello World, Counter, Todo App

## Requirements

This playground requires browsers with `SharedArrayBuffer` support, which needs:

- Cross-Origin-Opener-Policy: same-origin
- Cross-Origin-Embedder-Policy: require-corp

For local development, you need to serve the playground with these headers.

## Usage

1. Open `index.html` in a browser (with proper COOP/COEP headers)
2. Select a template from the dropdown
3. Edit files in the editor
4. See the live preview on the right

## Development

```bash
# Serve with proper headers (requires a server)
npx serve . --cors

# Or use a simple HTTP server with headers configured
```

## Notes

- The playground uses CDN imports via esm.sh for dependencies
- Jamrock modules are loaded from the npm package
- Changes are saved automatically to the virtual filesystem
