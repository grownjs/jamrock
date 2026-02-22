# GTK4/GJS Runtime

Jamrock can run under GJS (GNOME JavaScript) with libsoup 3 as the HTTP backend.

## Prerequisites

```bash
# macOS
brew install gjs gtk4 libsoup

# Verify versions
gjs --version          # >= 1.70
pkg-config --modversion libsoup-3.0
pkg-config --modversion glib-2.0
```

## Running

```bash
# Initialize a project
make gjs-check GJS_ARGS="init my-app"

# Build
make gjs-check GJS_ARGS="build --src my-app"

# Serve
make gjs-serve
```

## Known Limitations

- **WebSocket**: Not yet implemented (Phase 5 deferred)
- **Streaming responses**: Limited by sync nature of certain operations
- **No native hot reload**: File watcher uses Gio.FileMonitor

## Supported Features

- ✅ SSR rendering with async/await
- ✅ Session management with HMAC encoding
- ✅ File system operations (fs, path)
- ✅ Environment variables
- ✅ Static file serving
- ✅ Template compilation
- ✅ Console API
- ✅ fetch() implementation

## Files

| File | Purpose |
|---|---|
| `lib/gtk4/runtime.js` | Runtime globals (console, fetch, crypto, etc.) |
| `lib/gtk4/server.js` | HTTP server with Soup.Server |
| `lib/gtk4/deps.js` | GLib/Gtk wrappers |
| `lib/gtk4/main.mjs` | Entry point |
